"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, AlertTriangle } from "lucide-react";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plan } from "@/modules/plan/plan.types";
import { assignPlanAction } from "@/modules/class/class.actions";

interface PlanAssignmentCardProps {
  classGroupId: string;
  currentPlan: Plan | null;
  activePlans: Plan[];
  isEditable: boolean;
}

export function PlanAssignmentCard({ classGroupId, currentPlan, activePlans, isEditable }: PlanAssignmentCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedPlanId, setSelectedPlanId] = useState(currentPlan?.id ?? "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const hasChanges = selectedPlanId && selectedPlanId !== (currentPlan?.id ?? "");
  const isChangingExistingPlan = Boolean(currentPlan) && hasChanges;

  const executeAssign = () => {
    setErrorMessage(null);

    startTransition(async () => {
      const result = await assignPlanAction({ classGroupId, planId: selectedPlanId });
      if (result.success) {
        setShowConfirmation(false);
        router.refresh();
      } else {
        setErrorMessage(result.error);
        setShowConfirmation(false);
      }
    });
  };

  const handleSaveClick = () => {
    if (!hasChanges) return;
    setErrorMessage(null);

    if (isChangingExistingPlan) {
      setShowConfirmation(true);
      return;
    }

    executeAssign();
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="w-4 h-4 text-slate-400" />
        <h3 className="font-bold text-slate-900 text-sm">Plano de Ensino</h3>
      </div>

      {errorMessage && (
        <div className="p-3 mb-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
          {errorMessage}
        </div>
      )}

      <p className="text-xs text-slate-500 mb-3">
        Atual: <span className="font-semibold text-slate-700">{currentPlan?.name ?? "Sem plano definido"}</span>
      </p>

      {showConfirmation ? (
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 font-medium">
              Trocar o plano irá apagar as aulas ainda não realizadas desta turma e gerar uma nova grade a partir de
              hoje. Aulas já concluídas são preservadas.
            </p>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowConfirmation(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="button" size="sm" onClick={executeAssign} loading={isPending} className="bg-amber-600 hover:bg-amber-700 text-white">
              Confirmar Troca
            </Button>
          </div>
        </div>
      ) : isEditable ? (
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Select
              value={selectedPlanId}
              onChange={setSelectedPlanId}
              placeholder="Selecione um plano..."
              options={activePlans.map((p) => ({ value: p.id, label: p.name }))}
            />
          </div>
          <Button type="button" onClick={handleSaveClick} disabled={!hasChanges} loading={isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            Salvar
          </Button>
        </div>
      ) : (
        <p className="text-[11px] text-slate-400">Turma não está ativa — não é possível alterar o plano de ensino.</p>
      )}
    </div>
  );
}
