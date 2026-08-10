"use client";

import { LogOut } from "lucide-react";
import { useCall } from "@stream-io/video-react-sdk";

/**
 * Sai da chamada sem afetar os outros participantes — só o card acaba mesmo
 * se aluno se desconecta. O `CallStateWatcher` detecta a mudança de estado
 * (call.leave() → CallingState.LEFT) e volta a UI pra tela de espera sozinho.
 */
export function LeaveCallButton() {
  const call = useCall();

  return (
    <button
      type="button"
      onClick={() => void call?.leave()}
      className="flex items-center gap-1.5 rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700"
    >
      <LogOut className="h-3.5 w-3.5" />
      Sair da chamada
    </button>
  );
}
