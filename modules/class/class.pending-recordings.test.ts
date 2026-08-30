import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Aviso de gravações pendentes.
 *
 * O prazo é o ponto sensível: se a contagem errar para mais, o aviso some antes
 * da hora e a aula é apagada sem ninguém notar.
 */

const findPendingRecordings = vi.fn();
const findRecordById = vi.fn();
const markRecordingArchived = vi.fn();

vi.mock('./class.repository', () => ({
  classRepository: {
    findPendingRecordings: (...a: unknown[]) => findPendingRecordings(...a),
    findRecordById: (...a: unknown[]) => findRecordById(...a),
    markRecordingArchived: (...a: unknown[]) => markRecordingArchived(...a),
  },
}));
vi.mock('@/modules/user/user.service', () => ({ userService: {} }));
vi.mock('@/modules/lesson/lesson.service', () => ({ lessonService: {} }));
vi.mock('@/modules/plan/plan.service', () => ({ planService: {} }));
vi.mock('@/modules/practice/practice.service', () => ({ practiceService: {} }));
vi.mock('@/modules/progress/progress.service', () => ({ progressService: {} }));
vi.mock('@/modules/notification/notification.service', () => ({ notificationService: {} }));
vi.mock('@/lib/resend', () => ({ sendClassRecordingEmail: vi.fn() }));
vi.mock('@/lib/firebase-admin', () => ({ adminAuth: null, adminDb: null }));
vi.mock('@/lib/db', () => ({ db: {} }));

const { classService } = await import('./class.service');

const AGORA = new Date('2026-08-30T12:00:00Z');

/** Aula ocorrida há `dias` dias — a gravação vence 14 dias após a aula. */
function aula(dias: number, extras: Record<string, unknown> = {}) {
  const date = new Date(AGORA.getTime() - dias * 24 * 60 * 60 * 1000);
  return {
    recordId: `rec-${dias}`,
    classGroupId: 'turma-1',
    className: 'Turma A',
    lessonTitle: 'Lição 1',
    date,
    recordingUrls: ['https://stream/rec.mp4'],
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

describe('getPendingRecordings', () => {
  it('conta os dias restantes a partir da data da aula', async () => {
    findPendingRecordings.mockResolvedValue([aula(0), aula(10), aula(13)]);

    const r = await classService.getPendingRecordings('ADMIN');

    expect(r.map((x) => x.daysLeft)).toEqual([14, 4, 1]);
  });

  it('marca como vencida a gravação que passou dos 14 dias', async () => {
    findPendingRecordings.mockResolvedValue([aula(20)]);

    const [r] = await classService.getPendingRecordings('ADMIN');

    expect(r.daysLeft).toBeLessThan(0);
  });

  it('a data limite é 14 dias depois da aula', async () => {
    findPendingRecordings.mockResolvedValue([aula(0)]);

    const [r] = await classService.getPendingRecordings('ADMIN');

    expect(r.availableUntil.toISOString().slice(0, 10)).toBe('2026-09-13');
  });

  it('só admin consulta', async () => {
    await expect(classService.getPendingRecordings('TEACHER')).rejects.toThrow();
    await expect(classService.getPendingRecordings('STUDENT')).rejects.toThrow();
  });
});

describe('markRecordingArchived', () => {
  it('marca a aula como arquivada', async () => {
    findRecordById.mockResolvedValue({ id: 'rec-1', recordingUrls: ['https://stream/a.mp4'] });

    await classService.markRecordingArchived('ADMIN', 'rec-1');

    expect(markRecordingArchived).toHaveBeenCalledWith('rec-1');
  });

  /** Sem isto, um clique errado "resolveria" uma aula que nunca teve gravação. */
  it('recusa aula sem gravação', async () => {
    findRecordById.mockResolvedValue({ id: 'rec-1', recordingUrls: [] });

    await expect(classService.markRecordingArchived('ADMIN', 'rec-1')).rejects.toThrow(
      /não tem gravação/i
    );
    expect(markRecordingArchived).not.toHaveBeenCalled();
  });

  it('recusa aula inexistente', async () => {
    findRecordById.mockResolvedValue(undefined);

    await expect(classService.markRecordingArchived('ADMIN', 'rec-x')).rejects.toThrow(
      /não encontrada/i
    );
  });

  it('só admin arquiva', async () => {
    await expect(classService.markRecordingArchived('TEACHER', 'rec-1')).rejects.toThrow();
  });
});
