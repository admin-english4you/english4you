import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Trocar o plano de uma turma que já teve aulas: o admin escolhe a partir de
 * qual lição do novo plano as aulas restantes passam a valer.
 */

const findById = vi.fn();
const findRecordsByClassGroupId = vi.fn();
const deleteNonCompletedRecords = vi.fn();
const updatePlan = vi.fn();
const createRecords = vi.fn();
const getPlanById = vi.fn();
const getOrderedLessonsForPlan = vi.fn();

vi.mock('./class.repository', () => ({
  classRepository: {
    findById: (...a: unknown[]) => findById(...a),
    findRecordsByClassGroupId: (...a: unknown[]) => findRecordsByClassGroupId(...a),
    deleteNonCompletedRecords: (...a: unknown[]) => deleteNonCompletedRecords(...a),
    updatePlan: (...a: unknown[]) => updatePlan(...a),
    createRecords: (...a: unknown[]) => createRecords(...a),
  },
}));
vi.mock('@/modules/user/user.service', () => ({ userService: {} }));
vi.mock('@/modules/lesson/lesson.service', () => ({ lessonService: {} }));
vi.mock('@/modules/plan/plan.service', () => ({
  planService: {
    getPlanById: (...a: unknown[]) => getPlanById(...a),
    getOrderedLessonsForPlan: (...a: unknown[]) => getOrderedLessonsForPlan(...a),
  },
}));
vi.mock('@/modules/practice/practice.service', () => ({ practiceService: {} }));
vi.mock('@/modules/progress/progress.service', () => ({ progressService: {} }));
vi.mock('@/modules/notification/notification.service', () => ({ notificationService: {} }));
vi.mock('@/lib/resend', () => ({ sendClassRecordingEmail: vi.fn() }));
vi.mock('@/lib/firebase-admin', () => ({ adminAuth: null, adminDb: null }));
vi.mock('@/lib/db', () => ({ db: {} }));

const { classService } = await import('./class.service');

// Segunda-feira, 09:00 em BRT.
const AGORA = new Date('2026-09-07T12:00:00Z');

const PLANO_NOVO = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'].map((id) => ({ id, title: `Lição ${id}` }));

function turma(extras: Record<string, unknown> = {}) {
  return {
    id: 'turma-1',
    schedule: [
      { weekday: 'TUE' as const, time: '19:00' },
      { weekday: 'THU' as const, time: '20:00' },
    ],
    planId: 'plano-antigo',
    status: 'ACTIVE',
    ...extras,
  };
}

function aula(id: string, lessonId: string, extras: Record<string, unknown> = {}) {
  return { id, classGroupId: 'turma-1', lessonId, date: new Date('2026-08-20T22:00:00Z'), completed: false, callStartedAt: null, ...extras };
}

