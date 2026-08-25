"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, PowerOff, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  deactivateStudentAction,
  reactivateStudentAction,
} from "@/modules/payment/payment.actions";

interface AccountStatusCardProps {
  userId: string;
  userName: string;
  isActive: boolean;
  isStudent: boolean;
  /** Um admin não desativa a própria conta — perderia o acesso na hora. */
  isSelf: boolean;
  hasLiveSubscription: boolean;
  openPaymentsCount: number;
}

/**
 * Ativar/desativar a conta.
 *
 * Desativar um aluno é irreversível na parte financeira: o Mercado Pago não
 * reabre um preapproval cancelado, então reativar devolve o acesso mas exige
 * uma nova contratação. Por isso a confirmação diz exatamente o que vai
 * acontecer, em vez de um "tem certeza?" genérico.
 */
export function AccountStatusCard({
  userId,
  userName,
  isActive,
  isStudent,
  isSelf,
  hasLiveSubscription,
  openPaymentsCount,
}: AccountStatusCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = () => {
    setError(null);
    startTransition(async () => {
      const result = isActive
        ? await deactivateStudentAction({ userId })
        : await reactivateStudentAction({ userId });

      if (result.success) {
        setIsModalOpen(false);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  if (isSelf) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-xs text-slate-500">
          Esta é a sua própria conta — a desativação precisa ser feita por outro administrador.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border bg-white shadow-sm ${
        isActive ? "border-rose-200" : "border-emerald-200"
      }`}
    >
      <div className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-4">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
            isActive
              ? "border-rose-100 bg-rose-50 text-rose-600"
              : "border-emerald-100 bg-emerald-50 text-emerald-600"
          }`}
        >
          {isActive ? <PowerOff className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
        </div>
        <h2 className="text-base font-bold text-slate-900">
          {isActive ? "Desativar conta" : "Conta desativada"}
        </h2>
      </div>

      <div className="space-y-4 p-5">
        {isActive ? (
          <p className="text-sm text-slate-600">
            Bloqueia o acesso de {userName.split(" ")[0]} à plataforma
            {isStudent && ", encerra a assinatura no Mercado Pago e cancela as cobranças ainda não processadas"}
            .
          </p>
        ) : (
          <p className="text-sm text-slate-600">
            A conta está inativa. Reativar devolve o acesso à plataforma
            {isStudent && ", mas a assinatura cancelada não volta — o aluno precisa contratar de novo pelo onboarding"}
            .
          </p>
        )}

        <Button
          onClick={() => setIsModalOpen(true)}
          disabled={isPending}
          className={
            isActive
              ? "w-full bg-rose-600 text-white hover:bg-rose-700"
              : "w-full bg-emerald-600 text-white hover:bg-emerald-700"
          }
        >
          {isActive ? (
            <>
              <PowerOff className="mr-2 h-4 w-4" /> Desativar {isStudent ? "aluno" : "conta"}
            </>
          ) : (
            <>
              <RotateCcw className="mr-2 h-4 w-4" /> Reativar conta
            </>
          )}
        </Button>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isActive ? "Desativar conta" : "Reativar conta"}
      >
        <div className="space-y-4 p-6">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              {error}
            </div>
          )}

          <p className="text-sm text-slate-600">
            {isActive ? (
              <>
                Confirma desativar <strong className="text-slate-900">{userName}</strong>?
              </>
            ) : (
              <>
                Confirma reativar <strong className="text-slate-900">{userName}</strong>?
              </>
            )}
          </p>

          {isActive && isStudent && (
            <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="flex items-center gap-2 text-xs font-bold text-amber-800">
                <AlertTriangle className="h-4 w-4" /> O que acontece
              </p>
              <ul className="list-disc space-y-1 pl-5 text-xs text-amber-800">
                <li>A conta fica inativa e o aluno perde o acesso.</li>
                <li>
                  {hasLiveSubscription
                    ? "A assinatura é cancelada no Mercado Pago — não haverá novas cobranças."
                    : "Não há assinatura ativa para cancelar."}
                </li>
                <li>
                  {openPaymentsCount > 0
                    ? `${openPaymentsCount} cobrança(s) ainda não processada(s) serão canceladas.`
                    : "Não há cobranças pendentes."}
                </li>
                <li className="font-semibold">
                  As mensalidades já pagas continuam no histórico — nada é apagado.
                </li>
              </ul>
            </div>
          )}

          <Modal.Footer>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              loading={isPending}
              onClick={handleConfirm}
              className={
                isActive
                  ? "bg-rose-600 text-white hover:bg-rose-700"
                  : "bg-emerald-600 text-white hover:bg-emerald-700"
              }
            >
              {isActive ? "Sim, desativar" : "Sim, reativar"}
            </Button>
          </Modal.Footer>
        </div>
      </Modal>
    </div>
  );
}
