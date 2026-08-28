import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Testes do PORTÃO DE ACESSO (`getAccessState`) — a função de maior
 * consequência do módulo: é ela que decide, a cada navegação, se o aluno entra.
 *
 * O service fala com singletons de repository/serviços, então cada dependência
 * é mockada. O que está sob teste é só a ÁRVORE DE DECISÃO.
 */

const findRecentSubscriptionsByUserId = vi.fn();
const findLatestFailedPaymentByUserId = vi.fn();
const getCurrentContractGateFieldsForUser = vi.fn();
const getUserById = vi.fn();

vi.mock('./payment.repository', () => ({
  paymentRepository: {
    findRecentSubscriptionsByUserId: (...args: unknown[]) =>
      findRecentSubscriptionsByUserId(...args),
    findLatestFailedPaymentByUserId: (...args: unknown[]) =>
      findLatestFailedPaymentByUserId(...args),
  },
}));

vi.mock('@/modules/contract/contract.service', () => ({
  contractService: {
    getCurrentContractGateFieldsForUser: (...args: unknown[]) =>
      getCurrentContractGateFieldsForUser(...args),
  },
}));

vi.mock('@/modules/user/user.service', () => ({
  userService: { getUserById: (...args: unknown[]) => getUserById(...args) },
}));

vi.mock('@/modules/finance/finance.service', () => ({ financeService: {} }));
vi.mock('@/lib/mercado-pago', () => ({
  preApprovalClient: null,
  invoiceClient: null,
  paymentClient: null,
  getAppUrl: () => 'https://exemplo.test',
  describeUnusableBackUrl: () => null,
}));

const { paymentService } = await import('./payment.service');

const USER_ID = 'user-1';

/** Só os campos que o portão lê. */
function subscription(status: string, overrides: Record<string, unknown> = {}) {
  return { id: `sub-${status}`, status, packageId: 'pkg-1', ...overrides };
}

function contract(billingMode: string, status: string, scholarshipPercent = 0) {
  return { id: 'contract-1', status, packageId: 'pkg-1', scholarshipPercent, billingMode };
}

beforeEach(() => {
  vi.clearAllMocks();
  getUserById.mockResolvedValue({ id: USER_ID, role: 'STUDENT', status: 'Active' });
  getCurrentContractGateFieldsForUser.mockResolvedValue(null);
  findRecentSubscriptionsByUserId.mockResolvedValue([]);
  findLatestFailedPaymentByUserId.mockResolvedValue(undefined);
});

describe('getAccessState — conta desativada (regra 0)', () => {
  it('bloqueia antes de qualquer outra regra, mesmo com assinatura em dia', async () => {
    getUserById.mockResolvedValue({ id: USER_ID, role: 'STUDENT', status: 'Inactive' });
    findRecentSubscriptionsByUserId.mockResolvedValue([subscription('AUTHORIZED')]);

    const result = await paymentService.getAccessState(USER_ID);

    expect(result.state).toBe('DEACTIVATED');
  });

  /**
   * O furo que motivou o estado novo: bolsista integral não tem assinatura
   * para cancelar, então desativá-lo não mudava nada no portão.
   */
  it('bloqueia bolsista integral, que não tem assinatura para cancelar', async () => {
    getUserById.mockResolvedValue({ id: USER_ID, role: 'STUDENT', status: 'Inactive' });
    getCurrentContractGateFieldsForUser.mockResolvedValue(contract('MANUAL', 'ACTIVE', 100));

    const result = await paymentService.getAccessState(USER_ID);

    expect(result.state).toBe('DEACTIVATED');
  });
});

