import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Aviso de troca de plano.
 *
 * Trocar o pacote cancela contrato e assinatura e emite um contrato novo — o
 * aluno perde o acesso na hora. O e-mail é o que impede que ele descubra isso
 * sendo expulso para o onboarding sem explicação.
 */

const findRecentSubscriptionsByUserId = vi.fn();
const findLiveSubscriptionsByContractId = vi.fn();
const updateSubscription = vi.fn();
const getUserById = vi.fn();
const getPackageById = vi.fn();
const getCurrentContractForUser = vi.fn();
const cancelContract = vi.fn();
const createContractForUser = vi.fn();
const sendPackageChangedEmail = vi.fn();

vi.mock('./payment.repository', () => ({
  paymentRepository: {
    findRecentSubscriptionsByUserId: (...a: unknown[]) => findRecentSubscriptionsByUserId(...a),
    findLiveSubscriptionsByContractId: (...a: unknown[]) => findLiveSubscriptionsByContractId(...a),
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
    cancelContract: (...a: unknown[]) => cancelContract(...a),
    createContractForUser: (...a: unknown[]) => createContractForUser(...a),
  },
}));
vi.mock('@/lib/resend', () => ({
  sendFirstPaymentConfirmedEmail: vi.fn(),
  sendPackageChangedEmail: (...a: unknown[]) => sendPackageChangedEmail(...a),
}));
vi.mock('@/lib/mercado-pago', () => ({
  preApprovalClient: {}, invoiceClient: {}, paymentClient: null,
  getAppUrl: () => 'https://exemplo.test',
  describeUnusableBackUrl: () => null,
}));

const { paymentService } = await import('./payment.service');

beforeEach(() => {
  vi.clearAllMocks();
  getUserById.mockResolvedValue({ id: 'u1', role: 'STUDENT', name: 'Aluno', email: 'aluno@teste.invalid' });
  getPackageById.mockResolvedValue({ id: 'pkg-novo', name: 'Anual', installmentValueCents: 20000, isActive: true });
  getCurrentContractForUser.mockResolvedValue({
    id: 'c-velho', packageId: 'pkg-antigo', scholarshipPercent: 0, billingMode: 'MERCADO_PAGO',
  });
  findLiveSubscriptionsByContractId.mockResolvedValue([]);
  createContractForUser.mockResolvedValue({
    id: 'c-novo', scholarshipPercent: 0, billingMode: 'MERCADO_PAGO',
  });
});

describe('changeStudentPackage — aviso ao aluno', () => {
  it('avisa com o pacote e o valor novos, pedindo assinatura e pagamento', async () => {
    await paymentService.changeStudentPackage('ADMIN', 'u1', 'pkg-novo');

    expect(sendPackageChangedEmail).toHaveBeenCalledTimes(1);
    expect(sendPackageChangedEmail.mock.calls[0][0]).toMatchObject({
      email: 'aluno@teste.invalid',
      packageName: 'Anual',
      monthlyAmountCents: 20000,
      needsPayment: true,
      actionUrl: 'https://exemplo.test/student',
    });
  });

  it('aplica a bolsa no valor anunciado', async () => {
    getCurrentContractForUser.mockResolvedValue({
      id: 'c-velho', packageId: 'pkg-antigo', scholarshipPercent: 50, billingMode: 'MERCADO_PAGO',
    });
    createContractForUser.mockResolvedValue({
      id: 'c-novo', scholarshipPercent: 50, billingMode: 'MERCADO_PAGO',
    });

    await paymentService.changeStudentPackage('ADMIN', 'u1', 'pkg-novo');

    expect(sendPackageChangedEmail.mock.calls[0][0].monthlyAmountCents).toBe(10000);
  });

  it('bolsista integral não é mandado para o checkout', async () => {
    getCurrentContractForUser.mockResolvedValue({
      id: 'c-velho', packageId: 'pkg-antigo', scholarshipPercent: 100, billingMode: 'MANUAL',
    });
    createContractForUser.mockResolvedValue({
      id: 'c-novo', scholarshipPercent: 100, billingMode: 'MANUAL',
    });

    await paymentService.changeStudentPackage('ADMIN', 'u1', 'pkg-novo');

    const arg = sendPackageChangedEmail.mock.calls[0][0];
    expect(arg.needsPayment).toBe(false);
    expect(arg.monthlyAmountCents).toBe(0);
  });

  /** A troca já aconteceu: um e-mail que falha não pode fazê-la parecer falha. */
  it('falha no e-mail não derruba a troca de plano', async () => {
    sendPackageChangedEmail.mockRejectedValue(new Error('Resend fora do ar'));

    await expect(paymentService.changeStudentPackage('ADMIN', 'u1', 'pkg-novo')).resolves.toMatchObject({
      id: 'c-novo',
    });
  });
});
