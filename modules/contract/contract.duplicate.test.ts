import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Um usuário tem no máximo UM contrato vivo (ACTIVE ou PENDING_SIGNATURE).
 *
 * `getCurrentContractForUser` é quem decide o que cobrar e o que o aluno
 * assina; com dois contratos válidos ela passaria a devolver um dos dois
 * conforme a data de criação, sem ninguém perceber.
 */

const findContractsByUserId = vi.fn();
const findActiveTemplate = vi.fn();
const create = vi.fn();
const getUserById = vi.fn();
const getPackageById = vi.fn();

vi.mock('./contract.repository', () => ({
  contractRepository: {
    findContractsByUserId: (...a: unknown[]) => findContractsByUserId(...a),
    findActiveTemplate: (...a: unknown[]) => findActiveTemplate(...a),
    findActiveTemplateByRole: (...a: unknown[]) => findActiveTemplate(...a),
    create: (...a: unknown[]) => create(...a),
  },
}));
vi.mock('@/modules/user/user.service', () => ({
  userService: { getUserById: (...a: unknown[]) => getUserById(...a) },
}));
vi.mock('@/modules/finance/finance.service', () => ({
  financeService: { getPackageById: (...a: unknown[]) => getPackageById(...a) },
}));
vi.mock('@/lib/db', () => ({ db: { batch: vi.fn() } }));

const { contractService } = await import('./contract.service');

beforeEach(() => {
  vi.clearAllMocks();
  getUserById.mockResolvedValue({ id: 'u1', name: 'Aluno', role: 'STUDENT' });
  getPackageById.mockResolvedValue({ id: 'pkg-1', name: 'Semestral', durationInMonths: 6 });
  findActiveTemplate.mockResolvedValue({ id: 'tpl-1', content: '<p>x</p>' });
  create.mockImplementation(async (d: Record<string, unknown>) => ({ ...d, id: 'novo' }));
});

describe('createContractForUser', () => {
  it('emite quando o usuário não tem contrato vivo', async () => {
    findContractsByUserId.mockResolvedValue([{ id: 'velho', status: 'CANCELED' }]);

    const contrato = await contractService.createContractForUser('ADMIN', 'u1', 'pkg-1');

    expect(contrato.id).toBe('novo');
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('recusa quando já existe contrato ATIVO — evitaria dois contratos válidos', async () => {
    findContractsByUserId.mockResolvedValue([{ id: 'vivo', status: 'ACTIVE' }]);

    await expect(contractService.createContractForUser('ADMIN', 'u1', 'pkg-1')).rejects.toThrow(
      /já tem um contrato ativo/i
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('recusa quando já existe contrato aguardando assinatura', async () => {
    findContractsByUserId.mockResolvedValue([{ id: 'vivo', status: 'PENDING_SIGNATURE' }]);

    await expect(contractService.createContractForUser('ADMIN', 'u1', 'pkg-1')).rejects.toThrow(
      /aguardando assinatura/i
    );
    expect(create).not.toHaveBeenCalled();
  });

  /**
   * A troca de pacote e a mudança de bolsa cancelam o contrato anterior ANTES
   * de reemitir — a trava não pode atrapalhar esses fluxos.
   */
  it('não atrapalha a reemissão, que cancela o anterior antes de chegar aqui', async () => {
    findContractsByUserId.mockResolvedValue([
      { id: 'recem-cancelado', status: 'CANCELED' },
      { id: 'antigo', status: 'COMPLETED' },
    ]);

    await expect(
      contractService.createContractForUser('ADMIN', 'u1', 'pkg-1', {
        scholarshipPercent: 50,
        billingMode: 'MERCADO_PAGO',
      })
    ).resolves.toMatchObject({ scholarshipPercent: 50 });
  });
});
