import { z } from "zod";

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
      const errorMessage = err instanceof Error ? err.message : "Ocorreu um erro interno no servidor.";
      return { success: false, error: errorMessage };
    }
  };
}
