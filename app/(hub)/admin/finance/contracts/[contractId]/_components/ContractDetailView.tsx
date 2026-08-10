"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Ban, Fingerprint } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { LessonContentView } from "@/components/lesson/LessonContentView";
import { cn } from "@/lib/utils";
import { cancelContractAction } from "@/modules/contract/contract.actions";
import { CONTRACT_STATUS_LABELS, CONTRACT_STATUS_STYLES } from "@/modules/contract/contract.utils";
import { formatCents } from "@/modules/finance/finance.utils";
import type { ContractDetail } from "@/modules/contract/contract.types";

interface ContractDetailViewProps {
  contract: ContractDetail;
}

function formatDateTime(value: Date | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function ContractDetailView({ contract }: ContractDetailViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const handleCancel = () => {
    startTransition(async () => {
      const result = await cancelContractAction({ contractId: contract.id });
      if (result.success) {
        setConfirmingCancel(false);
        router.refresh();
      }
    });
  };

  const canCancel = contract.status === "PENDING_SIGNATURE" || contract.status === "ACTIVE";

  return (
    <AppLayout role="ADMIN">
      <div className="mx-auto space-y-4">
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/admin/finance?tab=contratos"
              aria-label="Voltar para contratos"
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold tracking-tight text-slate-900">
                {contract.userName}
              </h1>
              <p className="truncate text-sm text-slate-500">{contract.userEmail}</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <span
              className={cn(
                "inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-bold",
                CONTRACT_STATUS_STYLES[contract.status]
              )}
            >
              {CONTRACT_STATUS_LABELS[contract.status]}
            </span>
            {canCancel && (
              <Button variant="outline" onClick={() => setConfirmingCancel(true)} disabled={isPending}>
                <Ban className="mr-2 h-4 w-4" /> Cancelar
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <aside className="space-y-4 lg:col-span-1">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-700">Contrato</h2>
              <dl className="space-y-2.5 text-sm">
                <Row label="Modelo" value={contract.templateName} />
                <Row label="Pacote" value={contract.pkg?.name ?? "—"} />
                {contract.pkg && (
                  <>
                    <Row label="Mensalidade" value={formatCents(contract.pkg.installmentValueCents)} />
                    <Row
                      label="Duração"
                      value={`${contract.pkg.durationInMonths} meses · ${contract.pkg.classesPerWeek}x/semana`}
                    />
                  </>
                )}
                <Row label="Início" value={formatDateTime(contract.startDate)} />
                <Row label="Término previsto" value={formatDateTime(contract.endDate)} />
              </dl>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                <Fingerprint className="h-3.5 w-3.5 text-slate-400" />
                Auditoria da assinatura
              </h2>
              {contract.signedAt ? (
                <dl className="space-y-2.5 text-sm">
                  <Row label="Assinado em" value={formatDateTime(contract.signedAt)} />
                  <Row label="Nome digitado" value={contract.signedName ?? "—"} />
                  <Row label="Endereço IP" value={contract.signedByIp ?? "—"} mono />
                </dl>
              ) : (
                <p className="text-xs text-slate-400">
                  Ainda não assinado. O texto abaixo é uma prévia com os dados atuais do usuário e pode
                  mudar até a assinatura.
                </p>
              )}
            </div>
          </aside>

          <div className="lg:col-span-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <LessonContentView html={contract.html} />
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={confirmingCancel} onClose={() => setConfirmingCancel(false)} title="Cancelar contrato?">
        <div className="p-6">
          <p className="text-sm text-slate-600">
            O contrato passa a constar como cancelado. O histórico e o texto assinado continuam
            guardados — nada é apagado.
          </p>
          <ModalFooter>
            <Button variant="outline" onClick={() => setConfirmingCancel(false)} disabled={isPending}>
              Voltar
            </Button>
            <Button className="bg-rose-600 hover:bg-rose-700" onClick={handleCancel} loading={isPending}>
              Cancelar contrato
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </AppLayout>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-xs text-slate-400">{label}</dt>
      <dd className={cn("min-w-0 text-right text-sm font-medium text-slate-800", mono && "font-mono text-xs")}>
        {value}
      </dd>
    </div>
  );
}
