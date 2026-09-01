import { pgTable, uuid, varchar, timestamp, integer, pgEnum, index, uniqueIndex, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { usersTable } from '@/modules/user/user.schema';
import { contractsTable } from '@/modules/contract/contract.schema';
import { packagesTable } from '@/modules/finance/finance.schema';

/**
 * SubscriptionStatusEnum (Status da assinatura recorrente no Mercado Pago)
 *
 * NÃO é espelho 1:1 dos status do MP (`pending|authorized|paused|cancelled`):
 * `PAYMENT_FAILED` é nosso. Existe porque é ele que torna o portão de acesso do
 * `(hub)/layout.tsx` uma única query indexada — sem ele, decidir "este aluno
 * está inadimplente?" exigiria varrer a tabela de cobranças a cada navegação.
 *
 * PENDING: linha criada, o aluno ainda não autorizou o cartão no checkout do MP.
 * AUTHORIZED: assinatura ativa e em dia. Acesso liberado.
 * PAYMENT_FAILED: uma cobrança foi recusada (sem limite, cartão inválido). Acesso bloqueado.
 * PAUSED: o MP pausou a assinatura após esgotar as tentativas de cobrança. Acesso bloqueado.
 * CANCELLED: encerrada — contrato cancelado, troca de pacote ou troca de cartão.
 * COMPLETED: chegou ao `endDate` com tudo pago. O curso acabou; não bloqueia.
 */
export const subscriptionStatusEnumDb = pgEnum('subscription_status', [
  'PENDING',
  'AUTHORIZED',
  'PAYMENT_FAILED',
  'PAUSED',
  'CANCELLED',
  'COMPLETED',
]);

/**
 * PaymentStatusEnum (Status de UMA cobrança já gerada pelo Mercado Pago)
 *
 * Só existem linhas para cobranças que o MP efetivamente gerou — não
 * pré-geramos parcelas futuras. Por isso não há `OVERDUE` aqui: "aluno
 * inadimplente" é estado da assinatura, não de uma cobrança.
 *
 * PENDING: o MP agendou/está processando a cobrança.
 * PAID: pagamento aprovado.
 * FAILED: recusado — `statusDetail` guarda o motivo mostrado em /fix-payment.
 * REFUNDED: estornado.
 * CANCELED: a escola desativou o aluno antes de a cobrança rodar. É NOSSO
 *   estado, não do MP: cancelar o preapproval impede o MP de cobrar, mas as
 *   cobranças que ele já havia agendado continuariam como PENDING para
 *   sempre, aparecendo como dívida viva de um aluno que não estuda mais.
 */
export const paymentStatusEnumDb = pgEnum('payment_status', [
  'PENDING',
  'PAID',
  'FAILED',
  'REFUNDED',
  'CANCELED',
]);

/** Por que uma assinatura foi cancelada — usado para auditoria e para o texto na UI. */
export const cancelReasonEnumDb = pgEnum('subscription_cancel_reason', [
  'CONTRACT_CANCELED',
  'PACKAGE_CHANGED',
  'CARD_REPLACED',
  'ADMIN',
]);

/**
 * A assinatura recorrente de um aluno — um `preapproval` do Mercado Pago.
 *
 * Criamos a linha ANTES de chamar o MP e usamos o `id` dela como
 * `external_reference`: assim o webhook sempre consegue voltar pra cá, e uma
 * falha no POST deixa apenas uma linha PENDING reaproveitável (o driver
 * neon-http não tem transação interativa — ver lib/db.ts).
 *
 * `amountCents` é um SNAPSHOT do pacote no momento da criação, no mesmo espírito
 * do `contentSnapshot` do contrato: editar o pacote depois não pode alterar o
 * valor de uma assinatura já autorizada.
 */
export const studentSubscriptionsTable = pgTable('student_subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  contractId: uuid('contract_id').notNull().references(() => contractsTable.id, { onDelete: 'restrict' }),
  packageId: uuid('package_id').notNull().references(() => packagesTable.id, { onDelete: 'restrict' }),
  // Null entre a criação da linha e a resposta do POST /preapproval.
  mpPreapprovalId: varchar('mp_preapproval_id', { length: 64 }),
  status: subscriptionStatusEnumDb('status').notNull().default('PENDING'),
  amountCents: integer('amount_cents').notNull(),
  frequencyMonths: integer('frequency_months').notNull().default(1),
  startDate: timestamp('start_date').notNull(),
  // startDate + package.durationInMonths. Vai como `auto_recurring.end_date`:
  // é o MP que encerra a recorrência ao fim do pacote, não um cron nosso.
  endDate: timestamp('end_date').notNull(),
  nextPaymentDate: timestamp('next_payment_date'),
  // Espelhados do MP só para exibição na aba de pagamentos ("Mastercard •••• 1234").
  paymentMethodId: varchar('payment_method_id', { length: 50 }),
  cardLastFour: varchar('card_last_four', { length: 4 }),
  initPoint: varchar('init_point', { length: 500 }),
  // Troca de cartão: a assinatura nova aponta pra que ela substitui. A antiga só
  // é cancelada quando o webhook confirmar que a nova ficou AUTHORIZED — nunca
  // deixamos o aluno sem nenhuma assinatura viva no meio do caminho.
  replacesSubscriptionId: uuid('replaces_subscription_id').references((): AnyPgColumn => studentSubscriptionsTable.id, { onDelete: 'set null' }),
  canceledAt: timestamp('canceled_at'),
  cancelReason: cancelReasonEnumDb('cancel_reason'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('student_subscriptions_user_id_idx').on(table.userId),
  index('student_subscriptions_status_idx').on(table.status),
  index('student_subscriptions_contract_id_idx').on(table.contractId),
  uniqueIndex('student_subscriptions_mp_preapproval_uq').on(table.mpPreapprovalId),
]);

/**
 * Uma cobrança recorrente gerada pelo Mercado Pago (`/authorized_payments`, que
 * o SDK chama de "invoice"). Uma linha por cobrança que existiu de fato.
 *
 * `mpAuthorizedPaymentId` é a âncora de idempotência: o MP reenvia o mesmo
 * evento em atualizações de status (agendada → processada → recusada), e o
 * upsert por essa coluna faz cada reenvio atualizar a linha em vez de duplicar.
 *
 * `userId` é desnormalizado de propósito — a listagem da aba de pagamentos
 * atravessa várias assinaturas (o aluno pode ter trocado de cartão) e não deve
 * precisar de join para isso.
 */
export const paymentsTable = pgTable('payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  subscriptionId: uuid('subscription_id').notNull().references(() => studentSubscriptionsTable.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  mpAuthorizedPaymentId: varchar('mp_authorized_payment_id', { length: 64 }).notNull(),
  mpPaymentId: varchar('mp_payment_id', { length: 64 }),
  amountCents: integer('amount_cents').notNull(),
  status: paymentStatusEnumDb('status').notNull().default('PENDING'),
  // Código cru do MP (ex: `cc_rejected_insufficient_amount`) — traduzido em
  // payment.utils.ts para virar o texto que o aluno lê em /fix-payment.
  statusDetail: varchar('status_detail', { length: 100 }),
  dueDate: timestamp('due_date').notNull(),
  paidAt: timestamp('paid_at'),
  retryAttempt: integer('retry_attempt').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('payments_user_id_idx').on(table.userId),
  index('payments_subscription_id_idx').on(table.subscriptionId),
  uniqueIndex('payments_mp_authorized_payment_uq').on(table.mpAuthorizedPaymentId),
]);

