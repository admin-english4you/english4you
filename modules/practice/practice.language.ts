/**
 * Guarda de idioma do conteúdo gerado pela IA.
 *
 * Os itens de prática têm campos com idioma FIXO e não intercambiável: `lemma`,
 * `forms.*`, `examples[].text` e `word_order[].word` são o inglês que o aluno
 * precisa aprender; `translation` e `meanings[].translation` são o apoio em
 * português. Um item que troca os dois de lugar não é "um item pior": ele
 * ensina a coisa errada — o aluno monta "Eles são estudantes" num exercício
 * cujo enunciado é "monte a frase em inglês".
 *
 * O prompt pede isso explicitamente, mas prompt não é garantia. Esta guarda é
 * a rede: roda sobre a resposta da IA ANTES de persistir, e derruba o item que
 * violar a regra em vez de deixá-lo chegar ao aluno.
 *
 * O detector é deliberadamente CONSERVADOR — prefere deixar passar um caso
 * duvidoso a descartar conteúdo bom. Palavras iguais nos dois idiomas ("a",
 * "as", "no", "the", "me") ficam fora da lista justamente porque geram falso
 * positivo em frases legítimas ("I work as a teacher").
 */

/** Palavras que existem em português e NÃO em inglês. Sem ambíguas. */
const PORTUGUESE_ONLY_WORDS = new Set([
  // artigos e contrações
  'um', 'uma', 'uns', 'umas', 'dos', 'das', 'ao', 'aos', 'nas', 'nos',
  'pelo', 'pela', 'pelos', 'pelas', 'num', 'numa', 'dum', 'duma',
  // pronomes
  'eu', 'ele', 'ela', 'eles', 'elas', 'você', 'vocês', 'nós', 'lhe', 'lhes',
  'meu', 'minha', 'meus', 'minhas', 'seu', 'sua', 'seus', 'suas',
  'nosso', 'nossa', 'dele', 'dela', 'deles', 'delas',
  // verbos comuns
  'sou', 'somos', 'são', 'está', 'estão', 'estou', 'estamos', 'ser', 'estar',
  'tem', 'têm', 'tenho', 'temos', 'ter', 'foi', 'foram', 'vai', 'vão', 'vou',
  'faz', 'fazem', 'faço', 'fazer', 'quero', 'quer', 'gosto', 'gosta',
  'moro', 'mora', 'trabalho', 'trabalha', 'bebo', 'bebe',
  // "come" e "como" ficam FORA: são palavras inglesas legítimas ("Come here,
  // please.", "as ... as"). Custaram um falso positivo em produção.
  // advérbios e conectores
  'não', 'também', 'já', 'ainda', 'sempre', 'nunca', 'então', 'assim',
  'muito', 'muita', 'muitos', 'muitas', 'mais', 'menos', 'porque', 'porém',
  'quando', 'onde', 'qual', 'quais', 'para', 'com', 'sem', 'entre', 'sobre',
  'isso', 'isto', 'aquilo', 'esse', 'essa', 'este', 'esta', 'aquele', 'aquela',
  // substantivos frequentes nas aulas
  'professor', 'professora', 'estudante', 'estudantes', 'aluno', 'aluna',
  'carro', 'casa', 'escola', 'trabalho', 'manhã', 'tarde', 'noite',
]);

/** Acentos/cedilha praticamente inexistentes em palavras inglesas. */
const PORTUGUESE_DIACRITICS = /[ãõçáéíóúâêôàÃÕÇÁÉÍÓÚÂÊÔÀ]/;

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * O texto parece português?
 *
 * Um acento já basta (nenhuma palavra inglesa comum de nível A1/B1 os usa).
 * Sem acento, exige DUAS palavras exclusivas do português.
 *
 * O limiar é dois, e não um, de propósito: com um só, "Come here, please."
 * era rejeitado (o "come" do inglês colide com o "come" do português). Uma
 * palavra portuguesa isolada e sem acento — "cedo", "casa" — é indistinguível
 * de uma palavra inglesa desconhecida por qualquer lista; quem cobre esse caso
 * é a checagem estrutural de troca em `findLanguageViolations`, não esta.
 */
export function looksPortuguese(value: string): boolean {
  if (!value?.trim()) return false;
  if (PORTUGUESE_DIACRITICS.test(value)) return true;

  const tokens = tokenize(value);
  if (tokens.length === 0) return false;

  const hits = tokens.filter((token) => PORTUGUESE_ONLY_WORDS.has(token)).length;
  return hits >= 2;
}

export interface LanguageViolation {
  /** Caminho do campo dentro do item, para o log do admin. */
  field: string;
  value: string;
  /** `swap` = campo preenchido com a tradução; `heuristic` = parece PT. */
  reason: 'swap' | 'heuristic';
}

interface VocabLike {
  translation?: string;
  forms?: { base?: string };
  meanings?: Array<{ definition?: string; translation?: string }>;
  examples?: Array<{ text?: string; translation?: string }>;
}

