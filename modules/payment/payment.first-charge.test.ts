import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Adiamento da primeira mensalidade.
 *
 * Serve para migrar aluno que já estuda na escola e já pagou o mês por fora:
 * ele cadastra o cartão agora, mas o Mercado Pago só cobra na data marcada.
 * Errar aqui cobra do aluno um mês que ele já pagou.
 */

const findRecentSubscriptionsByUserId = vi.fn();
const createSubscription = vi.fn();
const updateSubscription = vi.fn();
const getUserById = vi.fn();
const getPackageById = vi.fn();
const getCurrentContractForUser = vi.fn();
const preapprovalCreate = vi.fn();

vi.mock('./payment.repository', () => ({
  paymentRepository: {
    findRecentSubscriptionsByUserId: (...a: unknown[]) => findRecentSubscriptionsByUserId(...a),
    createSubscription: (...a: unknown[]) => createSubscription(...a),
    updateSubscription: (...a: unknown[]) => updateSubscription(...a),
  },
}));
vi.mock('@/modules/user/user.service', () => ({
  userService: { getUserById: (...a: unknown[]) => getUserById(...a) },
}));
vi.mock('@/modules/finance/finance.service', () => ({
  financeService: { getPackageById: (...a: unknown[]) => getPackageById(...a) },
}));
vi.mock('@/modules/contract/contract.service', () => ({
  contractService: {
    getCurrentContractForUser: (...a: unknown[]) => getCurrentContractForUser(...a),
  },
}));
vi.mock('@/lib/resend', () => ({
  sendFirstPaymentConfirmedEmail: vi.fn(),
  sendPackageChangedEmail: vi.fn(),
  sendScholarshipChangedEmail: vi.fn(),
}));
vi.mock('@/lib/mercado-pago', () => ({
  preApprovalClient: { create: (...a: unknown[]) => preapprovalCreate(...a), get: vi.fn() },
  invoiceClient: {},
  paymentClient: null,
  getAppUrl: () => 'https://exemplo.test',
  describeUnusableBackUrl: () => null,
}));

const { paymentService } = await import('./payment.service');

const UM_MES = 30 * 24 * 60 * 60 * 1000;

function contrato(firstChargeAt: Date | null) {
  return {
    id: 'c-1',
    status: 'ACTIVE',
    packageId: 'pkg-1',
    endDate: new Date(Date.now() + 6 * UM_MES),
    startDate: new Date(),
    scholarshipPercent: 0,
    billingMode: 'MERCADO_PAGO',
    firstChargeAt,
  };
}

/** O `start_date` enviado ao Mercado Pago; `undefined` = cobra no aceite. */
function startDateEnviado(): string | undefined {
  return preapprovalCreate.mock.calls[0][0].body.auto_recurring.start_date;
}

beforeEach(() => {
  vi.clearAllMocks();
  getUserById.mockResolvedValue({
    id: 'u1', role: 'STUDENT', status: 'Active', email: 'a@t.invalid', name: 'Aluno',
  });
  getPackageById.mockResolvedValue({ id: 'pkg-1', name: 'Semestral', installmentValueCents: 20000 });
  findRecentSubscriptionsByUserId.mockResolvedValue([]);
  createSubscription.mockImplementation(async (d: Record<string, unknown>) => ({ ...d, id: 's-1' }));
  preapprovalCreate.mockResolvedValue({ id: 'pre-1', init_point: 'https://mp/checkout' });
});

describe('startSubscriptionCheckout — primeira cobrança', () => {
  it('sem adiamento, cobra no aceite (comportamento padrão)', async () => {
    getCurrentContractForUser.mockResolvedValue(contrato(null));

    await paymentService.startSubscriptionCheckout('u1');

    expect(startDateEnviado()).toBeUndefined();
  });

  it('com adiamento, manda a data ao Mercado Pago', async () => {
    const data = new Date(Date.now() + UM_MES);
    getCurrentContractForUser.mockResolvedValue(contrato(data));

    await paymentService.startSubscriptionCheckout('u1');

    expect(new Date(startDateEnviado()!).getTime()).toBe(data.getTime());
  });

  /**
   * O MP recusa `start_date` no passado. Deixar passar quebraria o checkout do
   * aluno com um 400 opaco — cobrar no aceite é o degrau seguro.
   */
  it('ignora uma data de adiamento já vencida', async () => {
    getCurrentContractForUser.mockResolvedValue(contrato(new Date(Date.now() - UM_MES)));

    await paymentService.startSubscriptionCheckout('u1');

    expect(startDateEnviado()).toBeUndefined();
  });

  it('o valor cobrado continua sendo o do pacote, com bolsa se houver', async () => {
    getCurrentContractForUser.mockResolvedValue({
      ...contrato(new Date(Date.now() + UM_MES)),
      scholarshipPercent: 50,
    });

    await paymentService.startSubscriptionCheckout('u1');

    expect(createSubscription.mock.calls[0][0].amountCents).toBe(10000);
    expect(preapprovalCreate.mock.calls[0][0].body.auto_recurring.transaction_amount).toBe(100);
  });
});
