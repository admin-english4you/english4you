import { addDaysToKey, compareDayKeys, maxDayKey } from '@/lib/date';
import { createRng, seededPick, seededShuffle, seededShuffleDistinct } from './practice.rng';
import type {
  CycleSlot,
  CycleSource,
  LearningItem,
  PracticeDayDescriptor,
  PracticeDayState,
  PracticeDayStatus,
  PracticeItem,
  PracticeMode,
  QuizQuestion,
  QuizSectionType,
  StructureMetadata,
  VocabMetadata,
} from './practice.types';

/**
 * MOTOR DE PRÁTICA — módulo PURO.
 *
 * Não importa `@/lib/db`, nem nada do Next ou do React. Toda entrada é valor
 * simples, toda saída é valor simples. É o que torna as regras de calendário e
 * de montagem testáveis sem banco (ver practice.engine.test.ts).
 *
 * O único chamador impuro é o `progressService`.
 */

export const PRACTICE_CYCLE_LENGTH = 6;
export const XP_PER_DAY = 20;
export const REDO_UNLOCK_COST = 40;
export const WEEKLY_XP_GOAL = 100;

/** Quantos itens no máximo uma sessão apresenta. */
export const MAX_ITEMS_PER_SESSION = 10;

/** Chave estável de um dia de prática — espelha a chave do banco. */
export function practiceDayKey(lessonId: string, dayIndex: number): string {
  return `${lessonId}:${dayIndex}`;
}

/**
 * Mapa dia -> modo.
 *
 * COM áudio: o dia 6 é compreensão auditiva e o quiz do dia 5 cobre as 4 seções.
 * SEM áudio: o listening cai e o quiz se divide em dois dias. O dia 6 absorve
 * `comprehension` junto de `context` — se ficasse de fora, toda pergunta de
 * compreensão seria órfã em lições sem áudio, apesar de `updateLessonStatus`
 * exigir pelo menos uma aprovada para ativar a lição.
 */
export function buildCycleModes(hasAudio: boolean): CycleSlot[] {
  const base: CycleSlot[] = [
    { dayIndex: 1, renderMode: 'flashcard_visual', quizSections: null },
    { dayIndex: 2, renderMode: 'gap_fill_listening', quizSections: null },
    { dayIndex: 3, renderMode: 'sentence_unscramble', quizSections: null },
    { dayIndex: 4, renderMode: 'flashcard_recall', quizSections: null },
  ];

  if (hasAudio) {
    return [
      ...base,
      {
        dayIndex: 5,
        renderMode: 'quiz_comprehensive',
        quizSections: ['vocabulary', 'grammar', 'context', 'comprehension'],
      },
      { dayIndex: 6, renderMode: 'listening_choice', quizSections: null },
    ];
  }

  return [
    ...base,
    { dayIndex: 5, renderMode: 'quiz_comprehensive', quizSections: ['vocabulary', 'grammar'] },
    { dayIndex: 6, renderMode: 'quiz_comprehensive', quizSections: ['context', 'comprehension'] },
  ];
}

/**
 * Um ciclo de 6 dias para UMA aula, começando no dia SEGUINTE a ela.
 *
 * O início é `max(dia da aula, dia de ativação da lição)`: se a aula aconteceu
 * enquanto a lição ainda estava DISABLED e o admin só a publicou depois, o
 * ciclo passa a contar da publicação — caso contrário nasceria todo vencido.
 */
export function buildCycleForClassRecord(source: CycleSource): PracticeDayDescriptor[] {
  const startKey = maxDayKey(source.classDateKey, source.activatedDayKey);

  return buildCycleModes(source.hasAudio).map((slot) => ({
    lessonId: source.lessonId,
    lessonTitle: source.lessonTitle,
    lessonLevel: source.lessonLevel,
    classRecordId: source.classRecordId,
    classDateKey: source.classDateKey,
    dayIndex: slot.dayIndex,
    // dayIndex 1 = dia seguinte ao início.
    dateKey: addDaysToKey(startKey, slot.dayIndex),
    renderMode: slot.renderMode,
    quizSections: slot.quizSections,
    xpReward: XP_PER_DAY,
  }));
}

