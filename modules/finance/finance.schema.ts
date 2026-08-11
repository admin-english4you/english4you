import { pgTable, uuid, varchar, timestamp, integer, boolean, index } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

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

// Cobranças e assinaturas moraram aqui como contrato de tipos até a integração
// com o Mercado Pago existir. Agora são tabelas de verdade em
// `modules/payment/payment.schema.ts` — `finance` cuida só de pacotes.
