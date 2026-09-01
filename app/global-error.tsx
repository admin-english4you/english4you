"use client";

import { useEffect } from "react";
import { ErrorScreen } from "@/components/error/ErrorScreen";

/**
 * Último recurso: pega erro dentro do PRÓPRIO layout raiz (app/layout.tsx).
 *
 * `app/error.tsx` não cobre isso — um Error Boundary nunca pega erro do seu
 * próprio ancestral, só dos filhos. Como substitui o layout raiz inteiro,
 * precisa declarar `<html>`/`<body>` própros (é a única exceção nas
 * convenções do App Router a isso).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalErrorBoundary]", error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body>
        <ErrorScreen reset={reset} />
      </body>
    </html>
  );
}
