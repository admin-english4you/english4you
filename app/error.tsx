"use client";

import { useEffect } from "react";
import { ErrorScreen } from "@/components/error/ErrorScreen";

/**
 * Error Boundary de toda rota sob o layout raiz (public, billing, hub).
 *
 * Existe porque o projeto não tinha NENHUM `error.tsx` antes disto — um erro
 * não tratado (ex: a exceção de transporte de uma Server Action que estourou
 * o `maxDuration` da Vercel, ver `lib/run-action.ts`) subia crua e alguns
 * navegadores (o PWA instalado, no caso real que motivou isto) mostravam a
 * tela nativa de "This page couldn't load" em vez de qualquer coisa da nossa
 * interface.
 *
 * IMPORTANTE: isto é rede de segurança, não a correção principal. Um Error
 * Boundary só pega erro de RENDER — a maioria das falhas de ação (Server
 * Actions, `fetch`) precisa ser tratada com try/catch no próprio call site
 * (ver `runAction`). Sem aquilo, muitos erros de transporte nem chegam a
 * passar por aqui: viram uma promise rejeitada sem dono.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ErrorBoundary]", error);
  }, [error]);

  return <ErrorScreen reset={reset} />;
}
