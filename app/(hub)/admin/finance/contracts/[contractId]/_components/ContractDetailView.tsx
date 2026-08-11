"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Ban, Fingerprint, Repeat } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { LessonContentView } from "@/components/lesson/LessonContentView";
import { cn } from "@/lib/utils";
import { cancelContractAction } from "@/modules/contract/contract.actions";
import { changeStudentPackageAction } from "@/modules/payment/payment.actions";
import { CONTRACT_STATUS_LABELS, CONTRACT_STATUS_STYLES } from "@/modules/contract/contract.utils";
import { formatCents } from "@/modules/finance/finance.utils";
import type { ContractDetail } from "@/modules/contract/contract.types";
import type { Package } from "@/modules/finance/finance.types";

interface ContractDetailViewProps {
  contract: ContractDetail;
  packages: Package[];
}

function formatDateTime(value: Date | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function ContractDetailView({ contract, packages }: ContractDetailViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [changingPackage, setChangingPackage] = useState(false);
  const [newPackageId, setNewPackageId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleCancel = () => {
    setError(null);
    startTransition(async () => {
      const result = await cancelContractAction({ contractId: contract.id });
      if (result.success) {
        setConfirmingCancel(false);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  const handleChangePackage = () => {
    setError(null);
    startTransition(async () => {
      const result = await changeStudentPackageAction({
        userId: contract.userId,
        packageId: newPackageId,
      });
      if (result.success && result.data) {
        setChangingPackage(false);
        // O contrato antigo virou CANCELED e um novo foi emitido: quem manda na
        // navegação é o id novo, não este.
        router.push(`/admin/finance/contracts/${result.data.id}`);
      } else if (!result.success) {
        setError(result.error);
      }
    });
  };

  const isLive = contract.status === "PENDING_SIGNATURE" || contract.status === "ACTIVE";
  const canCancel = isLive;
  // Só contrato de aluno tem pacote — professor assina sem nenhum.
  const canChangePackage = isLive && contract.pkg !== null;
  const packageOptions = packages
    .filter((pkg) => pkg.id !== contract.packageId)
    .map((pkg) => ({
      value: pkg.id,
      label: `${pkg.name} — ${formatCents(pkg.installmentValueCents)}/mês · ${pkg.durationInMonths} meses`,
    }));

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
            {canChangePackage && (
              <Button
                variant="outline"
                onClick={() => {
                  setNewPackageId("");
                  setChangingPackage(true);
                }}
                disabled={isPending}
              >
                <Repeat className="mr-2 h-4 w-4" /> Trocar pacote
              </Button>
            )}
            {canCancel && (
              <Button variant="outline" onClick={() => setConfirmingCancel(true)} disabled={isPending}>
                <Ban className="mr-2 h-4 w-4" /> Cancelar
              </Button>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            {error}
          </div>
        )}

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

      <Modal isOpen={changingPackage} onClose={() => setChangingPackage(false)} title="Trocar pacote">
        <div className="space-y-4 p-6">
          <p className="text-sm text-slate-600">
            A assinatura atual é cancelada no Mercado Pago (nenhuma cobrança futura é gerada), este
            contrato passa a constar como cancelado e um novo é emitido com o pacote escolhido.
          </p>
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            O aluno precisará assinar o novo contrato e cadastrar o cartão de novo — ele cai
            automaticamente no fluxo de matrícula no próximo acesso.
          </p>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
              Novo pacote
            </label>
            <Select
              value={newPackageId}
              onChange={setNewPackageId}
              options={packageOptions}
              placeholder="Selecione o pacote"
              disabled={isPending}
            />
          </div>

          <ModalFooter>
            <Button variant="outline" onClick={() => setChangingPackage(false)} disabled={isPending}>
              Voltar
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={handleChangePackage}
              disabled={!newPackageId}
              loading={isPending}
            >
              Trocar pacote
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      <Modal isOpen={confirmingCancel} onClose={() => setConfirmingCancel(false)} title="Cancelar contrato?">
        <div className="p-6">
          <p className="text-sm text-slate-600">
            O contrato passa a constar como cancelado e a assinatura recorrente é cancelada no
            Mercado Pago — nenhuma cobrança futura é gerada. O histórico e o texto assinado
            continuam guardados; nada é apagado.
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
