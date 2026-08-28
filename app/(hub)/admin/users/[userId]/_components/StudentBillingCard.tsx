import { AlertTriangle, CheckCircle2, CreditCard, GraduationCap, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { applyScholarshipDiscount, formatCents } from "@/modules/finance/finance.utils";
import type { ContractBillingMode } from "@/modules/contract/contract.types";
import {
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_STYLES,
  SUBSCRIPTION_STATUS_LABELS,
  SUBSCRIPTION_STATUS_STYLES,
  describeRejection,
} from "@/modules/payment/payment.utils";
import type { StudentFinancialSummary } from "@/modules/payment/payment.types";

interface StudentBillingCardProps {
  financial: StudentFinancialSummary;
  monthLabel: string;
  scholarshipPercent: number;
  billingMode: ContractBillingMode;
}

/**
 * Situação financeira do aluno: assinatura, mês corrente, histórico pago e o
 * que está em aberto.
 *
 * Todas as linhas vêm da tabela `payments`, alimentada pelo webhook do Mercado
 * Pago — não há lançamento manual aqui. Cobranças futuras NÃO são pré-geradas:
 * o MP cria cada uma na data, então "pendente" só aparece quando ele já
 * agendou de fato.
 */
export function StudentBillingCard({
  financial,
  monthLabel,
  scholarshipPercent,
  billingMode,
}: StudentBillingCardProps) {
  const { subscription, pkg, currentMonthPayment, paidPayments, openPayments } = financial;
  const isPaidThisMonth = currentMonthPayment !== null;

  // A plataforma não cobra este aluno. Sem esta distinção, a ausência de linhas
  // em `payments` — que aqui é o estado NORMAL — apareceria como o alerta
  // âmbar de "sem pagamento registrado", um alarme falso permanente.
  const isPlatformBilled = billingMode === "MERCADO_PAGO";
  const effectiveMonthlyCents = pkg
    ? applyScholarshipDiscount(pkg.installmentValueCents, scholarshipPercent)
    : null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-600">
          <Wallet className="h-4 w-4" />
        </div>
        <h2 className="text-base font-bold text-slate-900">Situação financeira</h2>
      </div>

      <div className="space-y-5 p-5">
        {/* Bolsa / cobrança manual: substitui o bloco do mês corrente, que só
            faz sentido para quem a plataforma cobra. */}
        {!isPlatformBilled ? (
          <div className="flex items-start gap-3 rounded-xl border border-violet-200 bg-violet-50 p-4">
            <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-violet-900">
                {scholarshipPercent === 100
                  ? "Bolsista integral — sem mensalidade"
                  : `Cobrança manual${scholarshipPercent > 0 ? ` — bolsa de ${scholarshipPercent}%` : ""}`}
              </p>
              <p className="mt-0.5 text-xs text-violet-800">
                {scholarshipPercent === 100
                  ? "Este aluno não é cobrado pela plataforma e não tem assinatura no Mercado Pago."
                  : `${effectiveMonthlyCents !== null ? `${formatCents(effectiveMonthlyCents)}/mês` : "Valor combinado"}, acertado direto com a secretaria.`}
              </p>
              <p className="mt-1.5 text-[11px] text-violet-700">
                A plataforma <strong>não acompanha</strong> estes pagamentos — registre os
                recebimentos no livro-caixa em Financeiro → Visão Geral.
              </p>
            </div>
          </div>
        ) : (
        /* Mês corrente */
        <div
          className={cn(
            "flex items-start gap-3 rounded-xl border p-4",
            isPaidThisMonth
              ? "border-emerald-200 bg-emerald-50"
              : "border-amber-200 bg-amber-50"
          )}
        >
          {isPaidThisMonth ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          )}
          <div className="min-w-0">
            <p
              className={cn(
                "text-sm font-bold",
                isPaidThisMonth ? "text-emerald-800" : "text-amber-800"
              )}
            >
              {isPaidThisMonth
                ? `Mensalidade de ${monthLabel} paga`
                : `Sem pagamento registrado em ${monthLabel}`}
            </p>
            <p
              className={cn(
                "mt-0.5 text-xs",
                isPaidThisMonth ? "text-emerald-700" : "text-amber-700"
              )}
            >
              {isPaidThisMonth && currentMonthPayment?.paidAt
                ? `${formatCents(currentMonthPayment.amountCents)} recebidos em ${currentMonthPayment.paidAt.toLocaleDateString("pt-BR")}`
                : "O Mercado Pago gera a cobrança na data de vencimento — antes disso não há linha para este mês."}
            </p>
          </div>
        </div>
        )}

        {/* Assinatura */}
        <div>
          <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Assinatura
          </h3>
          {subscription ? (
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-slate-900">
                  {pkg?.name ?? "Pacote removido"}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold",
                    SUBSCRIPTION_STATUS_STYLES[subscription.status]
                  )}
                >
                  {SUBSCRIPTION_STATUS_LABELS[subscription.status]}
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="text-slate-400">Mensalidade</dt>
                  <dd className="font-semibold text-slate-700">
                    {formatCents(subscription.amountCents)}
                    {scholarshipPercent > 0 && pkg && (
                      <span className="ml-1 font-normal text-violet-600">
                        ({scholarshipPercent}% de bolsa · cheio{" "}
                        {formatCents(pkg.installmentValueCents)})
                      </span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400">Próxima cobrança</dt>
                  <dd className="font-semibold text-slate-700">
                    {subscription.nextPaymentDate
                      ? subscription.nextPaymentDate.toLocaleDateString("pt-BR")
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400">Vigência</dt>
                  <dd className="font-semibold text-slate-700">
                    {subscription.startDate.toLocaleDateString("pt-BR")} a{" "}
                    {subscription.endDate.toLocaleDateString("pt-BR")}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400">Cartão</dt>
                  <dd className="font-semibold text-slate-700">
                    {subscription.cardLastFour ? `•••• ${subscription.cardLastFour}` : "—"}
                  </dd>
                </div>
              </dl>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
              {isPlatformBilled
                ? "Nenhuma assinatura. O aluno passa pelo onboarding e contrata ao entrar na plataforma."
                : "Não há assinatura: este aluno não é cobrado pela plataforma."}
            </p>
          )}
        </div>

        {/* Em aberto */}
        {openPayments.length > 0 && (
          <div>
            <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Em aberto ({formatCents(financial.openCents)})
            </h3>
            <div className="space-y-2">
              {openPayments.map((payment) => (
                <PaymentRow key={payment.id} payment={payment} showReason />
              ))}
            </div>
          </div>
        )}

        {/* Histórico */}
        <div>
          <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Pagas ({formatCents(financial.totalPaidCents)})
          </h3>
          {paidPayments.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
              Nenhuma mensalidade paga ainda.
            </p>
          ) : (
            <div className="space-y-2">
              {paidPayments.map((payment) => (
                <PaymentRow key={payment.id} payment={payment} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PaymentRow({
  payment,
  showReason = false,
}: {
  payment: StudentFinancialSummary["payments"][number];
  showReason?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <CreditCard className="h-4 w-4 shrink-0 text-slate-400" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800">
            {formatCents(payment.amountCents)}
          </p>
          <p className="truncate text-[11px] text-slate-500">
            {payment.paidAt
              ? `Pago em ${payment.paidAt.toLocaleDateString("pt-BR")}`
              : `Vence em ${payment.dueDate.toLocaleDateString("pt-BR")}`}
            {showReason && payment.status === "FAILED" && (
              <span className="text-rose-600"> · {describeRejection(payment.statusDetail)}</span>
            )}
          </p>
        </div>
      </div>
      <span
        className={cn(
          "shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-bold",
          PAYMENT_STATUS_STYLES[payment.status]
        )}
      >
        {PAYMENT_STATUS_LABELS[payment.status]}
      </span>
    </div>
  );
}