/**
 * Calendário completo: um ciclo por aula, unidos e ordenados por data.
 *
 * A SOBREPOSIÇÃO É INTENCIONAL e não é deduplicada. Numa turma com duas aulas
 * por semana, os ciclos das duas lições coexistem e o aluno simplesmente tem
 * mais de uma atividade disponível nos dias em comum — uma por lição.
 * A chave (lessonId, dayIndex) nunca colide entre ciclos, porque cada lição
 * aparece no máximo uma vez por turma (unique index em class_records).
 */
export function buildPracticeCalendar(sources: CycleSource[]): PracticeDayDescriptor[] {
  return sources
    .flatMap(buildCycleForClassRecord)
    .sort(
      (a, b) =>
        compareDayKeys(a.dateKey, b.dateKey) ||
        a.lessonTitle.localeCompare(b.lessonTitle) ||
        a.dayIndex - b.dayIndex
    );
}

export interface ResolveStatusContext {
  todayKey: string;
  /** practiceDayKey -> XP ganho na conclusão. */
  completedKeys: Map<string, number>;
  /** practiceDayKey dos dias comprados com XP. */
  unlockedKeys: Set<string>;
  /** practiceDayKey dos dias sem conteúdo aprovado para o modo. */
  emptyKeys: Set<string>;
}

/**
 * Decide o status de cada dia. Função pura de decisão — a tabela abaixo é
 * avaliada de cima para baixo e a primeira condição verdadeira vence.
 *
 * Regra de XP: um dia comprado NUNCA dá XP, tenha sido perdido ou esteja
 * sendo refeito. Um caminho de código só, sem brecha de farming.
 */
export function resolvePracticeDayStates(
  days: PracticeDayDescriptor[],
  ctx: ResolveStatusContext
): PracticeDayState[] {
  return days.map((day) => {
    const key = practiceDayKey(day.lessonId, day.dayIndex);
    const completedXp = ctx.completedKeys.get(key);
    const isCompleted = completedXp !== undefined;
    const isUnlocked = ctx.unlockedKeys.has(key);
    const isFuture = compareDayKeys(day.dateKey, ctx.todayKey) > 0;

    let status: PracticeDayStatus;
    if (ctx.emptyKeys.has(key)) status = 'EMPTY';
    else if (isFuture) status = 'LOCKED_FUTURE';
    else if (isCompleted && isUnlocked) status = 'REPLAYABLE';
    else if (isCompleted) status = 'COMPLETED';
    else if (day.dateKey === ctx.todayKey) status = 'AVAILABLE';
    else if (isUnlocked) status = 'REPLAYABLE';
    else status = 'EXPIRED';

    return {
      ...day,
      status,
      xpEarned: completedXp ?? null,
      // Só faz sentido oferecer compra para o que passou e não está comprado.
      unlockCost: status === 'EXPIRED' || status === 'COMPLETED' ? REDO_UNLOCK_COST : null,
      // Replay comprado não vale XP.
      xpReward: status === 'AVAILABLE' ? XP_PER_DAY : 0,
    };
  });
}

/** Um dia só abre o player nestes estados. */
export function isPlayable(status: PracticeDayStatus): boolean {
  return status === 'AVAILABLE' || status === 'REPLAYABLE';
}

// ---------------------------------------------------------------------------
// Montagem dos PracticeItem
// ---------------------------------------------------------------------------

function isVocab(item: LearningItem): boolean {
  return item.type === 'VOCABULARY';
}

function vocabMeta(item: LearningItem): VocabMetadata {
  return item.metadata as VocabMetadata;
}

function structureMeta(item: LearningItem): StructureMetadata {
  return item.metadata as StructureMetadata;
}

