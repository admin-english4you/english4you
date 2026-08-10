"use client";

import { useState, useTransition } from "react";
import { PhoneOff, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { toast } from "@/components/ui/toaster";
import { startCallAction, endCallAction } from "@/modules/class/class.actions";
import type { CallAccess } from "@/lib/stream-server";

export type CallStatus = "NOT_STARTED" | "LIVE" | "ENDED";

interface CallControlsProps {
  recordId: string;
  status: CallStatus;
  onStart: (access: CallAccess) => void;
  onEnd: () => void;
}

export function CallControls({ recordId, status, onStart, onEnd }: CallControlsProps) {
  const [isPending, startTransition] = useTransition();
  const [confirmingEnd, setConfirmingEnd] = useState(false);

  const handleStart = () => {
    startTransition(async () => {
      const result = await startCallAction({ recordId });
      if (result.success && result.data) {
        onStart(result.data);
        toast.success("Chamada iniciada. A gravação começa assim que você entrar.");
      } else if (!result.success) {
        toast.error(result.error);
      }
    });
  };

  const handleEnd = () => {
    startTransition(async () => {
      const result = await endCallAction({ recordId });
      if (result.success) {
        onEnd();
        setConfirmingEnd(false);
        toast.success("Aula encerrada. A gravação ficará disponível em breve.");
      } else {
        toast.error(result.error);
      }
    });
  };

  if (status === "LIVE") {
    return (
      <>
        <Button
          onClick={() => setConfirmingEnd(true)}
          variant="outline"
          className="w-full border-rose-800 text-rose-400 hover:bg-rose-950"
        >
          <PhoneOff className="mr-2 h-4 w-4" />
          Encerrar aula
        </Button>

        <Modal isOpen={confirmingEnd} onClose={() => setConfirmingEnd(false)} title="Encerrar aula?">
          <div className="p-6">
            <p className="text-sm text-slate-600">
              Isso desconecta todos os participantes e para a gravação atual. Você pode reabrir a
              chamada depois, se precisar — as gravações de todas as sessões desta aula ficam
              guardadas juntas.
            </p>
            <ModalFooter>
              <Button variant="outline" onClick={() => setConfirmingEnd(false)} disabled={isPending}>
                Cancelar
              </Button>
              <Button className="bg-rose-600 hover:bg-rose-700" onClick={handleEnd} loading={isPending}>
                Encerrar aula
              </Button>
            </ModalFooter>
          </div>
        </Modal>
      </>
    );
  }

  // NOT_STARTED ou ENDED: mesmo botão, rótulo diferente. Reabrir é permitido
  // quantas vezes for preciso (internet/energia pode cair no meio da aula) —
  // o callId é determinístico, então é sempre a MESMA call no Stream, e as
  // gravações de cada sessão se acumulam em vez de se substituírem.
  return (
    <Button onClick={handleStart} loading={isPending} className="w-full bg-rose-600 font-bold hover:bg-rose-700">
      <Video className="mr-2 h-4 w-4" />
      {status === "ENDED" ? "Reabrir chamada" : "Iniciar chamada"}
    </Button>
  );
}
