import { beforeEach, describe, expect, it, vi } from 'vitest';

const findById = vi.fn();
const deletePlan = vi.fn();
const unlinkPlanFromClasses = vi.fn();

vi.mock('./plan.repository', () => ({
  planRepository: {
    findById: (...a: unknown[]) => findById(...a),
    delete: (...a: unknown[]) => deletePlan(...a),
  },
}));
vi.mock('@/modules/lesson/lesson.service', () => ({ lessonService: {} }));
vi.mock('@/modules/class/class.service', () => ({
  classService: { unlinkPlanFromClasses: (...a: unknown[]) => unlinkPlanFromClasses(...a) },
}));

const { planService } = await import('./plan.service');

beforeEach(() => {
  vi.clearAllMocks();
  findById.mockResolvedValue({ id: 'plano-1', name: 'Plano', status: 'ACTIVE' });
});

describe('deletePlan', () => {
  it('desvincula as turmas antes de excluir o plano', async () => {
    const order: string[] = [];
    unlinkPlanFromClasses.mockImplementation(async () => void order.push('unlink'));
    deletePlan.mockImplementation(async () => void order.push('delete'));

    await planService.deletePlan('ADMIN', 'plano-1');

    expect(unlinkPlanFromClasses).toHaveBeenCalledWith('ADMIN', 'plano-1');
    expect(deletePlan).toHaveBeenCalledWith('plano-1');
    expect(order).toEqual(['unlink', 'delete']);
  });

  it('recusa quem não é ADMIN', async () => {
    await expect(planService.deletePlan('TEACHER', 'plano-1')).rejects.toThrow();
    expect(unlinkPlanFromClasses).not.toHaveBeenCalled();
    expect(deletePlan).not.toHaveBeenCalled();
  });

  it('recusa plano inexistente sem mexer nas turmas', async () => {
    findById.mockResolvedValue(undefined);

    await expect(planService.deletePlan('ADMIN', 'plano-x')).rejects.toThrow(/não encontrado/);
    expect(unlinkPlanFromClasses).not.toHaveBeenCalled();
    expect(deletePlan).not.toHaveBeenCalled();
  });

  it('não exclui o plano se o desvínculo falhar', async () => {
    unlinkPlanFromClasses.mockRejectedValue(new Error('db'));

    await expect(planService.deletePlan('ADMIN', 'plano-1')).rejects.toThrow('db');
    expect(deletePlan).not.toHaveBeenCalled();
  });
});
