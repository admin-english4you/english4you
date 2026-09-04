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

/**
 * Regra de negócio que bloqueia uma prática que o aluno *possui* (dia já
 * concluído, expirado, ou ainda no futuro) — diferente de não achar/não ter
 * posse do recurso. UI deve redirecionar com uma mensagem, nunca renderizar
 * como "página não encontrada".
 */
export class BlockedPracticeError extends AppError {
  constructor(message: string) {
    super(message);
    this.name = "BlockedPracticeError";
  }
}
