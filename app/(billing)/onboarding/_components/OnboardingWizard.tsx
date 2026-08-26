"use client";

import { useState, useTransition } from "react";
import { Check, CreditCard, FileSignature, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContractSigner } from "@/components/contract/ContractSigner";
import { cn } from "@/lib/utils";
import { formatCents } from "@/modules/finance/finance.utils";
import { startSubscriptionCheckoutAction } from "@/modules/payment/payment.actions";
import type { OnboardingState } from "@/modules/payment/payment.types";
import type { User } from "@/modules/user/user.types";
import { BillingShell } from "../../_components/BillingShell";

interface OnboardingWizardProps {
  user: User;
  onboarding: OnboardingState;
}

/**
 * Wizard de matrícula: assinar o contrato e autorizar a assinatura recorrente.
 *
 * O passo atual NÃO é estado local — vem do servidor (`onboarding.needsContract`).
 * O `ContractSigner` chama `router.refresh()` ao assinar, o RSC recalcula, e o
 * wizard reabre já no passo 2. Guardar o passo em `useState` faria a tela
 * discordar do banco num F5 (aluno legado, contrato já assinado, aba duplicada).
 */
export function OnboardingWizard({ user, onboarding }: OnboardingWizardProps) {
  const { contract, pkg, needsContract } = onboarding;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = () => {
    setError(null);
    startTransition(async () => {
      const result = await startSubscriptionCheckoutAction();
      if (result.success && result.data) {
        // Redirect fora da action: `redirect()` do Next lança uma exceção de
        // controle que o createSafeAction mascararia como erro interno.
        window.location.href = result.data.initPoint;
      } else if (!result.success) {
        setError(result.error);
      }
    });
  };

  if (!contract) {
    return (
      <BillingShell
        title="Matrícula em preparação"
        description="Ainda não há um contrato emitido para você."
      >
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-slate-600">
            Sua matrícula ainda está sendo preparada pela secretaria. Assim que o contrato for
            emitido, ele aparece aqui para leitura e assinatura.
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Se isso demorar, entre em contato com a escola.
          </p>
        </div>
      </BillingShell>
    );
  }

  return (
    <BillingShell
      title="Conclua sua matrícula"
      description="Faltam dois passos para você começar a estudar."
    >
      <ol className="flex items-center gap-3">
        <StepPill
          icon={FileSignature}
          label="Contrato"
          state={needsContract ? "current" : "done"}
        />
        <div className="h-px flex-1 bg-slate-200" />
        <StepPill
          icon={CreditCard}
          label="Pagamento"
          state={needsContract ? "upcoming" : "current"}
        />
      </ol>

      {needsContract ? (
        <ContractSigner contract={contract} user={user} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-200 bg-primary/10 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-slate-900">Pagamento da mensalidade</h2>
              <p className="text-xs text-slate-500">
                Cobrança automática no cartão de crédito, todo mês.
              </p>
            </div>
            <span className="inline-flex w-fit items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
              <Check className="h-3.5 w-3.5" />
              Contrato assinado
            </span>
          </div>

          <div className="space-y-6 p-6">
            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                {error}
              </div>
            )}

            {pkg ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {pkg.name}
                </p>
                <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
                  {formatCents(pkg.installmentValueCents)}
                  <span className="ml-1 text-sm font-medium text-slate-400">/mês</span>
                </p>
                <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-200 pt-4 text-xs">
                  <div>
                    <dt className="text-slate-500">Duração</dt>
                    <dd className="font-semibold text-slate-800">
                      {pkg.durationInMonths} {pkg.durationInMonths === 1 ? "mês" : "meses"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Aulas por semana</dt>
                    <dd className="font-semibold text-slate-800">{pkg.classesPerWeek}x</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Total do contrato</dt>
                    <dd className="font-semibold text-slate-800">
                      {formatCents(pkg.installmentValueCents * pkg.durationInMonths)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Primeira cobrança</dt>
                    <dd className="font-semibold text-slate-800">Ao autorizar</dd>
                  </div>
                </dl>
              </div>
            ) : (
              <p className="text-sm text-slate-600">
                Seu contrato não tem um pacote associado. Fale com a secretaria da escola.
              </p>
            )}

            <div className="space-y-3">
              <Button
                onClick={handleCheckout}
                loading={isPending}
                disabled={!pkg}
                className="w-full bg-primary hover:bg-primary/80 sm:w-auto"
              >
                {!isPending && <CreditCard className="mr-2 h-4 w-4" />}
                Cadastrar cartão no Mercado Pago
              </Button>

              <p className="flex items-start gap-1.5 text-[11px] text-slate-400">
                <Lock className="mt-px h-3.5 w-3.5 shrink-0" />
                Você será levado ao ambiente seguro do Mercado Pago para digitar os dados do
                cartão. A English4You não recebe nem armazena o número do seu cartão.
              </p>
              <p className="flex items-start gap-1.5 text-[11px] text-slate-400">
                <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0" />
                A cobrança se encerra sozinha ao fim dos {pkg?.durationInMonths ?? 0} meses do
                contrato.
              </p>
            </div>
          </div>
        </div>
      )}
    </BillingShell>
  );
}

function StepPill({
  icon: Icon,
  label,
  state,
}: {
  icon: React.ElementType;
  label: string;
  state: "done" | "current" | "upcoming";
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold",
        state === "done" && "border-emerald-200 bg-emerald-50 text-emerald-700",
        state === "current" && "border-primary/20 bg-primary/10 text-primary",
        state === "upcoming" && "border-slate-200 bg-white text-slate-400"
      )}
    >
      {state === "done" ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
      {label}
    </div>
  );
}
