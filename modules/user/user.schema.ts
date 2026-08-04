import { pgTable, uuid, varchar, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

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
 */
export const CreateUserByAdminSchema = z.object({
  name: z.string().min(3, 'Nome é obrigatório'),
  email: z.email('Insira um e-mail válido'),
  role: RoleEnum.default('STUDENT'),
  packageId: z.uuid('ID do pacote inválido').optional(),
});
