"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Download, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LessonContentView } from "@/components/lesson/LessonContentView";
import { cn } from "@/lib/utils";
import { CONTRACT_STATUS_LABELS, CONTRACT_STATUS_STYLES } from "@/modules/contract/contract.utils";
import type { StudentContractView } from "@/modules/contract/contract.types";

interface SignedContractCardProps {
  contract: StudentContractView;
}

export function SignedContractCard({ contract }: SignedContractCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-bold text-slate-900">Contrato de curso</h2>
          <p className="text-xs text-slate-500">
            {contract.packageName ? `Pacote ${contract.packageName}` : "Contrato"}
            {contract.signedAt && (
              <>
                {" · "}
                Assinado em{" "}
                {new Date(contract.signedAt).toLocaleString("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </>
            )}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex w-fit shrink-0 items-center rounded-md border px-2.5 py-1 text-xs font-bold",
            CONTRACT_STATUS_STYLES[contract.status]
          )}
        >
          {CONTRACT_STATUS_LABELS[contract.status]}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3 px-6 py-3">
        <Button variant="outline" size="sm" onClick={() => setIsOpen((v) => !v)}>
          {isOpen ? (
            <>
              <ChevronUp className="mr-1.5 h-3.5 w-3.5" /> Ocultar contrato
            </>
          ) : (
            <>
              <ChevronDown className="mr-1.5 h-3.5 w-3.5" /> Ler contrato
            </>
          )}
        </Button>

        {/* PDF ainda não é gerado — botão fica visível e desabilitado para
            sinalizar que está por vir, sem prometer um download que falharia. */}
        <Button variant="ghost" size="sm" disabled title="Em breve" className="text-slate-400">
          <Download className="mr-1.5 h-3.5 w-3.5" /> Baixar PDF
        </Button>

        {contract.signedAt && (
          <span className="ml-auto flex items-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            Assinatura registrada
          </span>
        )}
      </div>

      {isOpen && (
        <div className="border-t border-slate-100 bg-slate-50/50 p-6 sm:p-8">
          <LessonContentView html={contract.html} />
        </div>
      )}
    </div>
  );
}
