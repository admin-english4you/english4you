import { pgTable, uuid, varchar, timestamp, integer, boolean, index } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

/**
 * PaymentStatusEnum (Status do Pagamento)
 * Crucial para a integração com os Webhooks do Mercado Pago.
 *
 * PENDING: O pagamento foi gerado, mas ainda não foi pago.
 * PAID: O webhook do Mercado Pago confirmou o pagamento. O acesso está liberado.
 * FAILED: O cartão foi recusado (ex: sem limite).
 * OVERDUE: A data de vencimento passou e o aluno não pagou (inadimplente). O sistema pode bloquear o acesso.
 */
export const PaymentStatusEnum = z.enum(['PENDING', 'PAID', 'FAILED', 'OVERDUE']);

/**
 * Pacote comercial: o que o aluno compra na matrícula. Define a duração do
 * contrato, quantas aulas por semana ele tem direito e o valor da mensalidade.
 * É escolhido pelo admin ao cadastrar o aluno e vira a base do Contract.
 *
 * `installmentValueCents` é INTEIRO EM CENTAVOS, nunca `numeric`/float: o
 * `numeric` do Drizzle chega em TS como `string` (o driver preserva precisão),
 * o que espalharia `parseFloat` por todo call-site e faria o `createSelectSchema`
 * emitir `z.string()`; e float quebra soma de parcelas. O sufixo `Cents` no
 * nome é proposital — impede ler `350` como R$ 350.
 */
export const packagesTable = pgTable('packages', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  durationInMonths: integer('duration_in_months').notNull(),
  classesPerWeek: integer('classes_per_week').notNull(),
  installmentValueCents: integer('installment_value_cents').notNull(),
  // Pacote referenciado por contrato nunca é deletado (FK `restrict`);
  // arquivar tira ele do seletor de novo aluno preservando o histórico.
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('packages_is_active_idx').on(table.isActive),
]);

export const PackageSchema = createSelectSchema(packagesTable);
export const InsertPackageSchema = createInsertSchema(packagesTable);

const packageFields = {
  name: z.string().min(2, 'O nome do pacote é obrigatório'),
  durationInMonths: z.number().int().positive('A duração deve ser maior que zero'),
  classesPerWeek: z.number().int().positive('Informe quantas aulas por semana'),
  installmentValueCents: z.number().int().positive('Informe o valor da mensalidade'),
};

export const CreatePackageSchema = z.object(packageFields);

export const UpdatePackageSchema = z.object({
  packageId: z.uuid(),
  ...packageFields,
});

export const ArchivePackageSchema = z.object({
  packageId: z.uuid(),
});

/**
 * Parcelas geradas a partir do contrato. Ainda não persistido — a integração
 * com o Mercado Pago é a próxima etapa; mantido como contrato de tipos.
 */
export const PaymentSchema = z.object({
  id: z.uuid(),
  studentId: z.uuid(),
  contractId: z.uuid(),
  amount: z.number().positive(),
  installmentNumber: z.number().int().positive(),
  totalInstallments: z.number().int().positive(),
  dueDate: z.date(),
  paidAt: z.date().nullable().optional(),
  status: PaymentStatusEnum.default('PENDING'),
  mercadoPagoPaymentId: z.string().optional(),
  mercadoPagoPreferenceId: z.string().optional(),
  invoiceUrl: z.url().optional(),
  createdAt: z.date(),
});
