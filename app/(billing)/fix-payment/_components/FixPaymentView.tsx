"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, CreditCard, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/modules/finance/finance.utils";
import { replaceCardAction } from "@/modules/payment/payment.actions";
import { describeRejection } from "@/modules/payment/payment.utils";
import type { Payment, StudentSubscription } from "@/modules/payment/payment.types";
import { BillingShell } from "../../_components/BillingShell";

interface FixPaymentViewProps {
  subscription: StudentSubscription | null;
  lastFailure: Payment | null;
  packageName: string | null;
}

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

/**
 * Tela de bloqueio por inadimplência.
 *
 * O objetivo é ser resolvível sem falar com ninguém: o motivo da recusa em
 * português é o que separa "meu cartão não tinha limite" (o aluno resolve em um
 * minuto) de um chamado para a secretaria.
 */
export function FixPaymentView({ subscription, lastFailure, packageName }: FixPaymentViewProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleReplaceCard = () => {
    setError(null);
    startTransition(async () => {
      const result = await replaceCardAction();
      if (result.success && result.data) {
        window.location.href = result.data.initPoint;
      } else if (!result.success) {
        setError(result.error);
      }
    });
  };

  return (
    <BillingShell
      title="Pagamento pendente"
      description="Seu acesso volta assim que a mensalidade for regularizada."
    >
      <div className="overflow-hidden rounded-2xl border border-rose-200 bg-white shadow-sm">
        <div className="flex items-start gap-3 border-b border-rose-200 bg-rose-50 px-6 py-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
          <div>
            <h2 className="font-bold text-slate-900">
              {subscription?.status === "PAUSED"
                ? "Sua assinatura foi pausada"
                : "A última cobrança não foi aprovada"}
            </h2>
            <p className="mt-0.5 text-sm text-rose-800">
              {describeRejection(lastFailure?.statusDetail ?? null)}
            </p>
          </div>
        </div>

        <div className="space-y-6 p-6">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              {error}
            </div>
          )}

          <dl className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-slate-50/60 p-5 text-sm">
            <div>
              <dt className="text-xs text-slate-500">Valor</dt>
              <dd className="font-bold text-slate-900">
                {formatCents(lastFailure?.amountCents ?? subscription?.amountCents ?? 0)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Vencimento</dt>
              <dd className="font-bold text-slate-900">
                {lastFailure ? dateFormatter.format(lastFailure.dueDate) : "—"}
              </dd>
            </div>
            {packageName && (
              <div>
                <dt className="text-xs text-slate-500">Pacote</dt>
                <dd className="font-semibold text-slate-800">{packageName}</dd>
              </div>
            )}
            {subscription?.cardLastFour && (
              <div>
                <dt className="text-xs text-slate-500">Cartão recusado</dt>
                <dd className="font-semibold text-slate-800">•••• {subscription.cardLastFour}</dd>
              </div>
            )}
          </dl>

          <div className="space-y-3">
            <Button
              onClick={handleReplaceCard}
              loading={isPending}
              className="w-full bg-primary hover:bg-primary/80 sm:w-auto"
            >
              {!isPending && <CreditCard className="mr-2 h-4 w-4" />}
              Atualizar cartão
            </Button>

            <p className="flex items-start gap-1.5 text-[11px] text-slate-400">
              <Lock className="mt-px h-3.5 w-3.5 shrink-0" />
              Você será levado ao ambiente seguro do Mercado Pago. A cobrança em aberto é feita no
              novo cartão assim que você autorizar, e o acesso é liberado na sequência.
            </p>
          </div>
        </div>
      </div>
    </BillingShell>
  );
}
