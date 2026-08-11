import { db } from '@/lib/db';
import { and, desc, eq, inArray } from 'drizzle-orm';
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

  /** A recusa mais recente do aluno — é o que a tela /fix-payment explica. */
  async findLatestFailedPaymentByUserId(userId: string): Promise<Payment | undefined> {
    return await db.query.paymentsTable.findFirst({
      where: and(eq(paymentsTable.userId, userId), eq(paymentsTable.status, 'FAILED')),
      orderBy: [desc(paymentsTable.dueDate)],
    });
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
