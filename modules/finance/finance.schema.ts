import { pgTable, uuid, varchar, timestamp, integer, boolean, index, pgEnum, text } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { usersTable } from '@/modules/user/user.schema';

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

// Cobranças e assinaturas recorrentes vivem em `modules/payment/payment.schema.ts`:
// são geradas pelo Mercado Pago, não pela escola. O que segue abaixo é a outra
// metade do financeiro — o que o admin lança à mão.

/**
 * Entra ou sai dinheiro. O VALOR é sempre positivo (ver `amountCents`); é este
 * campo que dá o sinal, para não existir "EXPENSE de -100" (duplo negativo).
 */
export const financialEntryTypeEnumDb = pgEnum('financial_entry_type', ['INCOME', 'EXPENSE']);

/**
 * Categoria do lançamento. Enum, e não texto livre, porque é isto que permite
 * somar por categoria sem depender de o admin digitar "Aluguel" sempre igual.
 * As quatro primeiras são de entrada, as demais de saída — a UI filtra a lista
 * conforme o tipo escolhido (ver `CATEGORIES_BY_TYPE` em finance.utils.ts).
 */
export const financialEntryCategoryEnumDb = pgEnum('financial_entry_category', [
  'TUITION',
  'ENROLLMENT',
  'MATERIAL',
  'OTHER_INCOME',
  'TEACHER_PAYOUT',
  'RENT',
  'SOFTWARE',
  'MARKETING',
  'TAX',
  'OTHER_EXPENSE',
]);

/**
 * Lançamento financeiro manual — o livro-caixa da escola.
 *
 * Complementa (não substitui) a tabela `payments`: aquela guarda o que o
 * Mercado Pago cobrou sozinho, esta guarda tudo que passa por fora dele —
 * mensalidade paga em PIX, taxa de matrícula, repasse ao professor, aluguel,
 * imposto. A visão geral de /admin/finance soma as duas.
 *
 * NÃO existe coluna de status: "está pago?" é `paidAt !== null`, e "está
 * vencido?" é `paidAt === null && dueDate < hoje` (ver `deriveEntryStatus`).
 * Uma coluna de status separada poderia divergir de `paidAt` — dizer PAID com
 * `paidAt` nulo — e num livro-caixa isso é um erro que ninguém percebe.
 */
export const financialEntriesTable = pgTable('financial_entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: financialEntryTypeEnumDb('type').notNull(),
  category: financialEntryCategoryEnumDb('category').notNull(),
  description: varchar('description', { length: 255 }).notNull(),
  // Texto livre e NÃO uma FK de propósito: a contraparte pode não ser usuário
  // da plataforma (locador, contador, fornecedor de material).
  counterparty: varchar('counterparty', { length: 255 }),
  // Inteiro em centavos, sempre positivo — mesma regra de `installmentValueCents`.
  amountCents: integer('amount_cents').notNull(),
  // Data de competência: quando venceu (a pagar) ou quando aconteceu (já pago).
  dueDate: timestamp('due_date').notNull(),
  // Null = em aberto. Uma dívida é só um lançamento EXPENSE com `paidAt` nulo.
  paidAt: timestamp('paid_at'),
  method: varchar('method', { length: 60 }),
  notes: text('notes'),
  // Auditoria: quem lançou. `set null` para o histórico sobreviver à exclusão
  // do admin que digitou.
  createdById: uuid('created_by_id').references(() => usersTable.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('financial_entries_due_date_idx').on(table.dueDate),
  index('financial_entries_paid_at_idx').on(table.paidAt),
  index('financial_entries_type_idx').on(table.type),
]);

export const FinancialEntryTypeEnum = z.enum(financialEntryTypeEnumDb.enumValues);
export const FinancialEntryCategoryEnum = z.enum(financialEntryCategoryEnumDb.enumValues);

export const FinancialEntrySchema = createSelectSchema(financialEntriesTable);
export const InsertFinancialEntrySchema = createInsertSchema(financialEntriesTable);

/**
 * Datas trafegam como dayKey (`YYYY-MM-DD`), o mesmo formato que o resto do
 * app usa: um `<input type="date">` já devolve exatamente isso, e o Service
 * converte com `dayKeyToDate` (meio-dia UTC), que é como este projeto evita
 * que um lançamento do dia 1º apareça no mês anterior por fuso horário.
 */
const DayKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe uma data válida');

/** String vazia vinda de input opcional vira `null`, nunca `""` no banco. */
const OptionalText = z
  .string()
  .trim()
  .max(255)
  .optional()
  .transform((value) => (value ? value : null));

const entryFields = {
  type: FinancialEntryTypeEnum,
  category: FinancialEntryCategoryEnum,
  description: z.string().trim().min(2, 'Descreva o lançamento'),
  counterparty: OptionalText,
  amountCents: z.number().int().positive('Informe um valor maior que zero'),
  dueDate: DayKeySchema,
  paidAt: DayKeySchema.nullish(),
  method: OptionalText,
  notes: z.string().trim().max(2000).optional().transform((value) => (value ? value : null)),
};

export const CreateFinancialEntrySchema = z.object(entryFields);

export const UpdateFinancialEntrySchema = z.object({
  entryId: z.uuid(),
  ...entryFields,
});

export const DeleteFinancialEntrySchema = z.object({
  entryId: z.uuid(),
});

/** Alterna liquidado/em aberto sem abrir o formulário inteiro. */
export const SettleFinancialEntrySchema = z.object({
  entryId: z.uuid(),
  paidAt: DayKeySchema.nullable(),
});
