import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateSlotDates } from './class.utils';

/**
 * Edição de datas das aulas: aula avulsa (updateRecordDate) e reagendamento
 * pela grade da turma (updateBasicInfo). Fuso da aplicação: BRT (UTC-3).
 */

const findById = vi.fn();
const findRecordById = vi.fn();
const findRecordsByClassGroupId = vi.fn();
const updateBasic = vi.fn();
const updateRecordDate = vi.fn();
const updateRecordsDates = vi.fn();
const getOrderedLessonsForPlan = vi.fn();

vi.mock('./class.repository', () => ({
  classRepository: {
    findById: (...a: unknown[]) => findById(...a),
    findRecordById: (...a: unknown[]) => findRecordById(...a),
    findRecordsByClassGroupId: (...a: unknown[]) => findRecordsByClassGroupId(...a),
    updateBasic: (...a: unknown[]) => updateBasic(...a),
    updateRecordDate: (...a: unknown[]) => updateRecordDate(...a),
    updateRecordsDates: (...a: unknown[]) => updateRecordsDates(...a),
  },
}));
vi.mock('@/modules/user/user.service', () => ({ userService: {} }));
vi.mock('@/modules/lesson/lesson.service', () => ({ lessonService: {} }));
vi.mock('@/modules/plan/plan.service', () => ({
  planService: { getOrderedLessonsForPlan: (...a: unknown[]) => getOrderedLessonsForPlan(...a) },
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

const TER_19 = { weekday: 'TUE' as const, time: '19:00' };
const QUI_20 = { weekday: 'THU' as const, time: '20:00' };

function turma(extras: Record<string, unknown> = {}) {
  return {
    id: 'turma-1',
    name: 'Turma A',
    level: 'A1',
    schedule: [{ weekday: 'MON' as const, time: '09:00' }],
    planId: 'plano-1',
    status: 'ACTIVE',
    ...extras,
  };
}

function aula(id: string, lessonId: string, date: string, extras: Record<string, unknown> = {}) {
  return {
    id,
    classGroupId: 'turma-1',
    lessonId,
    date: new Date(date),
    completed: false,
    callStartedAt: null,
    ...extras,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(AGORA);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('generateSlotDates', () => {
  it('distribui as aulas pelos dias e horários, em BRT', () => {
    const dates = generateSlotDates([TER_19, QUI_20], 3, '2026-09-07');

    expect(dates.map((d) => d.toISOString())).toEqual([
      '2026-09-08T22:00:00.000Z', // ter 19h BRT
      '2026-09-10T23:00:00.000Z', // qui 20h BRT
      '2026-09-15T22:00:00.000Z', // ter seguinte
    ]);
  });

  it('inclui o dia inicial quando ele já é um dia de aula', () => {
    const dates = generateSlotDates([TER_19], 1, '2026-09-08');

    expect(dates[0].toISOString()).toBe('2026-09-08T22:00:00.000Z');
  });

  it('devolve lista vazia para zero aulas', () => {
    expect(generateSlotDates([TER_19], 0, '2026-09-07')).toEqual([]);
  });
});

describe('updateRecordDate', () => {
  beforeEach(() => {
    findRecordById.mockResolvedValue(aula('rec-1', 'L1', '2026-09-08T22:00:00Z'));
    findById.mockResolvedValue(turma());
    updateRecordDate.mockImplementation(async (id: string, date: Date) => aula(id, 'L1', date.toISOString()));
  });

  it('converte a hora de parede em BRT para o instante UTC', async () => {
    await classService.updateRecordDate('ADMIN', 'rec-1', { date: '2026-09-20', time: '19:00' });

    expect(updateRecordDate).toHaveBeenCalledWith('rec-1', new Date('2026-09-20T22:00:00Z'));
  });

  it('aceita qualquer data, mesmo fora da ordem das demais aulas', async () => {
    await expect(
      classService.updateRecordDate('ADMIN', 'rec-1', { date: '2026-01-02', time: '08:00' })
    ).resolves.toBeDefined();
  });

  it('recusa quem não é ADMIN', async () => {
    await expect(
      classService.updateRecordDate('TEACHER', 'rec-1', { date: '2026-09-20', time: '19:00' })
    ).rejects.toThrow();
    expect(updateRecordDate).not.toHaveBeenCalled();
  });

  it('recusa aula concluída', async () => {
    findRecordById.mockResolvedValue(aula('rec-1', 'L1', '2026-09-01T22:00:00Z', { completed: true }));

    await expect(
      classService.updateRecordDate('ADMIN', 'rec-1', { date: '2026-09-20', time: '19:00' })
    ).rejects.toThrow(/concluída/);
    expect(updateRecordDate).not.toHaveBeenCalled();
  });

  it('recusa aula já iniciada (ao vivo)', async () => {
    findRecordById.mockResolvedValue(aula('rec-1', 'L1', '2026-09-07T22:00:00Z', { callStartedAt: AGORA }));

    await expect(
      classService.updateRecordDate('ADMIN', 'rec-1', { date: '2026-09-20', time: '19:00' })
    ).rejects.toThrow(/iniciada/);
    expect(updateRecordDate).not.toHaveBeenCalled();
  });

  it('recusa turma que não está ativa', async () => {
    findById.mockResolvedValue(turma({ status: 'INACTIVE' }));

    await expect(
      classService.updateRecordDate('ADMIN', 'rec-1', { date: '2026-09-20', time: '19:00' })
    ).rejects.toThrow();
    expect(updateRecordDate).not.toHaveBeenCalled();
  });

  it('recusa aula inexistente', async () => {
    findRecordById.mockResolvedValue(undefined);

    await expect(
      classService.updateRecordDate('ADMIN', 'rec-x', { date: '2026-09-20', time: '19:00' })
    ).rejects.toThrow(/não encontrada/);
  });
});

describe('updateBasicInfo — reagendamento pela grade da turma', () => {
  beforeEach(() => {
    findById.mockResolvedValue(turma());
    updateBasic.mockImplementation(async (_id: string, data: Record<string, unknown>) => ({
      ...(await findById()),
      ...data,
    }));
    getOrderedLessonsForPlan.mockResolvedValue([{ id: 'L1' }, { id: 'L2' }]);
  });

  it('reagenda só as aulas pendentes, na ordem do plano, preservando ids', async () => {
    findRecordsByClassGroupId.mockResolvedValue([
      aula('feita', 'L0', '2026-08-31T12:00:00Z', { completed: true }),
      aula('ao-vivo', 'L9', '2026-09-07T12:00:00Z', { callStartedAt: AGORA }),
      aula('r-l2', 'L2', '2026-09-14T12:00:00Z'),
      aula('r-l1', 'L1', '2026-09-21T12:00:00Z'), // fora de ordem por data; o plano manda
    ]);

    await classService.updateBasicInfo('ADMIN', 'turma-1', { schedule: [TER_19, QUI_20] });

    expect(updateRecordsDates).toHaveBeenCalledTimes(1);
    expect(updateRecordsDates).toHaveBeenCalledWith([
      { id: 'r-l1', date: new Date('2026-09-08T22:00:00Z') },
      { id: 'r-l2', date: new Date('2026-09-10T23:00:00Z') },
    ]);
  });

  it('sem plano, mantém a ordem atual por data', async () => {
    findById.mockResolvedValue(turma({ planId: null }));
    findRecordsByClassGroupId.mockResolvedValue([
      aula('a', 'L1', '2026-09-14T12:00:00Z'),
      aula('b', 'L2', '2026-09-21T12:00:00Z'),
    ]);

    await classService.updateBasicInfo('ADMIN', 'turma-1', { schedule: [TER_19] });

    expect(getOrderedLessonsForPlan).not.toHaveBeenCalled();
    expect(updateRecordsDates).toHaveBeenCalledWith([
      { id: 'a', date: new Date('2026-09-08T22:00:00Z') },
      { id: 'b', date: new Date('2026-09-15T22:00:00Z') },
    ]);
  });

  it('não reagenda quando só o nome muda', async () => {
    await classService.updateBasicInfo('ADMIN', 'turma-1', { name: 'Turma B' });

    expect(updateBasic).toHaveBeenCalledWith('turma-1', { name: 'Turma B' });
    expect(findRecordsByClassGroupId).not.toHaveBeenCalled();
    expect(updateRecordsDates).not.toHaveBeenCalled();
  });

  it('não reagenda quando o horário enviado é igual ao atual (mesmo em outra ordem)', async () => {
    findById.mockResolvedValue(turma({ schedule: [TER_19, QUI_20] }));

    await classService.updateBasicInfo('ADMIN', 'turma-1', { schedule: [QUI_20, TER_19] });

    expect(updateRecordsDates).not.toHaveBeenCalled();
  });

  it('recusa turma que não está ativa', async () => {
    findById.mockResolvedValue(turma({ status: 'COMPLETED' }));

    await expect(classService.updateBasicInfo('ADMIN', 'turma-1', { name: 'X' })).rejects.toThrow();
    expect(updateBasic).not.toHaveBeenCalled();
  });
});
