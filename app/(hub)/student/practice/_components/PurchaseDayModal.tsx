"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Coins, Trophy } from "lucide-react";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { purchasePracticeDayAction } from "@/modules/progress/progress.actions";
import type { PracticeDayState } from "@/modules/practice/practice.types";
import { PRACTICE_MODE_LABELS, formatXp } from "@/modules/progress/progress.utils";

interface PurchaseDayModalProps {
  day: PracticeDayState | null;
  cost: number;
  balance: number;
  onClose: () => void;
}

export function PurchaseDayModal({ day, cost, balance, onClose }: PurchaseDayModalProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (!day) return null;

  const canAfford = balance >= cost;
  const wasCompleted = day.status === "COMPLETED";

  const handlePurchase = () => {
    startTransition(async () => {
      const result = await purchasePracticeDayAction({
        lessonId: day.lessonId,
        dayIndex: day.dayIndex,
      });

      if (result.success) {
        toast.success("Prática desbloqueada! Refazer não dá XP.");
        onClose();
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <Modal isOpen onClose={onClose} title="Desbloquear com XP">
      {/* O Modal não aplica padding no children — cada tela controla o seu. */}
      <div className="p-6">
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Dia {day.dayIndex}
          </p>
          <p className="font-semibold text-slate-900">{PRACTICE_MODE_LABELS[day.renderMode]}</p>
          <p className="mt-0.5 truncate text-xs text-slate-500">{day.lessonTitle}</p>
        </div>

        <p className="text-sm text-slate-600">
          {wasCompleted
            ? "Você já concluiu esta prática. Desbloqueie para refazer quantas vezes quiser."
            : "Esta prática expirou. Desbloqueie para poder fazê-la agora."}{" "}
          <strong className="text-slate-800">Refazer não gera XP.</strong>
        </p>

        <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <span className="flex items-center gap-1.5 text-sm font-medium text-amber-800">
            <Coins className="h-4 w-4" />
            Custo
          </span>
          <span className="font-bold text-amber-800">{formatXp(cost)}</span>
        </div>

        <div className="flex items-center justify-between px-1">
          <span className="flex items-center gap-1.5 text-sm text-slate-600">
            <Trophy className="h-4 w-4 text-slate-400" />
            Seu saldo
          </span>
          <span className={canAfford ? "font-semibold text-slate-800" : "font-semibold text-rose-600"}>
            {formatXp(balance)}
          </span>
        </div>

        {!canAfford && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
            XP insuficiente. Conclua as práticas liberadas para acumular mais.
          </p>
        )}
      </div>

      <ModalFooter>
        <Button variant="outline" onClick={onClose} disabled={isPending}>
          Cancelar
        </Button>
        <Button onClick={handlePurchase} loading={isPending} disabled={!canAfford}>
          Desbloquear por {cost} XP
        </Button>
      </ModalFooter>
      </div>
    </Modal>
  );
}
