import { pgTable, uuid, varchar, text, timestamp, integer, boolean, pgEnum, index, uniqueIndex, check } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { usersTable, SigningIdentitySchema } from '@/modules/user/user.schema';
import { packagesTable } from '@/modules/finance/finance.schema';

/**
 * ContractStatusEnum (Status do Contrato)
 * Controla o vínculo legal e o pacote do usuário.
 *
 * PENDING_SIGNATURE: O usuário entrou na plataforma, mas ainda não assinou o termo.
 * ACTIVE: Contrato assinado e vigente. O aluno está estudando / Professor está lecionando.
 * CANCELED: O usuário desistiu ou foi removido.
 * COMPLETED: O período do contrato acabou. O acesso é encerrado até renovação.
 */
export const contractStatusEnumDb = pgEnum('contract_status', [
  'PENDING_SIGNATURE',
  'ACTIVE',
  'CANCELED',
  'COMPLETED',
]);

/**
 * Quem pode assinar um modelo. Deliberadamente NÃO reusa `user_role`, que
 * admitiria um `ADMIN` sem significado aqui — admin não assina contrato.
 */
export const contractTargetRoleEnumDb = pgEnum('contract_target_role', ['STUDENT', 'TEACHER']);

/**
 * Quem cobra a mensalidade deste contrato.
 *
 * MERCADO_PAGO: assinatura recorrente no cartão, gerida pela plataforma.
 * MANUAL: a plataforma NÃO cobra nada — a secretaria acerta por fora (PIX,
 *   dinheiro, boleto avulso) e lança no livro-caixa. É também o modo da bolsa
 *   integral, onde simplesmente não há o que cobrar.
 *
 * Este campo é o interruptor único de "a plataforma cobra este aluno?" — ver o
 * CHECK `contracts_full_scholarship_is_manual` abaixo, que impede o estado
 * incoerente de bolsa 100% com cobrança automática.
 */
export const contractBillingModeEnumDb = pgEnum('contract_billing_mode', ['MERCADO_PAGO', 'MANUAL']);

/** Modelo padrão x modelo de bolsista — são documentos diferentes. */
export const contractTemplateKindEnumDb = pgEnum('contract_template_kind', ['STANDARD', 'SCHOLARSHIP']);

/**
 * Modelo de contrato escrito pelo admin, com variáveis (`{{nome}}`,
 * `{{documento}}`, ...) resolvidas na hora da assinatura — ver contract.utils.ts.
 *
 * Só existe UM modelo ativo por papel (índice único parcial abaixo): é ele que
 * gera os contratos dos novos usuários daquele papel.
 */
export const contractTemplatesTable = pgTable('contract_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  // HTML do TipTap, com os placeholders ainda crus.
  content: text('content').notNull(),
  targetRole: contractTargetRoleEnumDb('target_role').notNull(),
  kind: contractTemplateKindEnumDb('kind').notNull().default('STANDARD'),
  isActive: boolean('is_active').notNull().default(false),
  // Rótulo para humanos ("Contrato do Aluno — v3"). Monotônico por papel.
  //
  // Escopo por PAPEL, e não por (papel, tipo), de propósito: a versão é um
  // rótulo humano, e reiniciar o modelo de bolsista em v1 ao lado de um v5
  // padrão confundiria mais do que ajudaria.
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('contract_templates_target_role_idx').on(table.targetRole),
  // Um só modelo ativo por papel E TIPO, garantido no banco e não apenas no
  // service: o contrato do bolsista sai de um modelo próprio, então padrão e
  // bolsista precisam poder estar ativos ao mesmo tempo.
  uniqueIndex('contract_templates_active_target_uq')
    .on(table.targetRole, table.kind)
    .where(sql`${table.isActive}`),
]);

/**
 * O contrato efetivo de um aluno ou professor.
 *
 * `contentSnapshot` é null enquanto `PENDING_SIGNATURE` (o texto é renderizado
 * ao vivo a partir do modelo) e passa a guardar o HTML final, já com os dados
 * do usuário substituídos, no instante da assinatura. É ele que vale
 * juridicamente: editar o modelo depois nunca altera um contrato assinado.
 *
 * FKs com `restrict`: um contrato assinado jamais pode perder o modelo ou o
 * pacote que o originou.
 */
