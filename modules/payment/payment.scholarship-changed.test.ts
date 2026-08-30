import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Aviso de mudança de bolsa.
 *
 * Alterar a bolsa cancela contrato e assinatura e emite um contrato novo — o
 * aluno perde o acesso na hora. O texto muda conforme o caso, porque conceder
 * e retirar um benefício não são a mesma notícia.
 */

const findLiveSubscriptionsByContractId = vi.fn();
const getUserById = vi.fn();
const getPackageById = vi.fn();
const getCurrentContractForUser = vi.fn();
const cancelContract = vi.fn();
const createContractForUser = vi.fn();
const sendScholarshipChangedEmail = vi.fn();

vi.mock('./payment.repository', () => ({
  paymentRepository: {
    findLiveSubscriptionsByContractId: (...a: unknown[]) => findLiveSubscriptionsByContractId(...a),
    updateSubscription: vi.fn(),
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
    cancelContract: (...a: unknown[]) => cancelContract(...a),
    createContractForUser: (...a: unknown[]) => createContractForUser(...a),
  },
}));
vi.mock('@/lib/resend', () => ({
  sendFirstPaymentConfirmedEmail: vi.fn(),
  sendPackageChangedEmail: vi.fn(),
  sendScholarshipChangedEmail: (...a: unknown[]) => sendScholarshipChangedEmail(...a),
}));
vi.mock('@/lib/mercado-pago', () => ({
  preApprovalClient: {}, invoiceClient: {}, paymentClient: null,
  getAppUrl: () => 'https://exemplo.test',
  describeUnusableBackUrl: () => null,
}));

const { paymentService } = await import('./payment.service');

function contratoAtual(percent: number, mode = 'MERCADO_PAGO') {
  return { id: 'c-velho', packageId: 'pkg-1', scholarshipPercent: percent, billingMode: mode };
}

beforeEach(() => {
  vi.clearAllMocks();
  getUserById.mockResolvedValue({ id: 'u1', role: 'STUDENT', name: 'Aluno', email: 'aluno@teste.invalid' });
  getPackageById.mockResolvedValue({ id: 'pkg-1', name: 'Semestral', installmentValueCents: 20000 });
  findLiveSubscriptionsByContractId.mockResolvedValue([]);
  getCurrentContractForUser.mockResolvedValue(contratoAtual(0));
});

describe('setScholarshipTerms — aviso ao aluno', () => {
  it('bolsa concedida: anuncia o percentual e o valor com desconto', async () => {
    createContractForUser.mockResolvedValue({
      id: 'c-novo', scholarshipPercent: 40, billingMode: 'MERCADO_PAGO',
    });

    await paymentService.setScholarshipTerms('ADMIN', 'u1', {
      scholarshipPercent: 40, billingMode: 'MERCADO_PAGO',
    });

    expect(sendScholarshipChangedEmail.mock.calls[0][0]).toMatchObject({
      email: 'aluno@teste.invalid',
      scholarshipPercent: 40,
      monthlyAmountCents: 12000,
      needsPayment: true,
    });
  });

  it('bolsa integral: valor zero e sem checkout', async () => {
    createContractForUser.mockResolvedValue({
      id: 'c-novo', scholarshipPercent: 100, billingMode: 'MANUAL',
    });

    await paymentService.setScholarshipTerms('ADMIN', 'u1', {
      scholarshipPercent: 100, billingMode: 'MANUAL',
    });

    const arg = sendScholarshipChangedEmail.mock.calls[0][0];
    expect(arg.scholarshipPercent).toBe(100);
    expect(arg.monthlyAmountCents).toBe(0);
    expect(arg.needsPayment).toBe(false);
  });

  it('bolsa removida: volta ao valor cheio', async () => {
    getCurrentContractForUser.mockResolvedValue(contratoAtual(50));
    createContractForUser.mockResolvedValue({
      id: 'c-novo', scholarshipPercent: 0, billingMode: 'MERCADO_PAGO',
    });

    await paymentService.setScholarshipTerms('ADMIN', 'u1', {
      scholarshipPercent: 0, billingMode: 'MERCADO_PAGO',
    });

    expect(sendScholarshipChangedEmail.mock.calls[0][0]).toMatchObject({
      scholarshipPercent: 0,
      monthlyAmountCents: 20000,
    });
  });

  /** A mudança já aconteceu: um e-mail que falha não pode fazê-la parecer falha. */
  it('falha no e-mail não derruba a mudança de bolsa', async () => {
    createContractForUser.mockResolvedValue({
      id: 'c-novo', scholarshipPercent: 30, billingMode: 'MERCADO_PAGO',
    });
    sendScholarshipChangedEmail.mockRejectedValue(new Error('Resend fora do ar'));

    await expect(
      paymentService.setScholarshipTerms('ADMIN', 'u1', {
        scholarshipPercent: 30, billingMode: 'MERCADO_PAGO',
      })
    ).resolves.toMatchObject({ id: 'c-novo' });
  });
});