function lessonIdsCriadas(): string[] {
  return (createRecords.mock.calls[0][0] as { lessonId: string }[]).map((r) => r.lessonId);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(AGORA);

  findById.mockResolvedValue(turma());
  getPlanById.mockResolvedValue({ id: 'plano-novo', status: 'ACTIVE' });
  getOrderedLessonsForPlan.mockResolvedValue(PLANO_NOVO);
  updatePlan.mockResolvedValue(turma({ planId: 'plano-novo' }));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('assignPlan — turma sem aulas concluídas', () => {
  it('apaga as pendentes e gera a grade com todas as lições do plano', async () => {
    findRecordsByClassGroupId.mockResolvedValue([aula('p1', 'X1')]);

    await classService.assignPlan('ADMIN', 'turma-1', 'plano-novo');

    expect(deleteNonCompletedRecords).toHaveBeenCalledWith('turma-1');
    expect(updatePlan).toHaveBeenCalledWith('turma-1', 'plano-novo');
    expect(lessonIdsCriadas()).toEqual(['L1', 'L2', 'L3', 'L4', 'L5', 'L6']);
  });
});

describe('assignPlan — turma que já teve aulas', () => {
  beforeEach(() => {
    // A turma já deu 2 aulas (lições X1 e L2, esta também existe no plano novo) e tem 1 pendente.
    findRecordsByClassGroupId.mockResolvedValue([
      aula('c1', 'X1', { completed: true }),
      aula('c2', 'L2', { completed: true }),
      aula('p1', 'X3'),
    ]);
  });

  it('exige escolher a aula inicial, sem apagar nada', async () => {
    await expect(classService.assignPlan('ADMIN', 'turma-1', 'plano-novo')).rejects.toThrow(/escolha a partir de qual aula/);

    expect(deleteNonCompletedRecords).not.toHaveBeenCalled();
    expect(updatePlan).not.toHaveBeenCalled();
  });

  it('gera só as lições do plano a partir da escolhida, em datas novas a partir de hoje', async () => {
    await classService.assignPlan('ADMIN', 'turma-1', 'plano-novo', { startFromLessonId: 'L3' });

    expect(deleteNonCompletedRecords).toHaveBeenCalledWith('turma-1');
    expect(createRecords).toHaveBeenCalledTimes(1);

    const criadas = createRecords.mock.calls[0][0] as { lessonId: string; date: Date; completed: boolean }[];
    expect(criadas.map((r) => r.lessonId)).toEqual(['L3', 'L4', 'L5', 'L6']);
    expect(criadas.map((r) => r.date.toISOString())).toEqual([
      '2026-09-08T22:00:00.000Z', // ter 19h BRT
      '2026-09-10T23:00:00.000Z', // qui 20h BRT
      '2026-09-15T22:00:00.000Z',
      '2026-09-17T23:00:00.000Z',
    ]);
    expect(criadas.every((r) => r.completed === false)).toBe(true);
  });

  it('pula lições que a turma já teve (uma lição só aparece uma vez por turma)', async () => {
    await classService.assignPlan('ADMIN', 'turma-1', 'plano-novo', { startFromLessonId: 'L1' });

    expect(lessonIdsCriadas()).toEqual(['L1', 'L3', 'L4', 'L5', 'L6']);
  });

  it('recusa aula inicial que não é do plano, sem apagar nada', async () => {
    await expect(
      classService.assignPlan('ADMIN', 'turma-1', 'plano-novo', { startFromLessonId: 'OUTRA' })
    ).rejects.toThrow(/não pertence ao plano/);

    expect(deleteNonCompletedRecords).not.toHaveBeenCalled();
  });

  it('recusa quando a turma já teve todas as lições dali em diante', async () => {
    findRecordsByClassGroupId.mockResolvedValue(
      PLANO_NOVO.map((l) => aula(`c-${l.id}`, l.id, { completed: true }))
    );

    await expect(
      classService.assignPlan('ADMIN', 'turma-1', 'plano-novo', { startFromLessonId: 'L5' })
    ).rejects.toThrow(/Não há aulas restantes/);
    expect(deleteNonCompletedRecords).not.toHaveBeenCalled();
  });

  it('recusa enquanto há aula em andamento', async () => {
    findRecordsByClassGroupId.mockResolvedValue([
      aula('c1', 'X1', { completed: true }),
      aula('ao-vivo', 'X2', { callStartedAt: AGORA }),
    ]);

    await expect(
      classService.assignPlan('ADMIN', 'turma-1', 'plano-novo', { startFromLessonId: 'L1' })
    ).rejects.toThrow(/em andamento/);
    expect(deleteNonCompletedRecords).not.toHaveBeenCalled();
  });

  it('funciona também para turma sem plano (ex.: plano excluído antes)', async () => {
    findById.mockResolvedValue(turma({ planId: null }));

    await classService.assignPlan('ADMIN', 'turma-1', 'plano-novo', { startFromLessonId: 'L4' });

    expect(lessonIdsCriadas()).toEqual(['L4', 'L5', 'L6']);
  });
});

describe('assignPlan — validações gerais', () => {
  beforeEach(() => {
    findRecordsByClassGroupId.mockResolvedValue([]);
  });

  it('recusa quem não é ADMIN', async () => {
    await expect(classService.assignPlan('TEACHER', 'turma-1', 'plano-novo')).rejects.toThrow();
    expect(deleteNonCompletedRecords).not.toHaveBeenCalled();
  });

  it('recusa turma inativa', async () => {
    findById.mockResolvedValue(turma({ status: 'INACTIVE' }));

    await expect(classService.assignPlan('ADMIN', 'turma-1', 'plano-novo')).rejects.toThrow();
    expect(deleteNonCompletedRecords).not.toHaveBeenCalled();
  });

  it('recusa plano que não está ativo', async () => {
    getPlanById.mockResolvedValue({ id: 'plano-novo', status: 'DRAFT' });

    await expect(classService.assignPlan('ADMIN', 'turma-1', 'plano-novo')).rejects.toThrow(/plano de ensino ativo/);
    expect(deleteNonCompletedRecords).not.toHaveBeenCalled();
  });
});

describe('getPlanAssignmentPreview', () => {
  it('numera as lições do plano e marca as que a turma já teve', async () => {
    findRecordsByClassGroupId.mockResolvedValue([
      aula('c1', 'L2', { completed: true }),
      aula('p1', 'L3'), // pendente não conta como já dada
    ]);

    const { options } = await classService.getPlanAssignmentPreview('ADMIN', 'turma-1', 'plano-novo');

    expect(options.map((o) => [o.order, o.id, o.alreadyTaught])).toEqual([
      [1, 'L1', false],
      [2, 'L2', true],
      [3, 'L3', false],
      [4, 'L4', false],
      [5, 'L5', false],
      [6, 'L6', false],
    ]);
  });

  it('conta as aulas pendentes que serão apagadas', async () => {
    findRecordsByClassGroupId.mockResolvedValue([
      aula('c1', 'X1', { completed: true }),
      aula('p1', 'X2'),
      aula('p2', 'X3'),
    ]);

    const { pendingCount } = await classService.getPlanAssignmentPreview('ADMIN', 'turma-1', 'plano-novo');

    expect(pendingCount).toBe(2);
  });

  it('avisa quantas pendentes ficam sem lição quando o plano novo tem menos aulas', async () => {
    // 5 pendentes; plano de 3 lições (nenhuma já dada pela turma).
    getOrderedLessonsForPlan.mockResolvedValue(PLANO_NOVO.slice(0, 3));
    findRecordsByClassGroupId.mockResolvedValue([
      aula('c1', 'X1', { completed: true }),
      ...['p1', 'p2', 'p3', 'p4', 'p5'].map((id, i) => aula(id, `Y${i}`)),
    ]);

    const { pendingCount, options } = await classService.getPlanAssignmentPreview('ADMIN', 'turma-1', 'plano-novo');

    expect(pendingCount).toBe(5);
    expect(options.map((o) => [o.id, o.scheduledCount, o.uncoveredCount])).toEqual([
      ['L1', 3, 2], // 5 pendentes, só 3 aulas novas: 2 ficam sem lição
      ['L2', 2, 3],
      ['L3', 1, 4],
    ]);
  });

  it('não acusa falta quando o plano cobre todas as pendentes, e ignora lições já dadas na contagem', async () => {
    // Plano de 6 lições, a turma já deu L2; 4 pendentes.
    findRecordsByClassGroupId.mockResolvedValue([
      aula('c1', 'L2', { completed: true }),
      aula('p1', 'Y1'),
      aula('p2', 'Y2'),
      aula('p3', 'Y3'),
      aula('p4', 'Y4'),
    ]);

    const { options } = await classService.getPlanAssignmentPreview('ADMIN', 'turma-1', 'plano-novo');
    const porId = Object.fromEntries(options.map((o) => [o.id, o]));

    expect(porId.L1.scheduledCount).toBe(5); // L1, L3, L4, L5, L6 (L2 já dada)
    expect(porId.L1.uncoveredCount).toBe(0);
    expect(porId.L4.scheduledCount).toBe(3); // L4, L5, L6
    expect(porId.L4.uncoveredCount).toBe(1);
  });

  it('o número de aulas geradas bate com a prévia', async () => {
    findRecordsByClassGroupId.mockResolvedValue([
      aula('c1', 'L2', { completed: true }),
      aula('p1', 'Y1'),
    ]);

    const { options } = await classService.getPlanAssignmentPreview('ADMIN', 'turma-1', 'plano-novo');
    await classService.assignPlan('ADMIN', 'turma-1', 'plano-novo', { startFromLessonId: 'L3' });

    expect(lessonIdsCriadas().length).toBe(options.find((o) => o.id === 'L3')!.scheduledCount);
  });

  it('recusa quem não é ADMIN', async () => {
    await expect(classService.getPlanAssignmentPreview('STUDENT', 'turma-1', 'plano-novo')).rejects.toThrow();
  });
});
