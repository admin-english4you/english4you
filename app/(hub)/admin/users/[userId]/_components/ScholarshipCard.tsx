"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { applyScholarshipDiscount, formatCents } from "@/modules/finance/finance.utils";
import { setScholarshipTermsAction } from "@/modules/payment/payment.actions";
import type { ContractBillingMode } from "@/modules/contract/contract.types";

interface ScholarshipCardProps {
  userId: string;
  userName: string;
  scholarshipPercent: number;
  billingMode: ContractBillingMode;
  packageName: string | null;
  installmentValueCents: number | null;
  /** Sem contrato vigente com pacote não há o que reemitir — o service recusa. */
  canEdit: boolean;
}

/**
 * Bolsa de estudos do aluno.
 *
 * Alterar é destrutivo (cancela contrato e assinatura, e o aluno precisa
 * reassinar), então a confirmação diz exatamente o que vai acontecer em vez de
 * um "tem certeza?" genérico — mesmo padrão do `AccountStatusCard`.
 */
export function ScholarshipCard({
  userId,
  userName,
  scholarshipPercent,
  billingMode,
  packageName,
  installmentValueCents,
  canEdit,
}: ScholarshipCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState<"NONE" | "FULL" | "PARTIAL">(
    scholarshipPercent === 0 ? "NONE" : scholarshipPercent === 100 ? "FULL" : "PARTIAL"
  );
  const [percentInput, setPercentInput] = useState(
    scholarshipPercent > 0 && scholarshipPercent < 100 ? String(scholarshipPercent) : "50"
  );
  const [mode, setMode] = useState<ContractBillingMode>(billingMode);

  const parsedPercent = Number.parseInt(percentInput, 10);
  const nextPercent = type === "FULL" ? 100 : type === "PARTIAL" ? parsedPercent : 0;
  const nextMode: ContractBillingMode = nextPercent === 100 ? "MANUAL" : mode;
  const previewCents =
    installmentValueCents !== null && Number.isFinite(nextPercent)
      ? applyScholarshipDiscount(installmentValueCents, nextPercent)
      : null;

  const handleSubmit = () => {
    setError(null);
    startTransition(async () => {
      const result = await setScholarshipTermsAction({
        userId,
        scholarshipPercent: nextPercent,
        billingMode: nextMode,
      });

      if (result.success) {
        setIsModalOpen(false);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50">
          <GraduationCap className="h-4 w-4 text-violet-600" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-slate-900">Bolsa de estudos</h2>

          {scholarshipPercent === 0 ? (
            <p className="mt-1 text-xs text-slate-500">
              Sem bolsa — paga o valor cheio do pacote
              {packageName ? ` ${packageName}` : ""}.
            </p>
          ) : (
            <p className="mt-1 text-xs text-slate-600">
              <span className="font-bold text-violet-700">
                {scholarshipPercent === 100 ? "Bolsa integral" : `Bolsa de ${scholarshipPercent}%`}
              </span>
              {installmentValueCents !== null && (
                <>
                  {" · "}
                  {formatCents(applyScholarshipDiscount(installmentValueCents, scholarshipPercent))}
                  /mês
                </>
              )}
              {" · "}
              {billingMode === "MANUAL" ? "controle manual" : "Mercado Pago"}
            </p>
          )}

          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={!canEdit}
              onClick={() => setIsModalOpen(true)}
            >
              Alterar bolsa
            </Button>
            {!canEdit && (
              <p className="mt-2 text-[11px] text-slate-400">
                É preciso um contrato vigente com pacote para alterar a bolsa.
              </p>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Alterar bolsa de estudos"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
              Bolsa
            </label>
            <Select
              value={type}
              onChange={(value) => {
                const next = value as "NONE" | "FULL" | "PARTIAL";
                setType(next);
                if (next === "FULL") setMode("MANUAL");
              }}
              options={[
                { value: "NONE", label: "Sem bolsa — paga o pacote cheio" },
                { value: "FULL", label: "Bolsa integral — não paga nada" },
                { value: "PARTIAL", label: "Bolsa parcial — desconto percentual" },
              ]}
            />
          </div>

          {type === "PARTIAL" && (
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Percentual da bolsa (%)
              </label>
              <Input
                type="number"
                min={1}
                max={99}
                value={percentInput}
                onChange={(e) => setPercentInput(e.target.value)}
              />
            </div>
          )}

          {type !== "FULL" && (
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Como cobrar
              </label>
              <Select
                value={mode}
                onChange={(value) => setMode(value as ContractBillingMode)}
                options={[
                  { value: "MERCADO_PAGO", label: "Assinatura no Mercado Pago (automática)" },
                  { value: "MANUAL", label: "Controle manual — a escola registra no caixa" },
                ]}
              />
            </div>
          )}

          {previewCents !== null && (
            <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
              {userName} passará a pagar <strong>{formatCents(previewCents)}/mês</strong>
              {nextMode === "MANUAL"
                ? " — sem cobrança pela plataforma."
                : " — cobrado automaticamente no cartão."}
            </p>
          )}

          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-900">
            <AlertTriangle className="mt-px h-4 w-4 shrink-0 text-amber-600" />
            <span>
              Alterar a bolsa <strong>cancela o contrato atual e a assinatura no Mercado Pago</strong>{" "}
              e emite um contrato novo, do modelo correto. {userName} volta para o onboarding e
              precisa <strong>assinar de novo</strong> antes de voltar a estudar. As mensalidades já
              pagas continuam no histórico, e não há estorno automático do mês já cobrado.
            </span>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              {error}
            </div>
          )}

          <Modal.Footer>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} loading={isPending} className="bg-primary hover:bg-primary/80">
              Alterar e reemitir contrato
            </Button>
          </Modal.Footer>
        </div>
      </Modal>
    </div>
  );
}
