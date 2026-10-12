import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Prática sem bloqueios: o aluno pode adiantar dias futuros, recuperar os
 * atrasados e refazer os concluídos. O XP só indica quanto ele pratica — a
 * primeira conclusão de cada dia vale 20, refazer vale 0, e não existe compra.
 */

const getStudentTaughtRecords = vi.fn();
const getLessonPracticeCapabilities = vi.fn();
const findCompletionsByUser = vi.fn();
const getXpTotals = vi.fn();
const upsertCompletion = vi.fn();

vi.mock('@/modules/class/class.service', () => ({
  classService: { getStudentTaughtRecords: (...a: unknown[]) => getStudentTaughtRecords(...a) },
}));
vi.mock('@/modules/practice/practice.service', () => ({
  practiceService: {
    getLessonPracticeCapabilities: (...a: unknown[]) => getLessonPracticeCapabilities(...a),
  },
}));
vi.mock('./progress.repository', () => ({
  progressRepository: {
    findCompletionsByUser: (...a: unknown[]) => findCompletionsByUser(...a),
    getXpTotals: (...a: unknown[]) => getXpTotals(...a),
    upsertCompletion: (...a: unknown[]) => upsertCompletion(...a),
  },
}));

const { progressService } = await import('./progress.service');
const { BlockedPracticeError } = await import('@/lib/errors');

// 08/08/2026, meio-dia em BRT. Aula em 04/08 -> ciclo de 05/08 (dia 1) a 10/08 (dia 6).
// Dias 1-3 já passaram, dia 4 é hoje, dias 5-6 são futuros.
const AGORA = new Date('2026-08-08T15:00:00Z');
const AULA = new Date('2026-08-04T22:00:00Z');

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(AGORA);

  getStudentTaughtRecords.mockResolvedValue([
    {
      record: { id: 'rec-1', date: AULA, completedAt: AULA },
      lesson: { id: 'lesson-a', title: 'Lição A', level: 'A1', audioUrl: null, activatedAt: null },
    },
  ]);
  getLessonPracticeCapabilities.mockResolvedValue({
    hasListening: false,
    vocabCount: 5,
    structureCount: 5,
    sectionCoverage: { vocabulary: 5, grammar: 5, context: 5, comprehension: 5, listening: 0 },
  });
  findCompletionsByUser.mockResolvedValue([]);
  getXpTotals.mockResolvedValue({ earnedTotal: 100, earnedThisWeek: 20 });
  upsertCompletion.mockResolvedValue({});
});

afterEach(() => {
  vi.useRealTimers();
});

describe('completePracticeDay', () => {
  it.each([
    ['atrasado', 1],
    ['de hoje', 4],
    ['futuro (adiantado)', 6],
  ])('dia %s, na primeira vez, vale 20 XP', async (_label, dayIndex) => {
    const result = await progressService.completePracticeDay('aluno-1', 'lesson-a', dayIndex);

    expect(result.xpEarned).toBe(20);
    expect(result.wasReplay).toBe(false);
    expect(upsertCompletion).toHaveBeenCalledWith(expect.objectContaining({ dayIndex, xpEarned: 20 }));
  });

  it('refazer um dia já concluído não paga de novo', async () => {
    findCompletionsByUser.mockResolvedValue([{ lessonId: 'lesson-a', dayIndex: 2, xpEarned: 20 }]);

    const result = await progressService.completePracticeDay('aluno-1', 'lesson-a', 2);

    expect(result.xpEarned).toBe(0);
    expect(result.wasReplay).toBe(true);
  });

  it('devolve o XP total como indicativo, não um saldo', async () => {
    const result = await progressService.completePracticeDay('aluno-1', 'lesson-a', 4);
    expect(result.newTotal).toBe(100);
  });

  it('só um dia sem conteúdo é barrado', async () => {
    getLessonPracticeCapabilities.mockResolvedValue({
      hasListening: false,
      vocabCount: 0,
      structureCount: 5,
      sectionCoverage: { vocabulary: 5, grammar: 5, context: 5, comprehension: 5, listening: 0 },
    });

    // Dia 1 é flashcard (vocabulário): sem itens de vocabulário, fica EMPTY.
    await expect(progressService.completePracticeDay('aluno-1', 'lesson-a', 1)).rejects.toBeInstanceOf(
      BlockedPracticeError
    );
  });
});

describe('getPracticeSession', () => {
  it.each([1, 4, 6])('o dia %i abre sem ser barrado por data', async (dayIndex) => {
    const result = await progressService
      .getPracticeSession('aluno-1', 'lesson-a', dayIndex)
      .catch((err: Error) => err);

    // A montagem dos itens depende do conteúdo; aqui só importa que NÃO foi barrado por status.
    expect(result).not.toBeInstanceOf(BlockedPracticeError);
  });

  it('um dia concluído também abre (para refazer)', async () => {
    findCompletionsByUser.mockResolvedValue([{ lessonId: 'lesson-a', dayIndex: 3, xpEarned: 20 }]);

    const result = await progressService.getPracticeSession('aluno-1', 'lesson-a', 3).catch((err: Error) => err);

    expect(result).not.toBeInstanceOf(BlockedPracticeError);
  });
});

describe('getPracticePath', () => {
  it('lista as atrasadas e mostra os futuros como liberados', async () => {
    findCompletionsByUser.mockResolvedValue([{ lessonId: 'lesson-a', dayIndex: 2, xpEarned: 20 }]);

    const path = await progressService.getPracticePath('aluno-1');
    const days = path.sections[0].days;

    expect(path.late.map((d) => d.dayIndex)).toEqual([1, 3]);
    expect(path.today.map((d) => d.dayIndex)).toEqual([4]);
    expect(days.filter((d) => d.status === 'UPCOMING').map((d) => d.dayIndex)).toEqual([5, 6]);
    expect(path.xp).toEqual({ earnedTotal: 100, earnedThisWeek: 20 });
  });
});
