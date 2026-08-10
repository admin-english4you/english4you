import { User } from './user.types';

/**
 * Campos de identidade que NUNCA vão para o cookie de sessão.
 *
 * O cookie `e4y_session` é httpOnly, mas não é assinado nem criptografado —
 * ele carrega o usuário serializado em JSON puro. CPF e endereço são dados
 * pessoais regulados (LGPD) e nada que lê a sessão precisa deles: todos os
 * consumidores de `getCurrentUser()` usam apenas id, role, name e email.
 * Quem precisa dos dados completos relê do banco via `userService`.
 */
const IDENTITY_FIELDS = [
  'document',
  'addressStreet',
  'addressNumber',
  'addressComplement',
  'addressDistrict',
  'addressCity',
  'addressState',
  'addressZipCode',
] as const;

export type SessionUser = Omit<User, (typeof IDENTITY_FIELDS)[number]>;

/** Remove os campos de identidade antes de serializar o usuário no cookie. */
export function toSessionUser(user: User): SessionUser {
  const sessionUser = { ...user } as User & Partial<Pick<User, (typeof IDENTITY_FIELDS)[number]>>;
  for (const field of IDENTITY_FIELDS) {
    delete sessionUser[field];
  }
  return sessionUser;
}
