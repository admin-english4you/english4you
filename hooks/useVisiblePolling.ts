"use client";

import { useEffect, useRef } from "react";

/**
 * Executa `callback` agora e a cada `intervalMs` — mas SÓ enquanto a aba
 * estiver visível.
 *
 * Existe por custo: cada poll é uma Server Action que consulta o banco, e o
 * Neon só desliga o compute (scale-to-zero) depois de 5 min sem nenhuma
 * consulta. Uma única aba esquecida em segundo plano fazendo poll mantinha o
 * banco acordado — e cobrando — o dia inteiro. Com a aba oculta não há ninguém
 * olhando a tela; ao voltar, o callback roda na hora, então nada fica velho.
 *
 * O callback fica num ref: o efeito depende só de `intervalMs`/`enabled`, e
 * passar uma função nova a cada render não reinicia o ciclo (nem dispara um
 * poll extra fora do intervalo).
 */
export function useVisiblePolling(
  callback: () => void,
  intervalMs: number,
  enabled = true
): void {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    if (!enabled) return;

    let interval: ReturnType<typeof setInterval> | null = null;

    const stop = () => {
      if (interval !== null) {
        clearInterval(interval);
        interval = null;
      }
    };

    const start = () => {
      stop();
      callbackRef.current();
      interval = setInterval(() => callbackRef.current(), intervalMs);
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") start();
      else stop();
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [intervalMs, enabled]);
}
