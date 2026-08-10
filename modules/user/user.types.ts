import { z } from 'zod';
import { RoleEnum, SigningIdentitySchema, UserSchema, usersTable } from './user.schema';

export type Role = z.infer<typeof RoleEnum>;
export type User = z.infer<typeof UserSchema>;

/**
 * Derivado de `$inferInsert` (e não de `Omit<User, ...>`) para que colunas
 * nullable ou com default sejam OPCIONAIS na inserção. Com o `Omit`, cada
 * coluna nova adicionada a `users` quebrava simultaneamente todos os pontos
 * que montam um usuário — inclusive o seed e a lista otimista do admin.
 */
export type CreateUserDTO = typeof usersTable.$inferInsert;

/** Dados que o próprio usuário preenche antes de assinar um contrato. */
export type SigningIdentityInput = z.infer<typeof SigningIdentitySchema>;