export const SubscriptionStatusEnum = z.enum(subscriptionStatusEnumDb.enumValues);
export const PaymentStatusEnum = z.enum(paymentStatusEnumDb.enumValues);
export const CancelReasonEnum = z.enum(cancelReasonEnumDb.enumValues);

export const StudentSubscriptionSchema = createSelectSchema(studentSubscriptionsTable);
export const InsertStudentSubscriptionSchema = createInsertSchema(studentSubscriptionsTable);
export const PaymentSchema = createSelectSchema(paymentsTable);
export const InsertPaymentSchema = createInsertSchema(paymentsTable);

/**
 * Estado de acesso do aluno, resolvido pelo service e consumido pelos layouts.
 *
 * OK: pode usar a plataforma.
 * NEEDS_ONBOARDING: falta assinar contrato e/ou contratar o pagamento.
 * BLOCKED: inadimplente numa cobrança do Mercado Pago — conserta em /fix-payment.
 * DEACTIVATED: a escola desativou a conta. Só um admin reverte; não há tela de
 *   autoatendimento. Existe como estado próprio porque desativar precisa
 *   bloquear TAMBÉM quem não tem assinatura nenhuma para cancelar (bolsista
 *   integral, aluno de cobrança manual) — antes disso, o bloqueio era só um
 *   efeito colateral do cancelamento da assinatura.
 */
export const AccessStateEnum = z.enum(['OK', 'NEEDS_ONBOARDING', 'BLOCKED', 'DEACTIVATED']);

/** Troca de pacote (admin): cancela a assinatura atual e reemite o contrato. */
export const ChangeStudentPackageSchema = z.object({
  userId: z.uuid(),
  packageId: z.uuid(),
});

/**
 * Apaga a conta PERMANENTEMENTE (Neon + Firebase Auth), depois de cancelar
 * qualquer assinatura viva no Mercado Pago.
 *
 * `confirmEmail` é validado no SERVIÇO contra o e-mail real do usuário — não
 * é só UX de "digite pra confirmar" na tela; é a última trava antes de uma
 * operação irreversível, e não pode depender só do que o cliente mandou.
 */
export const DeleteUserAccountSchema = z.object({
  userId: z.uuid(),
  confirmEmail: z.string().trim().min(1, 'Digite o e-mail da conta para confirmar.'),
});

/**
 * Payload do webhook do Mercado Pago. Dado externo — validação estrita, como
 * manda `.agents/skills/route-writer.md`.
 *
 * `type` é passthrough de propósito: o MP envia tópicos que não assinamos
 * (`payment`, `merchant_order`) e a rota precisa ignorá-los com 200, não
 * rejeitá-los com 400 — senão o MP passa a reenfileirar entregas válidas.
 */
export const MercadoPagoWebhookSchema = z.object({
  type: z.string().min(1),
  action: z.string().optional(),
  data: z.object({ id: z.union([z.string(), z.number()]).transform(String) }),
});
