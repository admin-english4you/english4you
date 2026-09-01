import type { ActionResult } from "./safe-action";

/**
 * Envolve a chamada a uma Server Action pra capturar falha de TRANSPORTE, não
 * de lógica de negócio.
 *
 * `createSafeAction` (safe-action.ts) só protege o que roda DENTRO do
 * handler no servidor — se ele terminar (com sucesso ou erro), sempre volta
 * um `ActionResult` limpo. Mas um 504 do Vercel (função estourou o
 * `maxDuration`) acontece ANTES disso: o servidor nunca chega a responder no
 * formato que o Next espera, e o runtime do CLIENTE lança
 * `Error: An unexpected response was received from the server` — fora de
 * qualquer `try/catch` nosso, e fora do alcance de um Error Boundary (React
 * não pega exceção de código assíncrono dentro de `startTransition`). Sem
 * isto, a exceção sobe crua e alguns navegadores (é o caso do PWA instalado)
 * derrubam a página inteira pra tela nativa de "couldn't load" — foi o caso
 * real que motivou isto: o admin gerando uma lição grande, cuja geração
 * passou dos 60s do plano Hobby.
 *
 * Uso: `const result = await runAction(() => minhaAction(input));`
 */
export async function runAction<T>(call: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await call();
  } catch (err) {
    console.error("[Client] Falha ao chamar Server Action (transporte, não lógica):", err);
    return {
      success: false,
      error:
        "Não foi possível concluir agora — a operação pode ter demorado demais ou a conexão caiu no meio do caminho. Tente novamente em instantes.",
    };
  }
}
