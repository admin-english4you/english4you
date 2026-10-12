"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, AlertTriangle } from "lucide-react";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plan } from "@/modules/plan/plan.types";
import Link from "next/link";
import { PlanAssignmentPreview } from "@/modules/class/class.types";
import { assignPlanAction, getPlanAssignmentPreviewAction } from "@/modules/class/class.actions";

interface PlanAssignmentCardProps {
  classGroupId: string;
  currentPlan: Plan | null;
  activePlans: Plan[];
  isEditable: boolean;
  /** A turma já deu aulas: trocar o plano exige escolher a partir de qual aula do novo plano continuar. */
  hasCompletedLessons: boolean;
}

export function PlanAssignmentCard({
  classGroupId,
  currentPlan,
  activePlans,
  isEditable,
  hasCompletedLessons,
}: PlanAssignmentCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedPlanId, setSelectedPlanId] = useState(currentPlan?.id ?? "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [preview, setPreview] = useState<PlanAssignmentPreview | null>(null);
  const [startFromLessonId, setStartFromLessonId] = useState("");

  const hasChanges = selectedPlanId && selectedPlanId !== (currentPlan?.id ?? "");
  const isChangingExistingPlan = Boolean(currentPlan) && hasChanges;
  const isChoosingStart = preview !== null;
  const selectedOption = preview?.options.find((option) => option.id === startFromLessonId);

  const cancelSteps = () => {
    setShowConfirmation(false);
    setPreview(null);
    setStartFromLessonId("");
  };

  const executeAssign = () => {
    setErrorMessage(null);

    startTransition(async () => {
      const result = await assignPlanAction({
        classGroupId,
        planId: selectedPlanId,
        ...(startFromLessonId ? { startFromLessonId } : {}),
      });
      if (result.success) {
        cancelSteps();
        router.refresh();
      } else {
        setErrorMessage(result.error);
        cancelSteps();
      }
    });
  };

  const loadPreview = () => {
    startTransition(async () => {
      const result = await getPlanAssignmentPreviewAction({ classGroupId, planId: selectedPlanId });
      if (!result.success || !result.data) {
        setErrorMessage(result.success ? "Não foi possível carregar o plano." : result.error);
        return;
      }

      const firstAvailable = result.data.options.find((option) => !option.alreadyTaught);
      if (!firstAvailable) {
        setErrorMessage("Este plano não tem aulas restantes: a turma já teve todas as lições dele.");
        return;
      }

      setPreview(result.data);
      setStartFromLessonId(firstAvailable.id);
    });
  };

  const handleSaveClick = () => {
    if (!hasChanges) return;
    setErrorMessage(null);

    if (hasCompletedLessons) {
      loadPreview();
      return;
    }

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

      {isChoosingStart ? (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Continuar a partir de qual aula do novo plano?
            </label>
            <Select
              value={startFromLessonId}
              onChange={setStartFromLessonId}
              options={preview.options.map((option) => ({
                value: option.id,
                label: `Aula ${option.order} — ${option.title}${option.alreadyTaught ? " (já dada)" : ""}`,
                disabled: option.alreadyTaught,
              }))}
            />
          </div>
          {selectedOption && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-1">
              <p>
                A turma tem <strong>{preview.pendingCount}</strong> aula(s) pendente(s). A partir da aula escolhida, o
                novo plano tem <strong>{selectedOption.scheduledCount}</strong> aula(s) para gerar.
              </p>
            </div>
          )}
          {selectedOption && selectedOption.uncoveredCount > 0 && (
            <div className="flex items-start gap-3 p-3 bg-rose-50 border border-rose-200 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-800 space-y-1">
                <p className="font-semibold">
                  {selectedOption.uncoveredCount} aula(s) pendente(s) ficarão sem lição e serão excluídas.
                </p>
                <p>
                  A turma terá menos aulas do que o previsto. Para cobrir as faltantes, adicione mais lições ao novo
                  plano antes de trocar (ou escolha uma aula inicial anterior).{" "}
                  <Link
                    href={`/admin/plans/${selectedPlanId}`}
                    target="_blank"
                    className="font-semibold underline hover:text-rose-900"
                  >
                    Abrir o plano
                  </Link>
                </p>
              </div>
            </div>
          )}
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 font-medium">
              As aulas já concluídas ficam como estão. As ainda não realizadas serão apagadas (inclusive o quadro e o
              professor substituto definidos nelas) e geradas de novo, a partir de hoje, com as lições do novo plano
              da aula escolhida em diante. Lições que a turma já teve não são repetidas.
            </p>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={cancelSteps} disabled={isPending}>
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={executeAssign}
              loading={isPending}
              disabled={!startFromLessonId}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Confirmar Troca
            </Button>
          </div>
        </div>
      ) : showConfirmation ? (
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 font-medium">
              Trocar o plano irá apagar as aulas ainda não realizadas desta turma e gerar uma nova grade a partir de
              hoje. Aulas já concluídas são preservadas.
            </p>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={cancelSteps} disabled={isPending}>
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
          <Button type="button" onClick={handleSaveClick} disabled={!hasChanges} loading={isPending} className="bg-primary hover:bg-primary/80 text-primary-foreground">
            Salvar
          </Button>
        </div>
      ) : (
        <p className="text-[11px] text-slate-400">Turma não está ativa — não é possível alterar o plano de ensino.</p>
      )}
    </div>
  );
}
