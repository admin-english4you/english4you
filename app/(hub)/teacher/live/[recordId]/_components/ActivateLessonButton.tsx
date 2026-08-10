"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { toast } from "@/components/ui/toaster";
import { activateLessonAction } from "@/modules/class/class.actions";
import type { LessonStatus } from "@/modules/lesson/lesson.types";

interface ActivateLessonButtonProps {
  recordId: string;
  lessonStatus: LessonStatus;
}

/**
 * Ativação é sempre uma ação manual e explícita do professor, nunca
 * automática ao encerrar a chamada (assim uma chamada que caiu no meio não
 * trava nada). Com confirmação: como a lição é compartilhada por outras
 * turmas via o plano, ativar aqui libera a prática pra elas também.
 */
export function ActivateLessonButton({ recordId, lessonStatus }: ActivateLessonButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState(lessonStatus);
  const [confirming, setConfirming] = useState(false);

  if (status === "ACTIVE") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Lição ativa
      </span>
    );
  }

  const handleActivate = () => {
    startTransition(async () => {
      const result = await activateLessonAction({ recordId });
      if (result.success) {
        setStatus("ACTIVE");
        setConfirming(false);
        toast.success("Lição ativada! A prática já está liberada para os alunos.");
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <>
      <Button
        onClick={() => setConfirming(true)}
        size="sm"
        className="shrink-0 bg-amber-600 font-bold hover:bg-amber-700"
      >
        <Sparkles className="mr-1.5 h-3.5 w-3.5" />
        Ativar lição
      </Button>

      <Modal isOpen={confirming} onClose={() => setConfirming(false)} title="Ativar lição?">
        <div className="p-6">
          <p className="text-sm text-slate-600">
            Isso libera a prática desta lição para os alunos desta turma. Como a lição pode ser
            usada por outras turmas através do plano de ensino, a prática é liberada para elas
            também.
          </p>
          <ModalFooter>
            <Button variant="outline" onClick={() => setConfirming(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button className="bg-amber-600 hover:bg-amber-700" onClick={handleActivate} loading={isPending}>
              Ativar lição
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </>
  );
}
