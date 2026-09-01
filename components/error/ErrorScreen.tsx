"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorScreenProps {
  /** Chamado pelo Next quando o usuário clica em "Tentar novamente" — refaz o render da árvore que quebrou, sem recarregar a página inteira. */
  reset: () => void;
}

/**
 * Tela cheia mostrada por `error.tsx`/`global-error.tsx` no lugar da tela
 * nativa de crash do navegador ("This page couldn't load").
 *
 * Não tenta reconstruir o menu lateral do `AppLayout`: ele é montado DENTRO
 * de cada página (não num layout compartilhado — ver app/(hub)/layout.tsx),
 * então quando o erro derruba a página, o menu já foi junto. Uma tela cheia,
 * limpa, é o que dá pra oferecer sem saber em que papel (admin/professor/
 * aluno) o usuário estava.
 */
export function ErrorScreen({ reset }: ErrorScreenProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50">
        <AlertTriangle className="h-8 w-8 text-rose-500" />
      </div>

      <div className="space-y-2">
        <h1 className="text-xl font-bold text-slate-900">Algo deu errado</h1>
        <p className="max-w-sm text-sm text-slate-500">
          Não conseguimos concluir essa ação. Pode ter sido uma instabilidade momentânea —
          tente novamente em alguns instantes.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={reset}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Tentar novamente
        </Button>
        <Button variant="outline" render={<a href="/" />}>
          Ir para o início
        </Button>
      </div>
    </div>
  );
}
