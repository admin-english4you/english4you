import { paymentRepository } from './payment.repository';
import { contractService } from '@/modules/contract/contract.service';
import { financeService } from '@/modules/finance/finance.service';
import { userService } from '@/modules/user/user.service';
import { AppError } from '@/lib/errors';
import {
  describeUnusableBackUrl,
  getAppUrl,
  invoiceClient,
  paymentClient,
  preApprovalClient,
} from '@/lib/mercado-pago';
import {
  amountToCents,
  centsToAmount,
  mapMpPaymentStatus,
  mapMpPreapprovalStatus,
  normalizeCardLastFour,
} from './payment.utils';
import type { Role } from '@/modules/user/user.types';
import type { Contract } from '@/modules/contract/contract.types';
import { toDayKey, todayKey } from '@/lib/date';
import type {
  AccessCheck,
  BillingView,
  CancelReason,
  OnboardingState,
  Payment,
  StudentFinancialSummary,
  StudentSubscription,
  SubscriptionStatus,
} from './payment.types';

/**
 * Service de pagamentos — assinatura recorrente por cartão via Mercado Pago.
 *
 * Depende de `contractService`, `financeService` e `userService`, e NUNCA o
 * contrário: é este módulo que orquestra as operações que tocam contrato E
 * cobrança ao mesmo tempo (`cancelContractAndSubscription`,
 * `changeStudentPackage`). Isso mantém a árvore de imports acíclica e garante
 * que nenhum caminho cancele um contrato deixando a cobrança viva.
 *
 * Os métodos `*FromWebhook` não têm RBAC por design — são chamados apenas de
 * `app/api/webhooks/mercadopago`, nunca de uma request com sessão de usuário
 * (mesma convenção de `webhook-event.service.ts`).
 */

function assertAdmin(actingRole: Role) {
  if (actingRole !== 'ADMIN') {
    throw new AppError('Apenas administradores podem gerenciar assinaturas.');
  }
}

function assertMercadoPagoConfigured() {
  if (!preApprovalClient || !invoiceClient) {
    throw new AppError(
      'A integração de pagamentos não está configurada. Avise a secretaria da escola.'
    );
  }
}

/**
 * Erro do SDK do MP → mensagem que o aluno pode ler, com o original no log.
 *
 * Separa os dois casos porque a orientação ao aluno é oposta: um 5xx ou queda de
 * rede passa sozinho e vale tentar de novo; um 4xx é payload ou credencial
 * errada do NOSSO lado, e mandar o aluno "tentar em alguns minutos" faz ele
 * insistir para sempre num erro que só um humano conserta.
 */
function throwMercadoPagoError(operation: string, error: unknown): never {
  console.error(`[MercadoPago] Falha em ${operation}:`, error);

  const status = (error as { status?: number })?.status;
  const isOurFault = typeof status === 'number' && status >= 400 && status < 500 && status !== 429;

  if (isOurFault) {
    const detail = (error as { message?: string })?.message?.trim();
    // O texto do MP vem sem pontuação final; sem o ponto, a frase emenda na
    // seguinte ("...same user Avise a secretaria").
    const suffix = detail ? `: ${detail.replace(/\.?$/, '.')}` : '.';
    throw new AppError(
      `A integração de pagamentos está mal configurada${suffix} Avise a secretaria da escola.`
    );
  }

  throw new AppError(
    'Não conseguimos falar com o Mercado Pago agora. Tente novamente em alguns minutos.'
  );
}

/** Quantas assinaturas recentes o portão de acesso examina — ver `getAccessState`. */
const ACCESS_LOOKBACK = 5;

/**
 * Estados terminais: uma vez aqui, nenhum webhook do Mercado Pago pode tirar a
 * assinatura de volta.
 *
 * O guard existe porque o MP entrega eventos fora de ordem e com atraso: uma
 * cobrança aprovada minutos antes de o admin cancelar o contrato chega DEPOIS
 * do cancelamento, e sem esta checagem ressuscitaria a assinatura como
 * `AUTHORIZED` — devolvendo acesso a um aluno que não é mais aluno.
 */
const TERMINAL_STATUSES: readonly SubscriptionStatus[] = ['CANCELLED', 'COMPLETED'];