/** Melhor tradução disponível para um vocabulário. */
function vocabTranslation(meta: VocabMetadata): string | null {
  return meta.translation?.trim() || meta.meanings?.[0]?.translation?.trim() || null;
}

/**
 * Palavras que NÃO são bons alvos de lacuna: artigos, preposições e afins.
 * Apagar "the" não ensina nada; apagar o verbo, sim.
 */
const FUNCTION_WORD_ROLES = new Set(['article', 'determiner', 'preposition', 'conjunction', 'auxiliary']);
const PREFERRED_GAP_ROLES = ['verb', 'object', 'subject'];

function stripPunctuation(word: string): string {
  return word.replace(/^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu, '');
}

interface AssembleInput {
  lessonId: string;
  dayIndex: number;
  renderMode: PracticeMode;
  quizSections: QuizSectionType[] | null;
  /** Já filtrados como APPROVED pelo repositório. */
  items: LearningItem[];
  /** Já filtradas por modo/seção e APPROVED. */
  questions: QuizQuestion[];
  maxItems?: number;
}

/**
 * Transforma LearningItems/QuizQuestions crus nos PracticeItem que o player
 * renderiza.
 *
 * Restrição do schema: `PracticeItemSchema.id` é um uuid, então usamos o id da
 * linha de origem verbatim — no máximo UM PracticeItem por linha por sessão.
 * Nunca expandir uma mesma estrutura em dois exercícios do mesmo dia.
 *
 * Devolve [] quando não há conteúdo para o modo; quem chama marca o dia como
 * EMPTY em vez de abrir um player quebrado.
 */