export const contractsTable = pgTable('contracts', {
  id: uuid('id').defaultRandom().primaryKey(),
  templateId: uuid('template_id').notNull().references(() => contractTemplatesTable.id, { onDelete: 'restrict' }),
  userId: uuid('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  // Nullable: professor assina contrato sem pacote.
  packageId: uuid('package_id').references(() => packagesTable.id, { onDelete: 'restrict' }),
  status: contractStatusEnumDb('status').notNull().default('PENDING_SIGNATURE'),
  contentSnapshot: text('content_snapshot'),
  startDate: timestamp('start_date').notNull(),
  // Derivado de `startDate + package.durationInMonths` na criação. Guardado em
  // coluna para que "este contrato venceu?" e a futura geração de parcelas
  // sejam query pura, sem recalcular a partir do pacote.
  endDate: timestamp('end_date'),
  signedAt: timestamp('signed_at'),
  // O nome digitado na assinatura é o artefato de auditoria (equivalente à
  // rubrica); fica em coluna própria para ser consultável, e não só
  // recuperável parseando o snapshot.
  signedName: varchar('signed_name', { length: 255 }),
  // 45 = comprimento máximo textual de um IPv6.
  signedByIp: varchar('signed_by_ip', { length: 45 }),
  // PDF gerado — fora de escopo por enquanto, sempre null.
  documentUrl: varchar('document_url', { length: 500 }),

  // ---------------------------------------------------------------------------
  // Bolsa de estudos.
  //
  // Mora AQUI, e não em `users`, porque é um termo desta matrícula e não uma
  // característica permanente da pessoa: o mesmo aluno pode renovar sem bolsa
  // no semestre seguinte, e o histórico precisa continuar respondendo "sob
  // quais condições ele estudou naquele período".
  //
  // O pacote continua sendo a tabela de preços intocada — a bolsa é o desvio.
  // Por isso não existe pacote de R$ 0 nem coluna com o valor já descontado
  // (derivável de `packageId` + `scholarshipPercent`; ver
  // `applyScholarshipDiscount`). O valor efetivo é congelado onde importa:
  // em `student_subscriptions.amountCents` e no `contentSnapshot` assinado.
  // ---------------------------------------------------------------------------
  scholarshipPercent: integer('scholarship_percent').notNull().default(0),
  billingMode: contractBillingModeEnumDb('billing_mode').notNull().default('MERCADO_PAGO'),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('contracts_user_id_idx').on(table.userId),
  index('contracts_status_idx').on(table.status),
  check('contracts_scholarship_percent_range', sql`${table.scholarshipPercent} between 0 and 100`),
  // Bolsa integral com cobrança automática é estado impossível: não há o que
  // cobrar. Garantir isso no banco é o que permite ao resto do sistema decidir
  // "a plataforma cobra este aluno?" lendo só `billingMode` — sem essa trava,
  // cada portão teria que repetir `percent === 100 || mode === 'MANUAL'`.
  check(
    'contracts_full_scholarship_is_manual',
    sql`${table.scholarshipPercent} < 100 or ${table.billingMode} = 'MANUAL'`
  ),
]);

export const ContractStatusEnum = z.enum(contractStatusEnumDb.enumValues);
export const ContractTargetRoleEnum = z.enum(contractTargetRoleEnumDb.enumValues);
export const ContractBillingModeEnum = z.enum(contractBillingModeEnumDb.enumValues);
export const ContractTemplateKindEnum = z.enum(contractTemplateKindEnumDb.enumValues);

/**
 * Termos de bolsa de um contrato.
 *
 * A regra "100% ⇒ MANUAL" é validada aqui além do CHECK do banco para que o
 * erro chegue ao formulário como mensagem de campo, e não como uma violação de
 * constraint crua vinda do Postgres.
 */
export const ScholarshipTermsSchema = z
  .object({
    scholarshipPercent: z.number().int().min(0).max(100),
    billingMode: ContractBillingModeEnum,
  })
  .superRefine((value, ctx) => {
    if (value.scholarshipPercent === 100 && value.billingMode !== 'MANUAL') {
      ctx.addIssue({
        code: 'custom',
        path: ['billingMode'],
        message: 'Bolsa integral não tem cobrança — o controle é manual.',
      });
    }
  });

export const ContractTemplateSchema = createSelectSchema(contractTemplatesTable);
export const InsertContractTemplateSchema = createInsertSchema(contractTemplatesTable);
export const ContractSchema = createSelectSchema(contractsTable);
export const InsertContractSchema = createInsertSchema(contractsTable);

export const CreateContractTemplateSchema = z.object({
  name: z.string().min(3, 'Nome do modelo é obrigatório'),
  targetRole: ContractTargetRoleEnum,
  kind: ContractTemplateKindEnum.default('STANDARD'),
});

export const UpdateContractTemplateSchema = z.object({
  templateId: z.uuid(),
  name: z.string().min(3, 'Nome do modelo é obrigatório').optional(),
  content: z.string().min(10, 'O conteúdo do contrato é obrigatório').optional(),
});

export const SetContractTemplateActiveSchema = z.object({
  templateId: z.uuid(),
});

export const CancelContractSchema = z.object({
  contractId: z.uuid(),
});

/** Emite manualmente um contrato para um usuário (ex: professor, ou aluno sem contrato). */
export const CreateContractForUserSchema = z.object({
  userId: z.uuid(),
  packageId: z.uuid().optional(),
});

/** Altera os termos de bolsa de um aluno — reemite o contrato (ver `setScholarshipTerms`). */
export const SetScholarshipTermsSchema = z.intersection(
  z.object({ userId: z.uuid() }),
  ScholarshipTermsSchema
);

/**
 * Assinatura: o aluno digita o próprio nome e marca o aceite. O nome é
 * conferido contra `users.name` no service; o IP é capturado na action.
 */
export const SignContractSchema = z.object({
  contractId: z.uuid(),
  signedName: z.string().min(3, 'Digite seu nome completo'),
  acceptedTerms: z.literal(true, { message: 'É preciso aceitar os termos para assinar' }),
});

export { SigningIdentitySchema };
