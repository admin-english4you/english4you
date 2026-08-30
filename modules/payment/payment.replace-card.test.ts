import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Regressão da cobrança em dobro na troca de cartão.
 *
 * Em produção, um aluno que tinha acabado de pagar trocou o cartão e foi
 * cobrado de novo na hora (e a cobrança ainda foi recusada). A causa: o
 * `nextPaymentDate` local ficava congelado na data da PRIMEIRA cobrança, então
 * ficava no passado, e o código concluía "sem data futura ⇒ cobrar agora".
 */

const findRecentSubscriptionsByUserId = vi.fn();
const findPaymentsByUserId = vi.fn();
const createSubscription = vi.fn();
const updateSubscription = vi.fn();
const getUserById = vi.fn();
const getPackageById = vi.fn();
const preapprovalGet = vi.fn();
const preapprovalCreate = vi.fn();

vi.mock('./payment.repository', () => ({
  paymentRepository: {
    findRecentSubscriptionsByUserId: (...a: unknown[]) => findRecentSubscriptionsByUserId(...a),
    findPaymentsByUserId: (...a: unknown[]) => findPaymentsByUserId(...a),
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
vi.mock('@/modules/contract/contract.service', () => ({ contractService: {} }));
vi.mock('@/lib/resend', () => ({ sendFirstPaymentConfirmedEmail: vi.fn() }));
vi.mock('@/lib/mercado-pago', () => ({
  preApprovalClient: {
    get: (...a: unknown[]) => preapprovalGet(...a),
    create: (...a: unknown[]) => preapprovalCreate(...a),
  },
  invoiceClient: {},
  paymentClient: null,
  getAppUrl: () => 'https://exemplo.test',
  describeUnusableBackUrl: () => null,
}));

const { paymentService } = await import('./payment.service');

const UM_MES = 30 * 24 * 60 * 60 * 1000;

/** Assinatura em dia cujo `nextPaymentDate` ficou no passado — o cenário do bug. */
function assinaturaComDataDefasada() {
  return {
    id: 'sub-1', userId: 'user-1', contractId: 'contract-1', packageId: 'pkg-1',
    status: 'AUTHORIZED', amountCents: 500, frequencyMonths: 1,
    mpPreapprovalId: 'pre-1', initPoint: null,
    startDate: new Date(Date.now() - UM_MES),
    endDate: new Date(Date.now() + 6 * UM_MES),
    nextPaymentDate: new Date(Date.now() - 60_000), // 1 min atrás
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  getUserById.mockResolvedValue({ id: 'user-1', email: 'aluno@teste.invalid', name: 'Aluno' });
  getPackageById.mockResolvedValue({ id: 'pkg-1', name: 'Semestral', installmentValueCents: 500 });
  createSubscription.mockImplementation(async (d: Record<string, unknown>) => ({ ...d, id: 'sub-nova' }));
  preapprovalCreate.mockResolvedValue({ id: 'pre-nova', init_point: 'https://mp/checkout' });
  preapprovalGet.mockResolvedValue({ next_payment_date: null });
  findPaymentsByUserId.mockResolvedValue([]);
});

/** O `start_date` enviado ao Mercado Pago na criação do preapproval. */
function startDateEnviadoAoMP(): string | undefined {
  return preapprovalCreate.mock.calls[0][0].body.auto_recurring.start_date;
}

describe('replaceCard — aluno EM DIA', () => {
  it('não cobra na hora quando a data local está defasada (o bug)', async () => {
    findRecentSubscriptionsByUserId.mockResolvedValue([assinaturaComDataDefasada()]);
    findPaymentsByUserId.mockResolvedValue([
      { id: 'p1', status: 'PAID', paidAt: new Date(Date.now() - 60_000) },
    ]);

    await paymentService.replaceCard('user-1');

    const enviado = startDateEnviadoAoMP();
    expect(enviado).toBeDefined();
    expect(new Date(enviado!).getTime()).toBeGreaterThan(Date.now());
  });

  it('usa a data que o Mercado Pago informa quando a nossa está velha', async () => {
    const futuroReal = new Date(Date.now() + UM_MES);
    findRecentSubscriptionsByUserId.mockResolvedValue([assinaturaComDataDefasada()]);
    preapprovalGet.mockResolvedValue({ next_payment_date: futuroReal.toISOString() });

    await paymentService.replaceCard('user-1');

    expect(new Date(startDateEnviadoAoMP()!).getTime()).toBe(futuroReal.getTime());
    // E corrige a cópia local, para o painel parar de mostrar data vencida.
    expect(updateSubscription).toHaveBeenCalledWith('sub-1', { nextPaymentDate: futuroReal });
  });

  it('respeita a data local quando ela ainda é futura, sem consultar o MP', async () => {
    const futura = new Date(Date.now() + UM_MES);
    findRecentSubscriptionsByUserId.mockResolvedValue([
      { ...assinaturaComDataDefasada(), nextPaymentDate: futura },
    ]);

    await paymentService.replaceCard('user-1');

    expect(new Date(startDateEnviadoAoMP()!).getTime()).toBe(futura.getTime());
    expect(preapprovalGet).not.toHaveBeenCalled();
  });

  it('recusa a troca quando não sobra mensalidade dentro da vigência', async () => {
    findRecentSubscriptionsByUserId.mockResolvedValue([
      {
        ...assinaturaComDataDefasada(),
        endDate: new Date(Date.now() + 60_000), // contrato acaba em 1 min
      },
    ]);

    await expect(paymentService.replaceCard('user-1')).rejects.toThrow(/chegando ao fim/i);
    expect(preapprovalCreate).not.toHaveBeenCalled();
  });
});

describe('replaceCard — aluno INADIMPLENTE', () => {
  it('cobra no aceite, porque ele realmente deve o mês', async () => {
    findRecentSubscriptionsByUserId.mockResolvedValue([
      { ...assinaturaComDataDefasada(), status: 'PAYMENT_FAILED' },
    ]);

    await paymentService.replaceCard('user-1');

    // Sem `start_date` = o Mercado Pago cobra no instante da autorização.
    expect(startDateEnviadoAoMP()).toBeUndefined();
  });
});
