"use client";

import { LogOut } from "lucide-react";
import { logoutAction } from "@/modules/user/user.actions";

interface BillingShellProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

/**
 * Moldura das telas de cobrança. Deliberadamente sem sidebar e sem navegação:
 * o aluno que chega aqui está com a matrícula ou o pagamento pendente, e as
 * únicas saídas legítimas são resolver a pendência ou sair da conta.
 */
export function BillingShell({ title, description, children }: BillingShellProps) {
  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">English4You</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            {title}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        <button
          type="button"
          onClick={() => logoutAction()}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sair
        </button>
      </header>

      {children}
    </div>
  );
}
