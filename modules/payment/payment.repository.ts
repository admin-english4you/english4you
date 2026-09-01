import { db } from '@/lib/db';
import { and, desc, eq, inArray, gte, lt, isNotNull, sql } from 'drizzle-orm';
import { paymentsTable, studentSubscriptionsTable } from './payment.schema';
import type {
  NewPayment,
  NewStudentSubscription,
  Payment,
  StudentSubscription,
} from './payment.types';

/** Estados em que a assinatura ainda é "a atual" do aluno — nem morta, nem histórica. */
const LIVE_STATUSES = ['PENDING', 'AUTHORIZED', 'PAYMENT_FAILED', 'PAUSED'] as const;

export const paymentRepository = {
  // ---------------------------------------------------------------------------
  // Assinaturas
  // ---------------------------------------------------------------------------

  async findSubscriptionById(id: string): Promise<StudentSubscription | undefined> {
    return await db.query.studentSubscriptionsTable.findFirst({
      where: eq(studentSubscriptionsTable.id, id),
    });
  },

  /**
   * As N assinaturas mais recentes do aluno, da mais nova para a mais velha.
   *
   * É a query que o portão de acesso roda a cada navegação (daí o índice em
   * `user_id`). Devolve VÁRIAS, e não só a última, porque durante a troca de
   * cartão duas assinaturas coexistem de propósito e a decisão de acesso precisa
   * enxergar as duas — ver `paymentService.getAccessState`.
   */
  async findRecentSubscriptionsByUserId(
    userId: string,
    limit: number
  ): Promise<StudentSubscription[]> {
    return await db.query.studentSubscriptionsTable.findMany({
      where: eq(studentSubscriptionsTable.userId, userId),
      orderBy: [desc(studentSubscriptionsTable.createdAt)],
      limit,
    });
  },

  async findSubscriptionByMpPreapprovalId(
    mpPreapprovalId: string
  ): Promise<StudentSubscription | undefined> {
    return await db.query.studentSubscriptionsTable.findFirst({
      where: eq(studentSubscriptionsTable.mpPreapprovalId, mpPreapprovalId),
    });
  },

  async findLiveSubscriptionsByContractId(contractId: string): Promise<StudentSubscription[]> {
    return await db.query.studentSubscriptionsTable.findMany({
      where: and(
        eq(studentSubscriptionsTable.contractId, contractId),
        inArray(studentSubscriptionsTable.status, [...LIVE_STATUSES])
      ),
    });
  },

  /**
   * TODAS as assinaturas do aluno, sem limite — ao contrário de
   * `findRecentSubscriptionsByUserId`, que corta nas N mais recentes de
   * propósito (é a query do portão de acesso, a cada navegação).
   *
   * Existe só para apagar conta: cancelar "as últimas 5" e apagar a conta
   * mesmo assim deixaria uma assinatura antiga, fora do lookback, cobrando no
   * Mercado Pago um aluno que não existe mais no nosso banco — sem nenhuma
   * linha aqui para o admin sequer descobrir que ela existe.
   */
  async findAllSubscriptionsByUserId(userId: string): Promise<StudentSubscription[]> {
    return await db.query.studentSubscriptionsTable.findMany({
      where: eq(studentSubscriptionsTable.userId, userId),
    });
  },

  async createSubscription(data: NewStudentSubscription): Promise<StudentSubscription> {
    const [subscription] = await db.insert(studentSubscriptionsTable).values(data).returning();
    return subscription;
  },

  async updateSubscription(
    id: string,
    data: Partial<
      Pick<
        StudentSubscription,
        | 'mpPreapprovalId'
        | 'status'
        | 'nextPaymentDate'
        | 'paymentMethodId'
        | 'cardLastFour'
        | 'initPoint'
        | 'canceledAt'
        | 'cancelReason'
        | 'startDate'
      >
    >
  ): Promise<StudentSubscription> {
    const [subscription] = await db
      .update(studentSubscriptionsTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(studentSubscriptionsTable.id, id))
      .returning();
    return subscription;
  },

  // ---------------------------------------------------------------------------
  // Cobranças
  // ---------------------------------------------------------------------------

  async findPaymentsByUserId(userId: string): Promise<Payment[]> {
    return await db.query.paymentsTable.findMany({
      where: eq(paymentsTable.userId, userId),
      orderBy: [desc(paymentsTable.dueDate)],
    });
  },

  async findPaymentByMpAuthorizedPaymentId(
    mpAuthorizedPaymentId: string
  ): Promise<Payment | undefined> {
    return await db.query.paymentsTable.findFirst({
      where: eq(paymentsTable.mpAuthorizedPaymentId, mpAuthorizedPaymentId),
    });
  },

  /**
   * As N cobranças mais recentes da escola inteira — alimenta o extrato de
   * /admin/finance, onde elas aparecem lado a lado com os lançamentos manuais.
   */
  async findRecentPayments(limit: number): Promise<Payment[]> {
    return await db.query.paymentsTable.findMany({
      orderBy: [desc(paymentsTable.dueDate)],
      limit,
    });
  },

  /**
   * Total efetivamente RECEBIDO via Mercado Pago na janela.
   *
   * Filtra por `paidAt` (e não por `dueDate`) pelo mesmo motivo do livro-caixa
   * manual: receita do mês é o dinheiro que entrou no mês, não o que venceu nele.
   */
  async sumPaidInRange(from: Date, to: Date): Promise<number> {
    const [row] = await db
      .select({
        totalCents: sql<number>`coalesce(sum(${paymentsTable.amountCents}), 0)::int`,
      })
      .from(paymentsTable)
      .where(
        and(
          eq(paymentsTable.status, 'PAID'),
          isNotNull(paymentsTable.paidAt),
          gte(paymentsTable.paidAt, from),
          lt(paymentsTable.paidAt, to)
        )
      );

    return row?.totalCents ?? 0;
  },

  /** A recusa mais recente do aluno — é o que a tela /fix-payment explica. */
  async findLatestFailedPaymentByUserId(userId: string): Promise<Payment | undefined> {
    return await db.query.paymentsTable.findFirst({
      where: and(eq(paymentsTable.userId, userId), eq(paymentsTable.status, 'FAILED')),
      orderBy: [desc(paymentsTable.dueDate)],
    });
  },

  /**
   * Cancela em bloco as cobranças ainda não processadas do aluno.
   *
   * Só `PENDING` entra: uma cobrança já paga, recusada ou estornada é fato
   * consumado e reescrevê-la apagaria histórico financeiro real.
   */
  async cancelPendingPaymentsByUserId(userId: string): Promise<number> {
    const rows = await db
      .update(paymentsTable)
      .set({ status: 'CANCELED', updatedAt: new Date() })
      .where(and(eq(paymentsTable.userId, userId), eq(paymentsTable.status, 'PENDING')))
      .returning({ id: paymentsTable.id });

    return rows.length;
  },

  async createPayment(data: NewPayment): Promise<Payment> {
    const [payment] = await db.insert(paymentsTable).values(data).returning();
    return payment;
  },

  async updatePayment(
    id: string,
    data: Partial<
      Pick<Payment, 'status' | 'statusDetail' | 'mpPaymentId' | 'paidAt' | 'amountCents' | 'dueDate' | 'retryAttempt'>
    >
  ): Promise<Payment> {
    const [payment] = await db
      .update(paymentsTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(paymentsTable.id, id))
      .returning();
    return payment;
  },
};
