import Link from "next/link";
import { Download, FileSignature, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { CONTRACT_STATUS_LABELS, CONTRACT_STATUS_STYLES } from "@/modules/contract/contract.utils";
import type { Contract } from "@/modules/contract/contract.types";

interface UserContractsCardProps {
  contracts: (Contract & { packageName: string | null })[];
}

/**
 * Contratos do usuário. "Baixar" aponta para a versão de impressão
 * (`/print`), que abre o diálogo do navegador — de onde sai o PDF. Não geramos
 * o arquivo no servidor: o contrato é HTML rico do editor, e o próprio
 * navegador o converte com fidelidade sem nenhuma dependência nova.
 */
export function UserContractsCard({ contracts }: UserContractsCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-100 bg-amber-50 text-amber-600">
          <FileSignature className="h-4 w-4" />
        </div>
        <h2 className="text-base font-bold text-slate-900">Contratos</h2>
      </div>

      <div className="p-5">
        {contracts.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
            Nenhum contrato emitido para este usuário.
          </p>
        ) : (
          <div className="space-y-3">
            {contracts.map((contract) => (
              <div
                key={contract.id}
                className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">
                      {contract.packageName ?? "Contrato"}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold",
                        CONTRACT_STATUS_STYLES[contract.status]
                      )}
                    >
                      {CONTRACT_STATUS_LABELS[contract.status]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {contract.signedAt
                      ? `Assinado em ${contract.signedAt.toLocaleDateString("pt-BR")}`
                      : `Emitido em ${contract.createdAt.toLocaleDateString("pt-BR")} · aguardando assinatura`}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={`/admin/finance/contracts/${contract.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    <FileText className="h-3.5 w-3.5" /> Abrir
                  </Link>
                  <Link
                    href={`/admin/finance/contracts/${contract.id}/print`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                  >
                    <Download className="h-3.5 w-3.5" /> Baixar
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
