import { z } from "zod";
import { AppError } from "./errors";

export type ActionResult<T = unknown> = 
  | { success: true; data?: T; message?: string }
  | { success: false; error: string };

/**
 * Encapsula a execução de Server Actions para realizar parsing de Zod e mascaramento de erros.
 * Retorna uma função que pode ser invocada com os dados de entrada.
 */
export function createSafeAction<TSchema extends z.ZodTypeAny, TResult>(
  schema: TSchema,
  handler: (parsedInput: z.infer<TSchema>) => Promise<TResult>
) {
  return async (input: unknown): Promise<ActionResult<TResult>> => {
    try {
      const parsed = schema.safeParse(input);
      if (!parsed.success) {
        const firstError = parsed.error.issues[0]?.message || "Dados de entrada inválidos";
        return { success: false, error: firstError };
      }

      const result = await handler(parsed.data);
      return { success: true, data: result };
    } catch (err: unknown) {
      console.error("Action error:", err);

      // Erros de negócio (AppError) têm mensagem segura e amigável — repassar.
      if (err instanceof AppError) {
        return { success: false, error: err.message };
      }

      // Qualquer outro erro (DB, infra, ou o texto genérico que o Next.js
      // usa para mascarar erros de Server Components em produção) nunca
      // deve vazar para o cliente.
      return { success: false, error: "Ocorreu um erro interno no servidor. Tente novamente." };
    }
  };
}
