import { describe, it, expect } from 'vitest';
import { looksPortuguese, findLanguageViolations, partitionByLanguage } from './practice.language';

describe('looksPortuguese', () => {
  it('pega português com acento', () => {
    expect(looksPortuguese('Eles são estudantes.')).toBe(true);
    expect(looksPortuguese('Eu trabalho em uma escola como professor.')).toBe(true);
    expect(looksPortuguese('avó')).toBe(true);
  });

  it('pega português curto e sem acento', () => {
    expect(looksPortuguese('um professor')).toBe(true);
    expect(looksPortuguese('um carro')).toBe(true);
  });

  it('NÃO marca inglês legítimo que compartilha palavras com o português', () => {
    // Estes vieram do banco de produção e foram falso positivo na primeira
    // versão do detector — "a", "as", "no" e "me" existem nos dois idiomas.
    expect(looksPortuguese('I work as a teacher.')).toBe(false);
    expect(looksPortuguese('She works as a nurse.')).toBe(false);
    expect(looksPortuguese('a teacher')).toBe(false);
    expect(looksPortuguese('an apple')).toBe(false);
    expect(looksPortuguese('They are students.')).toBe(false);
    expect(looksPortuguese('No, I am not.')).toBe(false);
    expect(looksPortuguese('What do you do for a living?')).toBe(false);
    expect(looksPortuguese("I don't wanna eat anything right now.")).toBe(false);
  });

  it('trata vazio como não-português', () => {
    expect(looksPortuguese('')).toBe(false);
    expect(looksPortuguese('   ')).toBe(false);
  });
});

