import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Apagar conta permanentemente — a operação mais destrutiva deste módulo.
 * Cada teste aqui existe porque um erro nesta função tem consequência real:
 * cobrar um aluno que não existe mais, ou apagar a conta errada.
 */

const findAllSubscriptionsByUserId = vi.fn();
const cancelPendingPaymentsByUserId = vi.fn();
const updateSubscription = vi.fn();
const getUserById = vi.fn();
const deleteUserPermanently = vi.fn();
const preApprovalUpdate = vi.fn();

vi.mock('./payment.repository', () => ({
  paymentRepository: {
    findAllSubscriptionsByUserId: (...a: unknown[]) => findAllSubscriptionsByUserId(...a),
    cancelPendingPaymentsByUserId: (...a: unknown[]) => cancelPendingPaymentsByUserId(...a),
    updateSubscription: (...a: unknown[]) => updateSubscription(...a),
  },
}));
vi.mock('@/modules/user/user.service', () => ({
  userService: {
    getUserById: (...a: unknown[]) => getUserById(...a),
    deleteUserPermanently: (...a: unknown[]) => deleteUserPermanently(...a),
  },
}));
vi.mock('@/modules/contract/contract.service', () => ({ contractService: {} }));
vi.mock('@/modules/finance/finance.service', () => ({ financeService: {} }));
vi.mock('@/lib/resend', () => ({}));
vi.mock('@/lib/mercado-pago', () => ({
  preApprovalClient: { update: (...a: unknown[]) => preApprovalUpdate(...a) },
  invoiceClient: {},
  paymentClient: null,
  getAppUrl: () => 'https://exemplo.test',
  describeUnusableBackUrl: () => null,
}));

const { paymentService } = await import('./payment.service');

beforeEach(() => {
  vi.clearAllMocks();
  getUserById.mockResolvedValue({ id: 'u1', role: 'STUDENT', name: 'Aluna Teste', email: 'aluna@teste.invalid' });
  findAllSubscriptionsByUserId.mockResolvedValue([]);
  cancelPendingPaymentsByUserId.mockResolvedValue(0);
  deleteUserPermanently.mockResolvedValue(undefined);
  preApprovalUpdate.mockResolvedValue({});
});

describe('deleteStudentAccount — a trava do e-mail', () => {
  it('recusa apagar se o e-mail digitado não bate com o da conta', async () => {
    await expect(
      paymentService.deleteStudentAccount('ADMIN', 'u1', 'errado@teste.invalid')
    ).rejects.toThrow(/não confere/i);

    // Nada foi tocado — nem cancelamento, nem delete.
    expect(findAllSubscriptionsByUserId).not.toHaveBeenCalled();
    expect(deleteUserPermanently).not.toHaveBeenCalled();
  });

  it('aceita o e-mail sem diferenciar maiúsculas/minúsculas ou espaço nas pontas', async () => {
    await paymentService.deleteStudentAccount('ADMIN', 'u1', '  ALUNA@Teste.Invalid  ');
    expect(deleteUserPermanently).toHaveBeenCalledWith('ADMIN', 'u1');
  });

  it('recusa se o usuário não existe — nada pra apagar', async () => {
    getUserById.mockResolvedValue(undefined);
    await expect(
      paymentService.deleteStudentAccount('ADMIN', 'inexistente', 'qualquer@teste.invalid')
    ).rejects.toThrow(/não encontrado/i);
    expect(deleteUserPermanently).not.toHaveBeenCalled();
  });
});

describe('deleteStudentAccount — cancelamento no Mercado Pago ANTES de apagar', () => {
  it('cancela toda assinatura viva antes de chamar o delete', async () => {
    findAllSubscriptionsByUserId.mockResolvedValue([
      { id: 's1', status: 'AUTHORIZED', mpPreapprovalId: 'mp-1' },
      { id: 's2', status: 'PENDING', mpPreapprovalId: 'mp-2' },
    ]);

    const result = await paymentService.deleteStudentAccount('ADMIN', 'u1', 'aluna@teste.invalid');

    expect(preApprovalUpdate).toHaveBeenCalledTimes(2);
    expect(preApprovalUpdate).toHaveBeenCalledWith({ id: 'mp-1', body: { status: 'cancelled' } });
    expect(preApprovalUpdate).toHaveBeenCalledWith({ id: 'mp-2', body: { status: 'cancelled' } });
    expect(result.canceledSubscriptions).toBe(2);

    // A ordem importa: cancelar no MP TEM que acontecer antes de apagar a
    // conta — depois de apagada, não sobra registro nenhum pra saber que
    // precisava cancelar.
    const cancelOrder = preApprovalUpdate.mock.invocationCallOrder[0];
    const deleteOrder = deleteUserPermanently.mock.invocationCallOrder[0];
    expect(cancelOrder).toBeLessThan(deleteOrder);
  });

  it('NÃO tenta cancelar assinatura já em estado terminal (CANCELLED/COMPLETED)', async () => {
    findAllSubscriptionsByUserId.mockResolvedValue([
      { id: 's1', status: 'CANCELLED', mpPreapprovalId: 'mp-1' },
      { id: 's2', status: 'COMPLETED', mpPreapprovalId: 'mp-2' },
    ]);

    const result = await paymentService.deleteStudentAccount('ADMIN', 'u1', 'aluna@teste.invalid');

    expect(preApprovalUpdate).not.toHaveBeenCalled();
    expect(result.canceledSubscriptions).toBe(0);
  });

  it('usa TODAS as assinaturas, não só as recentes — não pode deixar nenhuma pra trás', async () => {
    // Regressão do risco real: `findRecentSubscriptionsByUserId` (usado por
    // `deactivateStudent`) corta num lookback. Apagar conta precisa da busca
    // SEM limite, senão uma assinatura antiga fica cobrando um aluno que já
    // não existe mais no banco pra ninguém notar.
    await paymentService.deleteStudentAccount('ADMIN', 'u1', 'aluna@teste.invalid');
    expect(findAllSubscriptionsByUserId).toHaveBeenCalledWith('u1');
  });

  it('cancela cobranças pendentes também', async () => {
    cancelPendingPaymentsByUserId.mockResolvedValue(3);
    const result = await paymentService.deleteStudentAccount('ADMIN', 'u1', 'aluna@teste.invalid');
    expect(result.canceledPayments).toBe(3);
  });
});

describe('deleteStudentAccount — RBAC', () => {
  it('recusa quem não é admin, antes de tocar em qualquer coisa', async () => {
    await expect(
      paymentService.deleteStudentAccount('TEACHER', 'u1', 'aluna@teste.invalid')
    ).rejects.toThrow(/administrador/i);

    expect(getUserById).not.toHaveBeenCalled();
    expect(findAllSubscriptionsByUserId).not.toHaveBeenCalled();
    expect(deleteUserPermanently).not.toHaveBeenCalled();
  });
});
