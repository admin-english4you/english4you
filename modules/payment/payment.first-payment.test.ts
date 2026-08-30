import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Garante que a confirmação do primeiro pagamento sai UMA vez.
 *
 * O Mercado Pago entrega `created` e depois `updated` para a mesma cobrança —
 * dois eventos distintos, que passam os dois pela tabela de idempotência e
 * chegam ao service. Sem as guardas, o aluno receberia o e-mail duplicado.
 */

const findSubscriptionByMpPreapprovalId = vi.fn();
const findPaymentByMpAuthorizedPaymentId = vi.fn();
const findPaymentsByUserId = vi.fn();
const createPayment = vi.fn();
const updatePayment = vi.fn();
const updateSubscription = vi.fn();
const invoiceGet = vi.fn();
const sendFirstPaymentConfirmedEmail = vi.fn();
const getUserById = vi.fn();
const getPackageById = vi.fn();

vi.mock('./payment.repository', () => ({
  paymentRepository: {
    findSubscriptionByMpPreapprovalId: (...a: unknown[]) => findSubscriptionByMpPreapprovalId(...a),
    findPaymentByMpAuthorizedPaymentId: (...a: unknown[]) => findPaymentByMpAuthorizedPaymentId(...a),
    findPaymentsByUserId: (...a: unknown[]) => findPaymentsByUserId(...a),
    createPayment: (...a: unknown[]) => createPayment(...a),
    updatePayment: (...a: unknown[]) => updatePayment(...a),
    updateSubscription: (...a: unknown[]) => updateSubscription(...a),
  },
}));
vi.mock('@/lib/resend', () => ({
  sendFirstPaymentConfirmedEmail: (...a: unknown[]) => sendFirstPaymentConfirmedEmail(...a),
}));
vi.mock('@/modules/user/user.service', () => ({
  userService: { getUserById: (...a: unknown[]) => getUserById(...a) },
}));
vi.mock('@/modules/finance/finance.service', () => ({
  financeService: { getPackageById: (...a: unknown[]) => getPackageById(...a) },
}));
vi.mock('@/modules/contract/contract.service', () => ({ contractService: {} }));
vi.mock('@/lib/mercado-pago', () => ({
  preApprovalClient: null,
  paymentClient: null,
  invoiceClient: { get: (...a: unknown[]) => invoiceGet(...a) },
  getAppUrl: () => 'https://exemplo.test',
  describeUnusableBackUrl: () => null,
}));

const { paymentService } = await import('./payment.service');

const SUB = {
  id: 'sub-1', userId: 'user-1', packageId: 'pkg-1',
  status: 'PENDING', amountCents: 500,
};

beforeEach(() => {
  vi.clearAllMocks();
  invoiceGet.mockResolvedValue({
    preapproval_id: 'pre-1', status: 'processed',
    payment: { status: 'approved', id: 99 },
    transaction_amount: 5, debit_date: '2026-08-30',
  });
  findSubscriptionByMpPreapprovalId.mockResolvedValue({ ...SUB });
  getUserById.mockResolvedValue({ id: 'user-1', name: 'Aluno', email: 'aluno@teste.invalid' });
  getPackageById.mockResolvedValue({ id: 'pkg-1', name: 'Semestral' });
  createPayment.mockResolvedValue({ id: 'pay-1' });
  updatePayment.mockResolvedValue({ id: 'pay-1' });
});

describe('confirmação do primeiro pagamento', () => {
  it('envia no primeiro pagamento aprovado', async () => {
    findPaymentByMpAuthorizedPaymentId.mockResolvedValue(undefined);
    findPaymentsByUserId.mockResolvedValue([]);

    await paymentService.recordAuthorizedPaymentFromWebhook('mp-1');

    expect(sendFirstPaymentConfirmedEmail).toHaveBeenCalledTimes(1);
    expect(sendFirstPaymentConfirmedEmail.mock.calls[0][0]).toMatchObject({
      email: 'aluno@teste.invalid',
      packageName: 'Semestral',
      amountCents: 500,
      accessUrl: 'https://exemplo.test/student',
    });
  });

  it('NÃO reenvia quando o mesmo evento é reentregue (created e depois updated)', async () => {
    // Segunda entrega: a cobrança já existe e já está paga.
    findPaymentByMpAuthorizedPaymentId.mockResolvedValue({ id: 'pay-1', paidAt: new Date(), status: 'PAID' });
    findPaymentsByUserId.mockResolvedValue([{ id: 'pay-1', status: 'PAID' }]);

    await paymentService.recordAuthorizedPaymentFromWebhook('mp-1');

    expect(sendFirstPaymentConfirmedEmail).not.toHaveBeenCalled();
  });

  it('NÃO envia nas mensalidades seguintes', async () => {
    findPaymentByMpAuthorizedPaymentId.mockResolvedValue(undefined);
    findPaymentsByUserId.mockResolvedValue([{ id: 'pay-antigo', status: 'PAID' }]);

    await paymentService.recordAuthorizedPaymentFromWebhook('mp-2');

    expect(sendFirstPaymentConfirmedEmail).not.toHaveBeenCalled();
  });

  it('NÃO envia quando a cobrança foi recusada', async () => {
    invoiceGet.mockResolvedValue({
      preapproval_id: 'pre-1', status: 'rejected',
      payment: { status: 'rejected', id: 99 },
      transaction_amount: 5, debit_date: '2026-08-30',
    });
    findPaymentByMpAuthorizedPaymentId.mockResolvedValue(undefined);
    findPaymentsByUserId.mockResolvedValue([]);

    await paymentService.recordAuthorizedPaymentFromWebhook('mp-3');

    expect(sendFirstPaymentConfirmedEmail).not.toHaveBeenCalled();
  });

  it('uma falha no e-mail não derruba o webhook', async () => {
    findPaymentByMpAuthorizedPaymentId.mockResolvedValue(undefined);
    findPaymentsByUserId.mockResolvedValue([]);
    sendFirstPaymentConfirmedEmail.mockRejectedValue(new Error('Resend fora do ar'));

    await expect(paymentService.recordAuthorizedPaymentFromWebhook('mp-4')).resolves.toBeUndefined();
    expect(updateSubscription).toHaveBeenCalledWith('sub-1', { status: 'AUTHORIZED' });
  });
});
