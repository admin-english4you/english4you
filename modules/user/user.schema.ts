import { pgTable, uuid, varchar, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { isValidCpf, normalizeCep, normalizeCpf } from '@/lib/br-document';

export const roleEnumDb = pgEnum('user_role', ['ADMIN', 'TEACHER', 'STUDENT']);

export const usersTable = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  role: roleEnumDb('role').notNull().default('STUDENT'),
  phone: varchar('phone', { length: 50 }),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  status: varchar('status', { length: 50 }).notNull().default('Active'),
  // Turma atual do aluno (nullable, sem FK para evitar import circular com class.schema.ts).
  // Um usuário pertence a no máximo uma turma por vez; integridade é garantida no Service.
  classGroupId: uuid('class_group_id'),

  // ---------------------------------------------------------------------------
  // Identidade para assinatura de contrato.
  //
  // Preenchidos pelo PRÓPRIO usuário na hora de assinar (ver
  // /student/documents) — o admin cadastra apenas nome/e-mail. Ficam aqui, e
  // não numa tabela lateral, porque é 1:1 estrito e esta tabela já é a casa
  // dos dados de perfil (phone/avatarUrl). São a fonte de verdade
  // reutilizável entre contratos; o `contentSnapshot` do contrato guarda a
  // cópia congelada que vale juridicamente.
  //
  // Todas nullable: a tabela já tem linhas, e professores/admins podem nunca
  // preencher. `document` guarda só dígitos (máscara é apresentação) e NÃO é
  // unique — responsável legal pode repetir CPF entre irmãos.
  // ---------------------------------------------------------------------------
  document: varchar('document', { length: 20 }),
  addressStreet: varchar('address_street', { length: 255 }),
  addressNumber: varchar('address_number', { length: 20 }),
  addressComplement: varchar('address_complement', { length: 100 }),
  addressDistrict: varchar('address_district', { length: 100 }),
  addressCity: varchar('address_city', { length: 100 }),
  addressState: varchar('address_state', { length: 2 }),
  addressZipCode: varchar('address_zip_code', { length: 9 }),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('users_class_group_id_idx').on(table.classGroupId),
]);

// Zod schemas directly from Drizzle
export const UserSchema = createSelectSchema(usersTable);
export const InsertUserSchema = createInsertSchema(usersTable);

export const RoleEnum = z.enum(['ADMIN', 'TEACHER', 'STUDENT']);

/**
 * LoginSchema
 * Validação de dados para entrada no sistema via email e senha.
 */
export const LoginSchema = z.object({
  email: z.email('Insira um e-mail válido'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
  portal: z.enum(['STUDENT', 'STAFF']).optional(),
});

/**
 * CreateUserByAdminSchema
 * Usado pelo administrador para convidar/cadastrar novos usuários.
 *
 * O pacote é obrigatório para ALUNO (é dele que sai o contrato gerado
 * automaticamente) e proibido para os demais papéis. Validar aqui faz a
 * mensagem aparecer no formulário, antes do round-trip.
 */
export const CreateUserByAdminSchema = z
  .object({
    name: z.string().min(3, 'Nome é obrigatório'),
    email: z.email('Insira um e-mail válido'),
    role: RoleEnum.default('STUDENT'),
    packageId: z.uuid('ID do pacote inválido').optional(),
  })
  .superRefine((value, ctx) => {
    if (value.role === 'STUDENT' && !value.packageId) {
      ctx.addIssue({
        code: 'custom',
        message: 'Selecione um pacote de aulas para o aluno.',
        path: ['packageId'],
      });
    }
  });

/**
 * Dados de identidade que o usuário preenche antes de assinar o contrato.
 *
 * CPF e CEP são normalizados para só dígitos no próprio schema, de modo que o
 * service e o banco nunca vejam máscara — quem digita pode formatar à vontade.
 */
export const SigningIdentitySchema = z.object({
  document: z
    .string()
    .transform(normalizeCpf)
    .refine(isValidCpf, 'CPF inválido'),
  addressZipCode: z
    .string()
    .transform(normalizeCep)
    .refine((cep) => cep.length === 8, 'CEP inválido'),
  addressStreet: z.string().min(3, 'Informe o logradouro'),
  addressNumber: z.string().min(1, 'Informe o número'),
  addressComplement: z.string().max(100, 'Complemento muito longo').optional(),
  addressDistrict: z.string().min(2, 'Informe o bairro'),
  addressCity: z.string().min(2, 'Informe a cidade'),
  addressState: z
    .string()
    .trim()
    .toUpperCase()
    .refine((uf) => /^[A-Z]{2}$/.test(uf), 'UF deve ter 2 letras'),
});
