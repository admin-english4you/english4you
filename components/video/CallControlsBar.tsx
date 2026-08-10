"use client";

import { ToggleAudioPublishingButton, ToggleVideoPublishingButton, ScreenShareButton } from "@stream-io/video-react-sdk";
import { LeaveCallButton } from "./LeaveCallButton";

interface CallControlsBarProps {
  /** Compartilhar tela é só do professor — o aluno nunca vê este botão. */
  canShareScreen?: boolean;
  /** "Sair da chamada" — só o aluno tem; o professor sai encerrando a aula (CallControls). */
  showLeave?: boolean;
}

/** Barra de controles da chamada: mic, câmera, (opcionalmente) compartilhar tela e sair. */
export function CallControlsBar({ canShareScreen = false, showLeave = false }: CallControlsBarProps) {
  return (
    <div className="flex shrink-0 items-center justify-center gap-2 border-t border-slate-800 bg-slate-900 p-3">
      <ToggleAudioPublishingButton />
      <ToggleVideoPublishingButton />
      {canShareScreen && <ScreenShareButton />}
      {showLeave && <LeaveCallButton />}
    </div>
  );
}