function isTerminal(status: SubscriptionStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export const paymentService = {
  // ---------------------------------------------------------------------------
  // Portão de acesso
  // ---------------------------------------------------------------------------

  /**
   * Decide se o aluno pode usar a plataforma. Roda no `(hub)/layout.tsx`, a cada
   * navegação — por isso é uma única query indexada por `user_id`.
   *
   * Examina as últimas assinaturas (e não só a mais recente) porque durante a
   * troca de cartão duas coexistem de propósito: a nova `PENDING` e a antiga
   * ainda viva. Olhar só a mais recente expulsaria para `/onboarding` um aluno
   * que está com a assinatura antiga em pleno funcionamento.
   *
   * A ordem das regras importa:
   * 1. qualquer uma AUTHORIZED → em dia, libera;
   * 2. qualquer uma inadimplente → bloqueia (mesmo que já exista uma nova PENDING
   *    a caminho, o aluno precisa terminar o conserto em /fix-payment);
   * 3. a mais recente PENDING/CANCELLED → precisa (re)contratar;
   * 4. sobrou COMPLETED → o curso acabou, não é motivo para bloquear.
   */
  async getAccessState(userId: string): Promise<AccessCheck> {
    const subscriptions = await paymentRepository.findRecentSubscriptionsByUserId(
      userId,
      ACCESS_LOOKBACK
    );

    if (subscriptions.length === 0) {
      return { state: 'NEEDS_ONBOARDING', subscription: null, lastFailure: null };
    }

    const authorized = subscriptions.find((s) => s.status === 'AUTHORIZED');
    if (authorized) {
      return { state: 'OK', subscription: authorized, lastFailure: null };
    }

    const delinquent = subscriptions.find(
      (s) => s.status === 'PAYMENT_FAILED' || s.status === 'PAUSED'
    );
    if (delinquent) {
      const lastFailure = await paymentRepository.findLatestFailedPaymentByUserId(userId);
      return { state: 'BLOCKED', subscription: delinquent, lastFailure: lastFailure ?? null };
    }

    const latest = subscriptions[0];
    if (latest.status === 'COMPLETED') {
      return { state: 'OK', subscription: latest, lastFailure: null };
    }

    return { state: 'NEEDS_ONBOARDING', subscription: latest, lastFailure: null };
  },

  // ---------------------------------------------------------------------------
  // Onboarding e checkout (aluno)
  // ---------------------------------------------------------------------------

  /** Em que passo o wizard de /onboarding deve abrir. */
  async getOnboardingState(userId: string): Promise<OnboardingState> {
    const contracts = await contractService.getMyContracts(userId);
    const contract =
      contracts.find((c) => c.status === 'PENDING_SIGNATURE') ??
      contracts.find((c) => c.status === 'ACTIVE') ??
      null;

    const pkg = contract?.packageId
      ? (await financeService.getPackageById(contract.packageId)) ?? null
      : null;

    const subscriptions = await paymentRepository.findRecentSubscriptionsByUserId(
      userId,
      ACCESS_LOOKBACK
    );
    const pendingSubscription = subscriptions.find((s) => s.status === 'PENDING') ?? null;
    const hasLiveBilling = subscriptions.some(
      (s) => s.status === 'AUTHORIZED' || s.status === 'COMPLETED'
    );

    return {
      contract,
      pkg,
      needsContract: !contract || contract.status === 'PENDING_SIGNATURE',
      needsPayment: !hasLiveBilling,
      pendingSubscription,
    };
  },

  /**
   * Cria (ou retoma) a assinatura no Mercado Pago e devolve a URL de checkout.
   *
   * A linha local nasce ANTES da chamada ao MP e o `id` dela vai como
   * `external_reference`: se o POST falhar ou a resposta se perder, sobra apenas
   * uma linha `PENDING` que a próxima tentativa reaproveita — nunca um
   * preapproval órfão no MP que ninguém consegue relacionar a um aluno. Não há
   * transação porque o driver neon-http não tem sessão interativa (ver lib/db.ts).
   */
  async startSubscriptionCheckout(userId: string): Promise<{ initPoint: string }> {
    assertMercadoPagoConfigured();

    const user = await userService.getUserById(userId);
    if (!user) throw new AppError('Usuário não encontrado.');
    if (user.role !== 'STUDENT') {
      throw new AppError('Apenas alunos possuem assinatura.');
    }

    const subscriptions = await paymentRepository.findRecentSubscriptionsByUserId(
      userId,
      ACCESS_LOOKBACK
    );
    if (subscriptions.some((s) => s.status === 'AUTHORIZED')) {
      throw new AppError('Você já tem uma assinatura ativa.');
    }

    const contract = await contractService.getCurrentContractForUser(userId);
    if (!contract) {
      throw new AppError('Nenhum contrato encontrado. Fale com a secretaria da escola.');
    }
    if (contract.status !== 'ACTIVE') {
      throw new AppError('Assine o contrato antes de configurar o pagamento.');
    }
    if (!contract.packageId || !contract.endDate) {
      throw new AppError('Seu contrato não tem um pacote associado. Fale com a secretaria.');
    }

    const pkg = await financeService.getPackageById(contract.packageId);
    if (!pkg) throw new AppError('Pacote não encontrado.');

    // Retoma um checkout interrompido em vez de criar um preapproval duplicado —
    // mas só se o link ainda estiver vivo. Ver `resumableInitPoint`.
    const existing = subscriptions.find((s) => s.status === 'PENDING');
    const retomavel = existing ? await this.resumableInitPoint(existing) : null;
    if (retomavel) {
      return { initPoint: retomavel };
    }

    const subscription =
      existing ??
      (await paymentRepository.createSubscription({
        userId,
        contractId: contract.id,
        packageId: pkg.id,
        amountCents: pkg.installmentValueCents,
        startDate: contract.startDate,
        endDate: contract.endDate,
        status: 'PENDING',
      }));

    const initPoint = await this.createPreapprovalForSubscription({
      subscription,
      payerEmail: user.email,
      packageName: pkg.name,
      // Primeira cobrança na hora da autorização: sem `startDate`, o MP usa o
      // instante do aceite.
      startDate: null,
    });

    return { initPoint };
  },

  /**
   * Troca de cartão. O MP só permite atualizar o cartão de um preapproval
   * enviando um `card_token_id`, o que exigiria um formulário de cartão dentro
   * do nosso app; em vez disso criamos uma assinatura NOVA e mandamos o aluno
   * pro checkout do MP. A antiga só morre quando o webhook confirmar que a nova
   * ficou autorizada (ver `syncPreapprovalFromWebhook`) — em nenhum momento o
   * aluno fica sem assinatura viva.
   *
   * Quando a troca é por inadimplência, a nova assinatura começa AGORA (a
   * cobrança em atraso é quitada no aceite). Quando é troca voluntária de um
   * cartão em dia, ela começa na próxima data de cobrança — senão o aluno
   * pagaria o mês duas vezes.
   */
  async replaceCard(userId: string): Promise<{ initPoint: string }> {
    assertMercadoPagoConfigured();

    const user = await userService.getUserById(userId);
    if (!user) throw new AppError('Usuário não encontrado.');

    const subscriptions = await paymentRepository.findRecentSubscriptionsByUserId(
      userId,
      ACCESS_LOOKBACK
    );
    const current =
      subscriptions.find((s) => s.status === 'AUTHORIZED') ??
      subscriptions.find((s) => s.status === 'PAYMENT_FAILED' || s.status === 'PAUSED');

    if (!current) {
      throw new AppError('Nenhuma assinatura ativa para trocar o cartão.');
    }

    // Já existe uma troca em andamento: manda pro mesmo checkout, se ele
    // ainda estiver aberto no MP.
    const inFlight = subscriptions.find(
      (s) => s.status === 'PENDING' && s.replacesSubscriptionId === current.id
    );
    const retomavel = inFlight ? await this.resumableInitPoint(inFlight) : null;
    if (retomavel) {
      return { initPoint: retomavel };
    }

    const pkg = await financeService.getPackageById(current.packageId);
    if (!pkg) throw new AppError('Pacote não encontrado.');

    const isDelinquent = current.status !== 'AUTHORIZED';
    const nextChargeDate =
      !isDelinquent && current.nextPaymentDate && current.nextPaymentDate.getTime() > Date.now()
        ? current.nextPaymentDate
        : null;

    const subscription =
      inFlight ??
      (await paymentRepository.createSubscription({
        userId,
        contractId: current.contractId,
        packageId: current.packageId,
        amountCents: current.amountCents,
        startDate: nextChargeDate ?? new Date(),
        endDate: current.endDate,
        status: 'PENDING',
        replacesSubscriptionId: current.id,
      }));

    const initPoint = await this.createPreapprovalForSubscription({
      subscription,
      payerEmail: user.email,
      packageName: pkg.name,
      startDate: nextChargeDate,
    });

    return { initPoint };
  },

  /**
   * Devolve o `init_point` da linha se o checkout dela ainda puder ser
   * concluído; senão limpa a linha para que um preapproval NOVO seja criado.
   *
   * Existe porque reaproveitar o link cegamente prende o aluno num laço: se o
   * cartão foi recusado, o MP recusa a mesma cobrança de novo e acaba
   * cancelando o preapproval — e mandá-lo de volta ao mesmo link só reproduz a
   * recusa, sem nenhuma saída pela interface. Só `pending` do lado do MP
   * significa "dá para terminar este checkout".
   *
   * Limpa `mpPreapprovalId`/`initPoint` em vez de cancelar a linha: o aluno
   * segue sem pagar (`PENDING` continua sendo o estado correto), e a linha é
   * reusada, sem acumular assinatura morta a cada tentativa.
   */
  async resumableInitPoint(subscription: StudentSubscription): Promise<string | null> {
    if (!subscription.initPoint || !subscription.mpPreapprovalId) return null;
    if (!preApprovalClient) return null;

    let status: string | undefined;
    try {
      status = (await preApprovalClient.get({ id: subscription.mpPreapprovalId })).status;
    } catch (error) {
      console.error(
        `[MercadoPago] Não foi possível checar o preapproval ${subscription.mpPreapprovalId}:`,
        error
      );
      // Na dúvida, gera um checkout novo: repetir um link possivelmente morto é
      // pior do que criar um preapproval a mais.
      status = undefined;
    }

    if (status === 'pending') return subscription.initPoint;

    await paymentRepository.updateSubscription(subscription.id, {
      mpPreapprovalId: null,
      initPoint: null,
    });
    return null;
  },

  /**
   * Cria o preapproval no MP e grava id + `init_point` na linha local.
   * Interno — extraído porque o onboarding e a troca de cartão só diferem no
   * `start_date`.
   */
  async createPreapprovalForSubscription(input: {
    subscription: StudentSubscription;
    payerEmail: string;
    packageName: string;
    /** `null` = cobrar no aceite. */
    startDate: Date | null;
  }): Promise<string> {
    if (!preApprovalClient) {
      throw new AppError('A integração de pagamentos não está configurada.');
    }

    const { subscription, payerEmail, packageName, startDate } = input;

    // Checado ANTES da chamada: sem isso, uma env var faltando vira um 400
    // genérico do Mercado Pago que não diz o que consertar.
    const backUrl = `${getAppUrl()}/onboarding/retorno`;
    const unusable = describeUnusableBackUrl(backUrl);
    if (unusable) {
      console.error(`[MercadoPago] back_url inutilizável — ${unusable}`);
      throw new AppError(
        'A integração de pagamentos está sem a URL pública da aplicação (NEXT_PUBLIC_APP_URL). Avise a secretaria da escola.'
      );
    }

    let response;
    try {
      response = await preApprovalClient.create({
        body: {
          reason: `English4You — ${packageName}`,
          external_reference: subscription.id,
          payer_email: payerEmail,
          back_url: backUrl,
          // "pending" = o aluno ainda vai autorizar no checkout. Enviar
          // "authorized" exigiria um card_token_id, que só existe no fluxo com
          // formulário de cartão próprio.
          status: 'pending',
          auto_recurring: {
            frequency: subscription.frequencyMonths,
            frequency_type: 'months',
            transaction_amount: centsToAmount(subscription.amountCents),
            currency_id: 'BRL',
            ...(startDate ? { start_date: startDate.toISOString() } : {}),
            // É o MP quem encerra a recorrência ao fim do pacote — sem isso, a
            // cobrança seguiria indefinidamente depois do contrato acabar.
            end_date: subscription.endDate.toISOString(),
          },
        },
      });
    } catch (error) {
      throwMercadoPagoError('POST /preapproval', error);
    }

    if (!response.id || !response.init_point) {
      console.error('[MercadoPago] Resposta de preapproval sem id/init_point:', response);
      throw new AppError('O Mercado Pago não devolveu o link de pagamento. Tente novamente.');
    }

    await paymentRepository.updateSubscription(subscription.id, {
      mpPreapprovalId: response.id,
      initPoint: response.init_point,
      ...(startDate ? { startDate } : {}),
    });

    return response.init_point;
  },

  /** Assinatura + histórico de cobranças da aba de pagamentos do aluno. */
  async getMyBilling(userId: string): Promise<BillingView> {
    const subscriptions = await paymentRepository.findRecentSubscriptionsByUserId(
      userId,
      ACCESS_LOOKBACK
    );
    const subscription =
      subscriptions.find((s) => s.status === 'AUTHORIZED') ?? subscriptions[0] ?? null;

    const [pkg, payments] = await Promise.all([
      subscription
        ? financeService.getPackageById(subscription.packageId)
        : Promise.resolve(undefined),
      paymentRepository.findPaymentsByUserId(userId),
    ]);

    return { subscription, pkg: pkg ?? null, payments };
  },

  // ---------------------------------------------------------------------------
  // Administração
  // ---------------------------------------------------------------------------

  /**
   * As cobranças mais recentes da escola inteira, para o extrato de
   * /admin/finance. Somente leitura: quem escreve nesta tabela é o webhook.
   */
  async getRecentPayments(actingRole: Role, limit: number): Promise<Payment[]> {
    assertAdmin(actingRole);
    return await paymentRepository.findRecentPayments(limit);
  },

  /** Total recebido via Mercado Pago na janela — entra na receita do mês. */
  async sumPaidInRange(actingRole: Role, from: Date, to: Date): Promise<number> {
    assertAdmin(actingRole);
    return await paymentRepository.sumPaidInRange(from, to);
  },

  /**
   * Situação financeira de um aluno para a ficha em /admin/users/[userId]:
   * assinatura atual, o que já foi pago, o que está em aberto e se a
   * mensalidade DO MÊS CORRENTE já entrou.
   */
  async getStudentFinancialSummary(
    actingRole: Role,
    userId: string
  ): Promise<StudentFinancialSummary> {
    assertAdmin(actingRole);

    const subscriptions = await paymentRepository.findRecentSubscriptionsByUserId(
      userId,
      ACCESS_LOOKBACK
    );
    const subscription =
      subscriptions.find((s) => s.status === 'AUTHORIZED') ?? subscriptions[0] ?? null;

    const [pkg, payments] = await Promise.all([
      subscription ? financeService.getPackageById(subscription.packageId) : Promise.resolve(undefined),
      paymentRepository.findPaymentsByUserId(userId),
    ]);

    // "Pagou o mês corrente?" olha `paidAt` (quando o dinheiro entrou), não
    // `dueDate`: uma parcela de julho quitada em agosto não torna agosto pago.
    const monthPrefix = todayKey().slice(0, 7);
    const currentMonthPayment =
      payments.find(
        (p) => p.status === 'PAID' && p.paidAt && toDayKey(p.paidAt).startsWith(monthPrefix)
      ) ?? null;

    const paid = payments.filter((p) => p.status === 'PAID');
    const open = payments.filter((p) => p.status === 'PENDING' || p.status === 'FAILED');

    return {
      subscription,
      pkg: pkg ?? null,
      payments,
      paidPayments: paid,
      openPayments: open,
      currentMonthPayment,
      totalPaidCents: paid.reduce((sum, p) => sum + p.amountCents, 0),
      openCents: open.reduce((sum, p) => sum + p.amountCents, 0),
    };
  },

  /**
   * Desativa o aluno: conta inativa, assinatura encerrada no Mercado Pago e
   * cobranças ainda não processadas canceladas.
   *
   * Mora aqui, e não em `userService`, pela mesma razão de
   * `cancelContractAndSubscription`: `payment` já depende de `user`, então é
   * deste lado que a composição pode existir sem fechar ciclo de imports.
   *
   * A ordem importa. O preapproval é cancelado ANTES de mexer no nosso banco:
   * se a chamada ao MP falhar, o aluno continua ativo e o admin tenta de novo —
   * o oposto (marcar inativo e falhar no MP) deixaria uma conta desativada
   * continuando a ser cobrada todo mês.
   */
  async deactivateStudent(
    actingRole: Role,
    userId: string
  ): Promise<{ canceledSubscriptions: number; canceledPayments: number }> {
    assertAdmin(actingRole);

    const user = await userService.getUserById(userId);
    if (!user) throw new AppError('Usuário não encontrado.');

    const subscriptions = await paymentRepository.findRecentSubscriptionsByUserId(
      userId,
      ACCESS_LOOKBACK
    );
    const live = subscriptions.filter((s) => !isTerminal(s.status));

    for (const subscription of live) {
      await this.cancelSubscription(subscription, 'ADMIN');
    }

    const canceledPayments = await paymentRepository.cancelPendingPaymentsByUserId(userId);
    await userService.setUserStatus(actingRole, userId, 'Inactive');

    return { canceledSubscriptions: live.length, canceledPayments };
  },

  /**
   * Reativa a conta — e SÓ isso. A assinatura cancelada não volta: o Mercado
   * Pago não reabre um preapproval encerrado, então o aluno passa pelo
   * /onboarding e contrata de novo. É o que o portão de acesso do
   * `(hub)/layout.tsx` já faz sozinho ao ver uma conta sem assinatura viva.
   */
  async reactivateStudent(actingRole: Role, userId: string): Promise<void> {
    assertAdmin(actingRole);
    await userService.setUserStatus(actingRole, userId, 'Active');
  },

  /**
   * Cancela o contrato E a cobrança, nesta ordem. Mora aqui (e não em
   * `contractService`) porque `payment` já depende de `contract` — pôr a
   * chamada do lado de lá fecharia um ciclo de imports.
   *
   * Como não pré-geramos parcelas, "cancelar os pagamentos futuros em aberto" é
   * exatamente cancelar o preapproval: o MP para de gerar cobranças.
   */
  async cancelContractAndSubscription(actingRole: Role, contractId: string): Promise<Contract> {
    assertAdmin(actingRole);

    const contract = await contractService.cancelContract(actingRole, contractId);

    const subscriptions = await paymentRepository.findLiveSubscriptionsByContractId(contractId);
    for (const subscription of subscriptions) {
      await this.cancelSubscription(subscription, 'CONTRACT_CANCELED');
    }

    return contract;
  },

  /**
   * Troca o pacote do aluno: derruba a cobrança atual, cancela o contrato antigo
   * e emite um novo `PENDING_SIGNATURE` com o novo pacote.
   *
   * O contrato precisa ser refeito, e não editado: o `contentSnapshot` assinado
   * tem o valor e a duração antigos escritos dentro dele, e alterar o pacote por
   * baixo deixaria um documento assinado dizendo algo que não vale mais. O aluno
   * volta para `/onboarding` para reassinar e reautorizar no novo valor.
   */
  async changeStudentPackage(
    actingRole: Role,
    userId: string,
    packageId: string
  ): Promise<Contract> {
    assertAdmin(actingRole);

    const user = await userService.getUserById(userId);
    if (!user) throw new AppError('Usuário não encontrado.');
    if (user.role !== 'STUDENT') {
      throw new AppError('Apenas alunos possuem pacote.');
    }

    const pkg = await financeService.getPackageById(packageId);
    if (!pkg) throw new AppError('Pacote não encontrado.');
    if (!pkg.isActive) {
      throw new AppError('Este pacote está arquivado. Reative-o ou escolha outro.');
    }

    const current = await contractService.getCurrentContractForUser(userId);
    if (current?.packageId === packageId) {
      throw new AppError('O aluno já está neste pacote.');
    }

    const subscriptions = current
      ? await paymentRepository.findLiveSubscriptionsByContractId(current.id)
      : [];
    for (const subscription of subscriptions) {
      await this.cancelSubscription(subscription, 'PACKAGE_CHANGED');
    }

    if (current) {
      await contractService.cancelContract(actingRole, current.id);
    }

    return await contractService.createContractForUser(actingRole, userId, packageId);
  },

  /**
   * Cancela uma assinatura no MP e localmente. Best-effort do lado do MP: se a
   * assinatura já estiver cancelada lá (ou o id nunca tiver sido gravado), o
   * nosso lado ainda precisa ficar consistente — o contrário deixaria um aluno
   * bloqueado por uma cobrança que ninguém mais vai processar.
   */
  async cancelSubscription(
    subscription: StudentSubscription,
    reason: CancelReason
  ): Promise<void> {
    if (subscription.mpPreapprovalId && preApprovalClient) {
      try {
        await preApprovalClient.update({
          id: subscription.mpPreapprovalId,
          body: { status: 'cancelled' },
        });
      } catch (error) {
        console.error(
          `[MercadoPago] Falha ao cancelar preapproval ${subscription.mpPreapprovalId}:`,
          error
        );
      }
    }

    await paymentRepository.updateSubscription(subscription.id, {
      status: 'CANCELLED',
      canceledAt: new Date(),
      cancelReason: reason,
    });
  },

  // ---------------------------------------------------------------------------
  // Webhooks — sem RBAC (só a rota app/api/webhooks/mercadopago chama)
  // ---------------------------------------------------------------------------

  /**
   * Sincroniza o estado do preapproval (`subscription_preapproval`).
   *
   * Nunca promove `PAYMENT_FAILED` de volta para `AUTHORIZED`: o MP mantém o
   * preapproval como `authorized` mesmo depois de recusar uma cobrança (ele só
   * pausa após esgotar as tentativas). Confiar nesse status aqui desbloquearia
   * um aluno inadimplente — quem reabre o acesso é `recordAuthorizedPayment...`,
   * ao registrar uma cobrança efetivamente aprovada.
   */
  async syncPreapprovalFromWebhook(mpPreapprovalId: string): Promise<void> {
    if (!preApprovalClient) return;

    let preapproval;
    try {
      preapproval = await preApprovalClient.get({ id: mpPreapprovalId });
    } catch (error) {
      console.error(`[MercadoPago] Falha ao ler preapproval ${mpPreapprovalId}:`, error);
      return;
    }

    // `external_reference` é o id da nossa linha — fallback para o caso de a
    // resposta do POST ter se perdido antes de gravarmos o `mpPreapprovalId`.
    const subscription =
      (await paymentRepository.findSubscriptionByMpPreapprovalId(mpPreapprovalId)) ??
      (preapproval.external_reference
        ? await paymentRepository.findSubscriptionById(preapproval.external_reference)
        : undefined);

    if (!subscription) {
      console.warn(`[MercadoPago] Preapproval ${mpPreapprovalId} sem assinatura correspondente.`);
      return;
    }

    if (isTerminal(subscription.status)) return;

    const mapped = mapMpPreapprovalStatus(preapproval.status);
    if (!mapped) return;

    const nextPaymentDate = preapproval.next_payment_date
      ? new Date(preapproval.next_payment_date)
      : subscription.nextPaymentDate;

    // Contrato chegou ao fim: o MP cancela o preapproval na `end_date`. A data
    // é o que distingue encerramento natural de cancelamento manual.
    const reachedEnd = mapped === 'CANCELLED' && Date.now() >= subscription.endDate.getTime();

    let status = reachedEnd ? ('COMPLETED' as const) : mapped;
    if (subscription.status === 'PAYMENT_FAILED' && status === 'AUTHORIZED') {
      status = 'PAYMENT_FAILED';
    }

    await paymentRepository.updateSubscription(subscription.id, {
      status,
      nextPaymentDate,
      paymentMethodId: preapproval.payment_method_id ?? subscription.paymentMethodId,
      ...(status === 'CANCELLED' && !subscription.canceledAt ? { canceledAt: new Date() } : {}),
    });

    // Troca de cartão concluída: agora que a nova está viva, a antiga pode morrer.
    if (status === 'AUTHORIZED' && subscription.replacesSubscriptionId) {
      const replaced = await paymentRepository.findSubscriptionById(
        subscription.replacesSubscriptionId
      );
      if (replaced && replaced.status !== 'CANCELLED') {
        await this.cancelSubscription(replaced, 'CARD_REPLACED');
      }
    }
  },

  /**
   * Registra uma cobrança recorrente (`subscription_authorized_payment`).
   *
   * Upsert por `mpAuthorizedPaymentId`: o MP reenvia o mesmo evento a cada
   * mudança de status da cobrança (agendada → processada → recusada), e cada
   * reenvio deve atualizar a linha, não criar outra.
   */
  async recordAuthorizedPaymentFromWebhook(mpAuthorizedPaymentId: string): Promise<void> {
    if (!invoiceClient) return;

    let invoice;
    try {
      invoice = await invoiceClient.get({ id: mpAuthorizedPaymentId });
    } catch (error) {
      console.error(
        `[MercadoPago] Falha ao ler authorized_payment ${mpAuthorizedPaymentId}:`,
        error
      );
      return;
    }

    if (!invoice.preapproval_id) {
      console.warn(`[MercadoPago] Cobrança ${mpAuthorizedPaymentId} sem preapproval_id.`);
      return;
    }

    const subscription = await paymentRepository.findSubscriptionByMpPreapprovalId(
      invoice.preapproval_id
    );
    if (!subscription) {
      console.warn(
        `[MercadoPago] Cobrança ${mpAuthorizedPaymentId} de um preapproval desconhecido (${invoice.preapproval_id}).`
      );
      return;
    }

    const status = mapMpPaymentStatus(invoice.status, invoice.payment?.status);
    const dueDate = invoice.debit_date ? new Date(invoice.debit_date) : new Date();
    const amountCents = amountToCents(invoice.transaction_amount) || subscription.amountCents;

    const existing = await paymentRepository.findPaymentByMpAuthorizedPaymentId(
      mpAuthorizedPaymentId
    );

    const fields = {
      status,
      statusDetail: invoice.payment?.status_detail ?? null,
      mpPaymentId: invoice.payment?.id ? String(invoice.payment.id) : null,
      amountCents,
      dueDate,
      paidAt: status === 'PAID' ? new Date() : null,
      retryAttempt: invoice.retry_attempt ?? 0,
    };

    if (existing) {
      await paymentRepository.updatePayment(existing.id, {
        ...fields,
        // Uma cobrança já paga não perde a data original numa reentrega tardia.
        paidAt: existing.paidAt ?? fields.paidAt,
      });
    } else {
      await paymentRepository.createPayment({
        subscriptionId: subscription.id,
        userId: subscription.userId,
        mpAuthorizedPaymentId,
        ...fields,
      });
    }

    // A cobrança fica registrada de qualquer jeito (é histórico financeiro), mas
    // uma assinatura já encerrada não volta a mexer no acesso do aluno.
    if (isTerminal(subscription.status)) return;

    if (status === 'PAID') {
      await paymentRepository.updateSubscription(subscription.id, { status: 'AUTHORIZED' });
      await this.syncCardDetails(subscription.id, fields.mpPaymentId);
    } else if (status === 'FAILED') {
      await paymentRepository.updateSubscription(subscription.id, { status: 'PAYMENT_FAILED' });
    }
  },

  /**
   * Copia bandeira e últimos 4 dígitos do cartão para a assinatura, a partir do
   * pagamento aprovado — o preapproval não expõe esses dados, e é o que a aba de
   * pagamentos mostra ("Mastercard •••• 1234").
   *
   * Best-effort: falhar aqui não pode desfazer o registro de uma cobrança paga.
   */
  async syncCardDetails(subscriptionId: string, mpPaymentId: string | null): Promise<void> {
    if (!mpPaymentId) return;

    if (!paymentClient) return;

    try {
      const payment = await paymentClient.get({ id: mpPaymentId });
      const lastFour = normalizeCardLastFour(payment.card?.last_four_digits);
      if (!lastFour && !payment.payment_method_id) return;

      await paymentRepository.updateSubscription(subscriptionId, {
        cardLastFour: lastFour,
        paymentMethodId: payment.payment_method_id ?? null,
      });
    } catch (error) {
      console.error(`[MercadoPago] Falha ao ler o pagamento ${mpPaymentId}:`, error);
    }
  },
};
