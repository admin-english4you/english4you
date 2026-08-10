"use client";

import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";

export const FINANCE_TABS = [
  { key: "visao-geral", label: "Visão Geral" },
  { key: "contratos", label: "Contratos" },
  { key: "modelos", label: "Modelos" },
  { key: "pacotes", label: "Pacotes" },
] as const;

export type FinanceTab = (typeof FINANCE_TABS)[number]["key"];

interface FinanceShellProps {
  activeTab: FinanceTab;
  children: React.ReactNode;
}

/**
 * Casca comum das abas de /admin/finance.
 *
 * Passou a ser a dona do `AppLayout` + `PageHeader` (antes viviam dentro do
 * FinancialOverview) para que as quatro abas compartilhem o mesmo cabeçalho.
 * A aba ativa vem por prop, e não de `useSearchParams`, o que evita a
 * exigência de `<Suspense>` e mantém este componente puramente visual.
 */
export function FinanceShell({ activeTab, children }: FinanceShellProps) {
  return (
    <AppLayout role="ADMIN">
      <div className="mx-auto space-y-6">
        <PageHeader
          title="Financeiro"
          description="Pacotes, contratos e modelos da escola."
        />

        <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
          {FINANCE_TABS.map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <Link
                key={tab.key}
                href={`/admin/finance?tab=${tab.key}`}
                scroll={false}
                className={cn(
                  "shrink-0 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors",
                  isActive
                    ? "border-indigo-600 text-indigo-700"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        {children}
      </div>
    </AppLayout>
  );
}
