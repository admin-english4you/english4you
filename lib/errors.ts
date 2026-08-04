/**
 * Erro de negócio esperado (validação, RBAC, regra de domínio).
 * Sua mensagem é segura para ser exibida diretamente ao usuário.
 * Lançar `Error` comum para falhas inesperadas (DB, infra, etc.) — essas
 * são mascaradas por `createSafeAction` antes de chegar ao cliente.
 */
export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AppError";
  }
}
