"use client";

import { useEffect } from "react";
import { Printer, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LessonContentView } from "@/components/lesson/LessonContentView";
import { CONTRACT_STATUS_LABELS } from "@/modules/contract/contract.utils";
import type { ContractStatus } from "@/modules/contract/contract.types";

interface ContractPrintViewProps {
  html: string;
  userName: string;
  packageName: string | null;
  signedAt: Date | null;
  status: ContractStatus;
}

export function ContractPrintView({
  html,
  userName,
  packageName,
  signedAt,
  status,
}: ContractPrintViewProps) {
  useEffect(() => {
    // O conteúdo vem do TipTap, que monta o HTML depois de montar o editor —
    // imprimir no mesmo tick pegaria a página em branco. Um frame de folga
    // resolve, e o botão continua ali para reimprimir quando quiser.
    const timer = setTimeout(() => window.print(), 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      {/* Barra de ação — some na impressão */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-3 print:hidden">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">
              Contrato · {userName}
            </p>
            <p className="text-xs text-slate-500">
              Use &quot;Salvar como PDF&quot; no destino da impressão.
            </p>
          </div>
          <Button onClick={() => window.print()} className="bg-indigo-600 hover:bg-indigo-700">
            <Printer className="mr-2 h-4 w-4" /> Imprimir / PDF
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-3xl bg-white p-8 shadow-sm print:max-w-none print:p-0 print:shadow-none sm:my-8 sm:p-12">
        <header className="mb-8 border-b border-slate-200 pb-6">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">English4You</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Contrato de Prestação de Serviços
          </h1>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-600">
            <span>
              <strong className="font-semibold">Contratante:</strong> {userName}
            </span>
            {packageName && (
              <span>
                <strong className="font-semibold">Pacote:</strong> {packageName}
              </span>
            )}
            <span>
              <strong className="font-semibold">Situação:</strong> {CONTRACT_STATUS_LABELS[status]}
            </span>
          </div>
        </header>

        <LessonContentView html={html} />

        <footer className="mt-10 border-t border-slate-200 pt-6 text-xs text-slate-500">
          {signedAt ? (
            <p className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              Assinado eletronicamente por {userName} em{" "}
              {signedAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}.
            </p>
          ) : (
            <p className="text-amber-700">
              Documento ainda não assinado — esta é uma prévia do contrato emitido.
            </p>
          )}
        </footer>
      </div>
    </div>
  );
}
