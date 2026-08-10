"use client";

import Link from "next/link";
import { ChevronRight, FileSignature } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import { CONTRACT_STATUS_LABELS, CONTRACT_STATUS_STYLES } from "@/modules/contract/contract.utils";
import type { ContractListItem, ContractStatus } from "@/modules/contract/contract.types";

interface ContractsTabProps {
  contracts: ContractListItem[];
  activeStatus: ContractStatus | "ALL";
}

const STATUS_FILTERS: { key: ContractStatus | "ALL"; label: string }[] = [
  { key: "ALL", label: "Todos" },
  { key: "PENDING_SIGNATURE", label: "Aguardando assinatura" },
  { key: "ACTIVE", label: "Ativos" },
  { key: "CANCELED", label: "Cancelados" },
  { key: "COMPLETED", label: "Encerrados" },
];

function formatDate(value: Date | null): string {
  return value ? new Date(value).toLocaleDateString("pt-BR") : "—";
}

export function ContractsTab({ contracts, activeStatus }: ContractsTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => {
          const isActive = filter.key === activeStatus;
          const href =
            filter.key === "ALL"
              ? "/admin/finance?tab=contratos"
              : `/admin/finance?tab=contratos&status=${filter.key}`;

          return (
            <Link
              key={filter.key}
              href={href}
              scroll={false}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
                isActive
                  ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              )}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      {contracts.length === 0 ? (
        <EmptyState
          icon={FileSignature}
          title="Nenhum contrato aqui"
          description="Os contratos são gerados automaticamente ao cadastrar um aluno com pacote. Verifique se há um modelo ativo em Modelos."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3.5">Aluno / Professor</th>
                  <th className="px-6 py-3.5">Pacote</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Criado em</th>
                  <th className="px-6 py-3.5">Assinado em</th>
                  <th className="px-6 py-3.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contracts.map((contract) => (
                  <tr key={contract.id} className="transition-colors hover:bg-slate-50/70">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900">{contract.userName}</p>
                      <p className="text-xs text-slate-500">{contract.userEmail}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{contract.packageName ?? "—"}</td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-bold",
                          CONTRACT_STATUS_STYLES[contract.status]
                        )}
                      >
                        {CONTRACT_STATUS_LABELS[contract.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">{formatDate(contract.createdAt)}</td>
                    <td className="px-6 py-4 text-xs text-slate-500">{formatDate(contract.signedAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/finance/contracts/${contract.id}`}
                        className="inline-flex items-center text-xs font-semibold text-indigo-600 hover:underline"
                      >
                        Ver <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