describe('findLanguageViolations', () => {
  it('aceita um item de vocabulário correto (inglês no conteúdo, PT na tradução)', () => {
    const violations = findLanguageViolations({
      type: 'VOCABULARY',
      lemma: 'early',
      metadata: {
        forms: { base: 'early' },
        // A tradução em português é esperada e NUNCA pode ser violação.
        meanings: [{ definition: 'before the usual time', translation: 'cedo' }],
        examples: [
          { text: 'I wake up early.', translation: 'Eu acordo cedo.' },
          { text: 'She arrived early.', translation: 'Ela chegou cedo.' },
        ],
      },
    });
    expect(violations).toEqual([]);
  });

  it('rejeita vocabulário cujo lemma veio traduzido (caso "cedo" da tela)', () => {
    // Uma palavra só, sem acento: nenhuma lista de palavras distingue "cedo"
    // de uma palavra inglesa desconhecida. Quem pega é a comparação com a
    // própria tradução do item.
    const violations = findLanguageViolations({
      type: 'VOCABULARY',
      lemma: 'cedo',
      metadata: {
        forms: { base: 'cedo' },
        meanings: [{ definition: 'antes do horário', translation: 'cedo' }],
        examples: [{ text: 'Eu acordo cedo.', translation: 'Eu acordo cedo.' }],
      },
    });
    const fields = violations.map((v) => v.field);
    expect(fields).toContain('lemma');
    expect(fields).toContain('metadata.forms.base');
    expect(fields).toContain('metadata.examples[0].text');
    expect(violations.find((v) => v.field === 'lemma')?.reason).toBe('swap');
  });

  it('aceita cognato: palavra igual nos dois idiomas não é item invertido', () => {
    // Caso real: "hospital" é a mesma palavra em inglês e português. A versão
    // anterior da guarda rejeitava o item por lemma === tradução, o que
    // descartaria conteúdo correto.
    const violations = findLanguageViolations({
      type: 'VOCABULARY',
      lemma: 'hospital',
      metadata: {
        forms: { base: 'hospital' },
        meanings: [{ definition: 'a place where sick people are treated', translation: 'hospital' }],
        examples: [
          { text: 'She works at a hospital.', translation: 'Ela trabalha em um hospital.' },
          { text: 'The hospital is near.', translation: 'O hospital fica perto.' },
        ],
      },
    });
    expect(violations).toEqual([]);
  });

  it('aceita exemplo em inglês que colide com verbo português ("come")', () => {
    const violations = findLanguageViolations({
      type: 'VOCABULARY',
      lemma: 'here',
      metadata: {
        forms: { base: 'here' },
        meanings: [{ definition: 'in this place', translation: 'aqui' }],
        examples: [
          { text: 'I am here.', translation: 'Eu estou aqui.' },
          { text: 'Come here, please.', translation: 'Venha aqui, por favor.' },
        ],
      },
    });
    expect(violations).toEqual([]);
  });

  it('aceita uma estrutura correta', () => {
    const violations = findLanguageViolations({
      type: 'STRUCTURE',
      lemma: 'to be affirmative',
      metadata: {
        examples: [
          {
            text: 'They are students.',
            translation: 'Eles são estudantes.',
            word_order: [
              { word: 'They', index: 0, role: 'subject' },
              { word: 'are', index: 1, role: 'verb' },
              { word: 'students', index: 2, role: 'complement' },
            ],
          },
        ],
      },
    });
    expect(violations).toEqual([]);
  });

  it('rejeita a estrutura que montou o word_order com a tradução', () => {
    // Exatamente o que o aluno viu na tela: montar "Eles são estudantes"
    // num exercício que pede a frase em inglês.
    const violations = findLanguageViolations({
      type: 'STRUCTURE',
      lemma: 'to be affirmative',
      metadata: {
        examples: [
          {
            text: 'They are students.',
            translation: 'Eles são estudantes.',
            word_order: [
              { word: 'Eles', index: 0, role: 'subject' },
              { word: 'são', index: 1, role: 'verb' },
              { word: 'estudantes', index: 2, role: 'complement' },
            ],
          },
        ],
      },
    });
    expect(violations).toHaveLength(1);
    expect(violations[0].field).toBe('metadata.examples[0].word_order');
    expect(violations[0].reason).toBe('swap');
  });

  it('aceita word_order com chunks multipalavra do próprio texto', () => {
    // Caso real do banco: a IA agrupa "for lunch"/"want to eat" num token só.
    // A cobertura tem que continuar batendo com o texto em inglês.
    const violations = findLanguageViolations({
      type: 'STRUCTURE',
      lemma: "question formation with 'What do you...?'",
      metadata: {
        examples: [
          {
            text: 'What do you usually have for lunch?',
            translation: 'O que você geralmente come no almoço?',
            word_order: [
              { word: 'What', index: 0, role: 'question-word' },
              { word: 'do', index: 1, role: 'auxiliary' },
              { word: 'you', index: 2, role: 'subject' },
              { word: 'usually', index: 3, role: 'adverb' },
              { word: 'have', index: 4, role: 'verb' },
              { word: 'for lunch', index: 5, role: 'complement' },
            ],
          },
        ],
      },
    });
    expect(violations).toEqual([]);
  });
});

describe('partitionByLanguage', () => {
  it('separa os válidos dos rejeitados preservando o motivo', () => {
    const bom = {
      type: 'VOCABULARY' as const,
      lemma: 'teacher',
      metadata: { forms: { base: 'teacher' }, examples: [{ text: 'She is a teacher.' }] },
    };
    const ruim = {
      type: 'VOCABULARY' as const,
      lemma: 'professora',
      metadata: { forms: { base: 'professora' }, examples: [{ text: 'Ela é professora.' }] },
    };

    const { valid, rejected } = partitionByLanguage([bom, ruim]);

    expect(valid).toEqual([bom]);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].item).toBe(ruim);
    expect(rejected[0].violations.length).toBeGreaterThan(0);
  });

  it('não descarta nada quando o lote inteiro está correto', () => {
    const items = [
      { type: 'VOCABULARY' as const, lemma: 'apple', metadata: { forms: { base: 'apple' }, examples: [{ text: 'I eat an apple.' }] } },
      { type: 'STRUCTURE' as const, lemma: 'a/an', metadata: { examples: [{ text: 'a car', word_order: [{ word: 'a' }, { word: 'car' }] }] } },
    ];
    const { valid, rejected } = partitionByLanguage(items);
    expect(valid).toHaveLength(2);
    expect(rejected).toHaveLength(0);
  });
});