describe('getAccessState — cobrança manual / bolsa (regra 1)', () => {
  it('libera bolsista com contrato assinado e nenhuma assinatura', async () => {
    getCurrentContractGateFieldsForUser.mockResolvedValue(contract('MANUAL', 'ACTIVE', 100));

    const result = await paymentService.getAccessState(USER_ID);

    expect(result.state).toBe('OK');
    expect(result.subscription).toBeNull();
  });

  /**
   * REGRESSÃO CRÍTICA — protege a ORDEM das regras.
   *
   * Um aluno que pagava, ficou inadimplente e depois ganhou bolsa ainda tem a
   * linha PAYMENT_FAILED dentro da janela do lookback. Se a regra de
   * inadimplência rodar antes da do contrato, ele é mandado para /fix-payment:
   * uma tela cujo único botão troca o cartão de uma assinatura que não existe
   * mais, e de onde não há saída. Inverter a ordem no service quebra este teste.
   */
  it('ignora inadimplência antiga depois que o aluno virou bolsista', async () => {
    getCurrentContractGateFieldsForUser.mockResolvedValue(contract('MANUAL', 'ACTIVE', 100));
    findRecentSubscriptionsByUserId.mockResolvedValue([
      subscription('CANCELLED'),
      subscription('PAYMENT_FAILED'),
    ]);

    const result = await paymentService.getAccessState(USER_ID);

    expect(result.state).toBe('OK');
    expect(findLatestFailedPaymentByUserId).not.toHaveBeenCalled();
  });

  it('exige a assinatura do contrato antes de liberar', async () => {
    getCurrentContractGateFieldsForUser.mockResolvedValue(
      contract('MANUAL', 'PENDING_SIGNATURE', 100)
    );
    findRecentSubscriptionsByUserId.mockResolvedValue([subscription('AUTHORIZED')]);

    const result = await paymentService.getAccessState(USER_ID);

    expect(result.state).toBe('NEEDS_ONBOARDING');
  });

  it('vale também para desconto parcial cobrado por fora do Mercado Pago', async () => {
    getCurrentContractGateFieldsForUser.mockResolvedValue(contract('MANUAL', 'ACTIVE', 50));

    const result = await paymentService.getAccessState(USER_ID);

    expect(result.state).toBe('OK');
  });
});

describe('getAccessState — regras de assinatura preservadas', () => {
  /** Tabela-verdade original: um contrato MERCADO_PAGO não deve mudar nada. */
  const MP_CONTRACT = contract('MERCADO_PAGO', 'ACTIVE', 0);

  beforeEach(() => {
    getCurrentContractGateFieldsForUser.mockResolvedValue(MP_CONTRACT);
  });

  it('sem assinatura nenhuma → precisa contratar', async () => {
    const result = await paymentService.getAccessState(USER_ID);
    expect(result.state).toBe('NEEDS_ONBOARDING');
  });

  it('qualquer AUTHORIZED → libera', async () => {
    findRecentSubscriptionsByUserId.mockResolvedValue([
      subscription('PENDING'),
      subscription('AUTHORIZED'),
    ]);
    const result = await paymentService.getAccessState(USER_ID);
    expect(result.state).toBe('OK');
  });

  it('inadimplente → bloqueia, mesmo com uma PENDING mais nova', async () => {
    findRecentSubscriptionsByUserId.mockResolvedValue([
      subscription('PENDING'),
      subscription('PAYMENT_FAILED'),
    ]);
    findLatestFailedPaymentByUserId.mockResolvedValue({ id: 'pay-1' });

    const result = await paymentService.getAccessState(USER_ID);

    expect(result.state).toBe('BLOCKED');
    expect(result.lastFailure).toEqual({ id: 'pay-1' });
  });

  it('PAUSED também bloqueia', async () => {
    findRecentSubscriptionsByUserId.mockResolvedValue([subscription('PAUSED')]);
    const result = await paymentService.getAccessState(USER_ID);
    expect(result.state).toBe('BLOCKED');
  });

  it('COMPLETED mais recente → curso acabou, não bloqueia', async () => {
    findRecentSubscriptionsByUserId.mockResolvedValue([subscription('COMPLETED')]);
    const result = await paymentService.getAccessState(USER_ID);
    expect(result.state).toBe('OK');
  });

  it('PENDING mais recente → precisa terminar de contratar', async () => {
    findRecentSubscriptionsByUserId.mockResolvedValue([subscription('PENDING')]);
    const result = await paymentService.getAccessState(USER_ID);
    expect(result.state).toBe('NEEDS_ONBOARDING');
  });

  it('sem contrato nenhum, o comportamento antigo é preservado', async () => {
    getCurrentContractGateFieldsForUser.mockResolvedValue(null);
    findRecentSubscriptionsByUserId.mockResolvedValue([subscription('AUTHORIZED')]);
    const result = await paymentService.getAccessState(USER_ID);
    expect(result.state).toBe('OK');
  });
});
