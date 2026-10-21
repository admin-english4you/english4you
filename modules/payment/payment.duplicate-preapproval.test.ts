import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Duas assinaturas do MP para a MESMA matrícula (o aluno abriu o checkout duas
 * vezes e autorizou os dois): o caso real que cobrou em dobro e deixou o banco
 * apontando para a assinatura errada.
 */

const findSubscriptionByMpPreapprovalId = vi.fn();
const findSubscriptionById = vi.fn();
const updateSubscription = vi.fn();
const preapprovalGet = vi.fn();
const preapprovalUpdate = vi.fn();

vi.mock('./payment.repository', () => ({
  paymentRepository: {
    findSubscriptionByMpPreapprovalId: (...a: unknown[]) => findSubscriptionByMpPreapprovalId(...a),
    findSubscriptionById: (...a: unknown[]) => findSubscriptionById(...a),
    updateSubscription: (...a: unknown[]) => updateSubscription(...a),
  },
}));
vi.mock('@/modules/user/user.service', () => ({ userService: {} }));
vi.mock('@/modules/finance/finance.service', () => ({ financeService: {} }));
vi.mock('@/modules/contract/contract.service', () => ({ contractService: {} }));
vi.mock('@/lib/mercado-pago', () => ({
  preApprovalClient: {
    get: (...a: unknown[]) => preapprovalGet(...a),
    update: (...a: unknown[]) => preapprovalUpdate(...a),
  },
  paymentClient: null,
  invoiceClient: null,
  getAppUrl: () => 'https://exemplo.test',
  describeUnusableBackUrl: () => null,
}));

const { paymentService } = await import('./payment.service');

const future = new Date(Date.now() + 90 * 24 * 3600 * 1000);

function sub(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sub-1', userId: 'user-1', status: 'AUTHORIZED', mpPreapprovalId: 'pre-A',
    endDate: future, nextPaymentDate: null, paymentMethodId: null, canceledAt: null,
    replacesSubscriptionId: null, ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  findSubscriptionById.mockResolvedValue(undefined);
  preapprovalUpdate.mockResolvedValue({});
});

describe('preapproval duplicado para a mesma matrícula', () => {
  it('cancela o novo no MP e não mexe na linha quando o registrado segue autorizado', async () => {
    findSubscriptionByMpPreapprovalId.mockResolvedValue(undefined);
    findSubscriptionById.mockResolvedValue(sub());
    preapprovalGet.mockImplementation(async ({ id }: { id: string }) =>
      id === 'pre-B'
        ? { status: 'authorized', external_reference: 'sub-1' }
        : { status: 'authorized' }
    );

    await paymentService.syncPreapprovalFromWebhook('pre-B');

    expect(preapprovalUpdate).toHaveBeenCalledWith({ id: 'pre-B', body: { status: 'cancelled' } });
    expect(updateSubscription).not.toHaveBeenCalled();
  });

  it('ignora um duplicado pausado/pendente: não sobrescreve o status da linha', async () => {
    findSubscriptionByMpPreapprovalId.mockResolvedValue(undefined);
    findSubscriptionById.mockResolvedValue(sub());
    preapprovalGet.mockResolvedValue({ status: 'paused', external_reference: 'sub-1' });

    await paymentService.syncPreapprovalFromWebhook('pre-B');

    expect(preapprovalUpdate).not.toHaveBeenCalled();
    expect(updateSubscription).not.toHaveBeenCalled();
  });

  it('adota o novo quando o registrado já não está vivo no MP', async () => {
    findSubscriptionByMpPreapprovalId.mockResolvedValue(undefined);
    findSubscriptionById.mockResolvedValue(sub({ status: 'PENDING' }));
    preapprovalGet.mockImplementation(async ({ id }: { id: string }) =>
      id === 'pre-B'
        ? { status: 'authorized', external_reference: 'sub-1' }
        : { status: 'cancelled' }
    );

    await paymentService.syncPreapprovalFromWebhook('pre-B');

    expect(preapprovalUpdate).not.toHaveBeenCalled();
    expect(updateSubscription).toHaveBeenCalledWith('sub-1', { mpPreapprovalId: 'pre-B' });
    expect(updateSubscription).toHaveBeenCalledWith(
      'sub-1',
      expect.objectContaining({ status: 'AUTHORIZED' })
    );
  });

  it('adota o id quando a resposta do POST se perdeu (linha sem id)', async () => {
    findSubscriptionByMpPreapprovalId.mockResolvedValue(undefined);
    findSubscriptionById.mockResolvedValue(sub({ status: 'PENDING', mpPreapprovalId: null }));
    preapprovalGet.mockResolvedValue({ status: 'authorized', external_reference: 'sub-1' });

    await paymentService.syncPreapprovalFromWebhook('pre-B');

    expect(updateSubscription).toHaveBeenCalledWith('sub-1', { mpPreapprovalId: 'pre-B' });
  });

  it('o preapproval registrado segue o fluxo normal (pausa chega ao banco)', async () => {
    findSubscriptionByMpPreapprovalId.mockResolvedValue(sub());
    preapprovalGet.mockResolvedValue({ status: 'paused' });

    await paymentService.syncPreapprovalFromWebhook('pre-A');

    expect(preapprovalUpdate).not.toHaveBeenCalled();
    expect(updateSubscription).toHaveBeenCalledWith(
      'sub-1',
      expect.objectContaining({ status: 'PAUSED' })
    );
  });
});