interface StructureLike {
  explanation?: string;
  examples?: Array<{
    text?: string;
    translation?: string;
    word_order?: Array<{ word?: string }>;
  }>;
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Quanto das palavras aparece dentro da frase (0 a 1).
 * É assim que se decide se um `word_order` foi montado a partir do `text`
 * (inglês) ou da `translation` (português).
 */
function coverage(words: string[], sentence: string): number {
  const usable = words.map(normalize).filter(Boolean);
  if (usable.length === 0) return 0;
  const haystack = ` ${normalize(sentence)} `;
  const hits = usable.filter((word) => haystack.includes(` ${word} `)).length;
  return hits / usable.length;
}

/**
 * Lista os campos que deveriam estar em inglês e vieram em português.
 * Só campos de CONTEÚDO — `translation`/`meanings[].translation` são o apoio
 * em português e nunca entram aqui.
 *
 * Duas famílias de checagem, por ordem de confiança:
 *
 * 1. TROCA (`swap`) — comparação estrutural entre campos do próprio item:
 *    o `lemma` é igual à tradução? o `word_order` casa melhor com a tradução
 *    do que com o texto? Não depende de reconhecer o idioma, então pega até
 *    "cedo"/"casa"/"livro", que nenhuma lista de palavras distingue de uma
 *    palavra inglesa desconhecida. É a checagem que vale.
 * 2. HEURÍSTICA (`heuristic`) — `looksPortuguese` nos campos livres, para o
 *    caso em que não há um par a comparar. Conservadora por construção.
 */
export function findLanguageViolations(item: {
  type: 'VOCABULARY' | 'STRUCTURE';
  lemma: string;
  metadata: unknown;
}): LanguageViolation[] {
  const violations: LanguageViolation[] = [];

  const flagHeuristic = (field: string, value: unknown) => {
    if (typeof value === 'string' && looksPortuguese(value)) {
      violations.push({ field, value, reason: 'heuristic' });
    }
  };
  const flagSwap = (field: string, value: string) => {
    violations.push({ field, value, reason: 'swap' });
  };

  if (item.type === 'VOCABULARY') {
    const meta = item.metadata as VocabLike;
    const examples = meta?.examples ?? [];

    // Exemplo cujo inglês é idêntico à própria tradução: não há inglês ali.
    const swappedExamples = examples.filter(
      (example) =>
        example?.text &&
        example?.translation &&
        normalize(example.text) === normalize(example.translation)
    );
    swappedExamples.forEach((example) => {
      const i = examples.indexOf(example);
      flagSwap(`metadata.examples[${i}].text`, example.text ?? '');
    });
    examples.forEach((example, i) => {
      if (!swappedExamples.includes(example)) {
        flagHeuristic(`metadata.examples[${i}].text`, example?.text);
      }
    });

    // `lemma` igual à tradução é AMBÍGUO: pode ser um item invertido ("cedo"
    // no lugar de "early") ou apenas um cognato legítimo — "hospital",
    // "normal", "chocolate" são a mesma palavra nos dois idiomas, e rejeitar
    // isso custaria conteúdo bom (aconteceu com "hospital" em produção).
    // O desempate é o resto do item: um item de verdade invertido está
    // invertido nos exemplos também. Cognato tem exemplos bilíngues normais.
    const translations = [meta?.translation, ...(meta?.meanings ?? []).map((m) => m?.translation)]
      .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
      .map(normalize);
    const itemLooksInverted = swappedExamples.length > 0;

    const lemma = normalize(item.lemma);
    if (lemma && translations.includes(lemma) && itemLooksInverted) {
      flagSwap('lemma', item.lemma);
    } else {
      flagHeuristic('lemma', item.lemma);
    }

    const base = meta?.forms?.base;
    if (base && translations.includes(normalize(base)) && itemLooksInverted) {
      flagSwap('metadata.forms.base', base);
    } else {
      flagHeuristic('metadata.forms.base', base);
    }
  } else {
    const meta = item.metadata as StructureLike;
    flagHeuristic('lemma', item.lemma);

    meta?.examples?.forEach((example, i) => {
      const text = example?.text ?? '';
      const translation = example?.translation ?? '';
      const textField = `metadata.examples[${i}].text`;

      if (text && translation && normalize(text) === normalize(translation)) {
        flagSwap(textField, text);
      } else {
        flagHeuristic(textField, text);
      }

      // O `word_order` é o que vira o banco de palavras do "monte a frase".
      // Ele tem que sair do `text` (inglês). Se casa melhor com a tradução,
      // o exercício foi montado em português — o bug que o aluno viu.
      const words = (example?.word_order ?? []).map((w) => w?.word ?? '').filter(Boolean);
      if (words.length > 0 && text) {
        const inText = coverage(words, text);
        const inTranslation = coverage(words, translation);
        const field = `metadata.examples[${i}].word_order`;
        if (translation && inTranslation > inText) {
          flagSwap(field, words.join(' '));
        } else if (inText < 0.5) {
          // Nem o texto nem a tradução explicam as palavras: item quebrado.
          flagHeuristic(field, words.join(' '));
        }
      }
    });
  }

  return violations;
}

/**
 * Separa os itens aprovados dos rejeitados por idioma.
 *
 * Devolve os dois lados (em vez de só filtrar) porque quem chama precisa
 * logar o que caiu — um item descartado em silêncio vira "a IA gerou menos
 * itens hoje", que é exatamente o tipo de falha que ninguém investiga.
 */
export function partitionByLanguage<T extends { type: 'VOCABULARY' | 'STRUCTURE'; lemma: string; metadata: unknown }>(
  items: T[]
): { valid: T[]; rejected: Array<{ item: T; violations: LanguageViolation[] }> } {
  const valid: T[] = [];
  const rejected: Array<{ item: T; violations: LanguageViolation[] }> = [];

  for (const item of items) {
    const violations = findLanguageViolations(item);
    if (violations.length > 0) {
      rejected.push({ item, violations });
    } else {
      valid.push(item);
    }
  }

  return { valid, rejected };
}