export function assemblePracticeItems(input: AssembleInput): PracticeItem[] {
  const { lessonId, dayIndex, renderMode, maxItems = MAX_ITEMS_PER_SESSION } = input;
  const orderRng = createRng(`${lessonId}:${dayIndex}`);

  const itemRng = (learningItemId: string) => createRng(`${lessonId}:${dayIndex}:${learningItemId}`);

  switch (renderMode) {
    case 'flashcard_visual':
    case 'flashcard_recall': {
      const pool = input.items.filter(isVocab).filter((item) => vocabTranslation(vocabMeta(item)));

      // No modo visual, os itens com imagem vêm primeiro (mas os sem imagem
      // continuam válidos — nada popula image_url hoje, e um card sem imagem
      // é melhor do que um dia vazio).
      const ordered =
        renderMode === 'flashcard_visual'
          ? [...pool].sort(
              (a, b) => Number(Boolean(vocabMeta(b).image_url)) - Number(Boolean(vocabMeta(a).image_url))
            )
          : seededShuffle(pool, orderRng);

      return ordered.slice(0, maxItems).map((item) => {
        const meta = vocabMeta(item);
        const translation = vocabTranslation(meta) ?? item.lemma;
        const isVisualMode = renderMode === 'flashcard_visual';

        return {
          id: item.id,
          lessonId,
          type: 'item' as const,
          renderMode,
          mainText: item.lemma,
          data: {
            flashcard: {
              // Visual: mostra a palavra e pede a lembrança do significado.
              // Recall: caminho inverso, da tradução para a palavra.
              front: isVisualMode ? item.lemma : translation,
              back: isVisualMode ? translation : item.lemma,
              imageUrl: isVisualMode ? meta.image_url ?? null : null,
              useTTS: true,
            },
          },
        };
      });
    }

    case 'gap_fill_listening': {
      const pool = input.items.filter((item) => !isVocab(item));

      return seededShuffle(pool, orderRng)
        .slice(0, maxItems)
        .map((item): PracticeItem | null => {
          const meta = structureMeta(item);
          const rng = itemRng(item.id);
          const examples = meta.examples ?? [];
          if (examples.length === 0) return null;

          const example = seededPick(examples, rng);
          const words = example.word_order ?? [];

          // Preferimos apagar uma palavra de conteúdo; só caímos para
          // qualquer palavra se a estrutura não tiver papéis úteis.
          const contentWords = words.filter(
            (w) => PREFERRED_GAP_ROLES.includes(w.role) && stripPunctuation(w.word).length > 1
          );
          const fallbackWords = words.filter(
            (w) => !FUNCTION_WORD_ROLES.has(w.role) && stripPunctuation(w.word).length > 1
          );
          const candidates =
            contentWords.length > 0 ? contentWords : fallbackWords.length > 0 ? fallbackWords : words;
          if (candidates.length === 0) return null;

          const target = seededPick(candidates, rng);
          const answer = stripPunctuation(target.word);
          if (!answer) return null;

          // Substitui apenas a primeira ocorrência exata da palavra, como
          // palavra inteira, para não furar "cat" dentro de "category".
          const gapPattern = new RegExp(`\\b${answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
          if (!gapPattern.test(example.text)) return null;

          return {
            id: item.id,
            lessonId,
            type: 'structure' as const,
            renderMode,
            mainText: example.text,
            data: {
              gapFill: {
                sentenceWithGap: example.text.replace(gapPattern, '____'),
                correctAnswer: answer,
                fullSentenceForTTS: example.text,
              },
            },
          };
        })
        .filter((item): item is PracticeItem => item !== null);
    }

    case 'sentence_unscramble': {
      const pool = input.items.filter((item) => !isVocab(item));

      return seededShuffle(pool, orderRng)
        .slice(0, maxItems)
        .map((item): PracticeItem | null => {
          const meta = structureMeta(item);
          const rng = itemRng(item.id);
          const examples = (meta.examples ?? []).filter((e) => (e.word_order?.length ?? 0) >= 2);
          if (examples.length === 0) return null;

          const example = seededPick(examples, rng);
          const correctOrder = [...example.word_order]
            .sort((a, b) => a.index - b.index)
            .map((w) => w.word);

          return {
            id: item.id,
            lessonId,
            type: 'structure' as const,
            renderMode,
            mainText: example.text,
            data: {
              unscramble: {
                scrambledWords: seededShuffleDistinct(correctOrder, rng),
                correctOrder,
              },
            },
          };
        })
        .filter((item): item is PracticeItem => item !== null);
    }

    case 'quiz_comprehensive':
    case 'listening_choice': {
      const balanced = balanceQuestionsBySection(input.questions, input.quizSections, maxItems, orderRng);

      return balanced.map((question) => ({
        id: question.id,
        lessonId,
        type: 'item' as const,
        renderMode,
        mainText: question.question,
        data: {
          quiz: {
            question: question.question,
            options: question.options,
            correctIndex: question.correctIndex,
            explanation: question.explanation ?? undefined,
          },
        },
      }));
    }

    default:
      // `review_standard` não faz parte do ciclo de 6 dias.
      return [];
  }
}

/**
 * Distribui as vagas da sessão de forma equilibrada entre as seções pedidas,
 * em vez de deixar uma seção prolífica dominar o quiz inteiro.
 */
function balanceQuestionsBySection(
  questions: QuizQuestion[],
  sections: QuizSectionType[] | null,
  maxItems: number,
  rng: () => number
): QuizQuestion[] {
  if (!sections || sections.length === 0) {
    return seededShuffle(questions, rng).slice(0, maxItems);
  }

  const bySection = new Map<QuizSectionType, QuizQuestion[]>();
  for (const section of sections) {
    bySection.set(
      section,
      seededShuffle(
        questions.filter((q) => q.section === section),
        rng
      )
    );
  }

  const picked: QuizQuestion[] = [];
  // Round-robin entre as seções até preencher a sessão ou esgotar as perguntas.
  for (let round = 0; picked.length < maxItems; round += 1) {
    let addedInRound = false;
    for (const section of sections) {
      const bucket = bySection.get(section);
      const question = bucket?.[round];
      if (!question) continue;
      picked.push(question);
      addedInRound = true;
      if (picked.length >= maxItems) break;
    }
    if (!addedInRound) break;
  }

  return picked;
}
