"use client";

import { useState, useTransition } from "react";
import { CreditCard, Receipt } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatCents } from "@/modules/finance/finance.utils";
import { replaceCardAction } from "@/modules/payment/payment.actions";
import {
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_STYLES,
  SUBSCRIPTION_STATUS_LABELS,
  SUBSCRIPTION_STATUS_STYLES,
  describeRejection,
} from "@/modules/payment/payment.utils";
import type { BillingView } from "@/modules/payment/payment.types";
import type { User } from "@/modules/user/user.types";

interface PaymentsViewProps {
  user: User;
  billing: BillingView;
}

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

function formatDate(date: Date | null): string {
  return date ? dateFormatter.format(date) : "—";
}

export function PaymentsView({ user, billing }: PaymentsViewProps) {
  const { subscription, pkg, payments } = billing;
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

  // Só faz sentido trocar o cartão de uma assinatura que ainda vai cobrar algo.
  const canReplaceCard =
    subscription?.status === "AUTHORIZED" ||
    subscription?.status === "PAYMENT_FAILED" ||
    subscription?.status === "PAUSED";

  return (
    <AppLayout role={user.role}>
        <PageHeader
          title="Pagamentos"
          description="Sua assinatura, o histórico de mensalidades e o cartão cadastrado."
        />

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            {error}
          </div>
        )}

        {subscription ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50/60 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-bold text-slate-900">{pkg?.name ?? "Assinatura"}</h2>
                <p className="text-xs text-slate-500">Cobrança mensal automática no cartão</p>
              </div>
              <span
                className={cn(
                  "inline-flex w-fit items-center rounded-md border px-2.5 py-1 text-xs font-bold",
                  SUBSCRIPTION_STATUS_STYLES[subscription.status]
                )}
              >
                {SUBSCRIPTION_STATUS_LABELS[subscription.status]}
              </span>
            </div>

            <div className="space-y-5 p-6">
              <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-xs text-slate-500">Mensalidade</dt>
                  <dd className="font-bold text-slate-900">
                    {formatCents(subscription.amountCents)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Próxima cobrança</dt>
                  <dd className="font-semibold text-slate-800">
                    {formatDate(subscription.nextPaymentDate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Fim do contrato</dt>
                  <dd className="font-semibold text-slate-800">
                    {formatDate(subscription.endDate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Cartão</dt>
                  <dd className="font-semibold text-slate-800">
                    {subscription.cardLastFour ? (
                      <span className="inline-flex items-center gap-1.5">
                        <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                        •••• {subscription.cardLastFour}
                      </span>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
              </dl>

              {canReplaceCard && (
                <div className="border-t border-slate-100 pt-4">
                  <Button variant="outline" onClick={handleReplaceCard} loading={isPending}>
                    {!isPending && <CreditCard className="mr-2 h-4 w-4" />}
                    Trocar cartão
                  </Button>
                  <p className="mt-2 text-[11px] text-slate-400">
                    {subscription.status === "AUTHORIZED"
                      ? "O novo cartão passa a ser cobrado a partir da próxima mensalidade — nada é cobrado agora."
                      : "A mensalidade em aberto é cobrada no novo cartão assim que você autorizar."}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <EmptyState
            icon={CreditCard}
            title="Nenhuma assinatura ativa"
            description="Assim que sua matrícula for concluída, os dados da sua assinatura aparecem aqui."
          />
        )}

        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Histórico de mensalidades
          </h2>

          {payments.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="Nenhuma cobrança ainda"
              description="As mensalidades aparecem aqui conforme o Mercado Pago as processa."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Pago em</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell mobileLabel="Vencimento" isHeaderCell>
                      <span className="font-semibold text-slate-900">
                        {formatDate(payment.dueDate)}
                      </span>
                    </TableCell>
                    <TableCell mobileLabel="Valor">
                      <span className="font-bold text-slate-900">
                        {formatCents(payment.amountCents)}
                      </span>
                    </TableCell>
                    <TableCell mobileLabel="Pago em">
                      <span className="text-slate-500">{formatDate(payment.paidAt)}</span>
                    </TableCell>
                    <TableCell mobileLabel="Status" noWrapper>
                      <div className="text-right md:text-left">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-bold",
                            PAYMENT_STATUS_STYLES[payment.status]
                          )}
                        >
                          {PAYMENT_STATUS_LABELS[payment.status]}
                        </span>
                        {payment.status === "FAILED" && (
                          <p className="mt-1 max-w-xs text-[11px] text-rose-600">
                            {describeRejection(payment.statusDetail)}
                          </p>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
    </AppLayout>
  );
}
