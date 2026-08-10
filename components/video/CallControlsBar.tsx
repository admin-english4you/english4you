"use client";

import { Mic, MicOff, ScreenShare, Video, VideoOff } from "lucide-react";
import { useCallStateHooks } from "@stream-io/video-react-sdk";
import { cn } from "@/lib/utils";
import { LeaveCallButton } from "./LeaveCallButton";

interface CallControlsBarProps {
  /** Compartilhar tela é só do professor — o aluno nunca vê este botão. */
  canShareScreen?: boolean;
  /** "Sair da chamada" — só o aluno tem; o professor sai encerrando a aula (CallControls). */
  showLeave?: boolean;
}

/**
 * Barra de controles da chamada: mic, câmera, (opcionalmente) compartilhar
 * tela e sair.
 *
 * Botões PRÓPRIOS em vez dos prontos do SDK (`ToggleAudioPublishingButton` e
 * companhia): os botões do SDK desenham o ícone via CSS puro
 * (`mask-image` numa `<span>` vazia, ver `@stream-io/video-react-sdk/dist/css/styles.css`)
 * e, neste bundle, o ícone nunca aparece — só a área clicável e o tooltip
 * nativo (`title`) no hover, o botão em si fica invisível. Aqui os ícones são
 * SVG inline (lucide-react), sempre visíveis independente de qualquer CSS de
 * terceiro; o estado (mudo/câmera desligada/compartilhando) ainda vem direto
 * dos hooks do SDK, então o comportamento é o mesmo.
 */
export function CallControlsBar({ canShareScreen = false, showLeave = false }: CallControlsBarProps) {
  return (
    <div className="flex shrink-0 items-center justify-center gap-2 border-t border-slate-800 bg-slate-900 p-3">
      <MicToggleButton />
      <CameraToggleButton />
      {canShareScreen && <ScreenShareToggleButton />}
      {showLeave && <LeaveCallButton />}
    </div>
  );
}

function ControlButton({
  label,
  active,
  tone = "media",
  disabled,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  /**
   * "media" (mic/câmera): estado normal é LIGADO (cor neutra) — desligar é
   * a exceção que merece destaque em rosa, já que significa "ninguém te vê
   * nem te ouve". "share": estado normal é DESLIGADO (cor neutra) —
   * compartilhar tela é a ação em destaque, não um alerta.
   */
  tone?: "media" | "share";
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const highlighted = tone === "media" ? !active : active;
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        highlighted
          ? tone === "media"
            ? "bg-rose-600 text-white hover:bg-rose-700"
            : "bg-sky-600 text-white hover:bg-sky-700"
          : "bg-slate-700 text-white hover:bg-slate-600"
      )}
    >
      {children}
    </button>
  );
}

function MicToggleButton() {
  const { useMicrophoneState } = useCallStateHooks();
  const { microphone, optionsAwareIsMute, isTogglePending } = useMicrophoneState();

  return (
    <ControlButton
      label={optionsAwareIsMute ? "Ativar microfone" : "Desativar microfone"}
      active={!optionsAwareIsMute}
      disabled={isTogglePending}
      onClick={() => void microphone.toggle()}
    >
      {optionsAwareIsMute ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </ControlButton>
  );
}

function CameraToggleButton() {
  const { useCameraState } = useCallStateHooks();
  const { camera, optionsAwareIsMute, isTogglePending } = useCameraState();

  return (
    <ControlButton
      label={optionsAwareIsMute ? "Ativar câmera" : "Desativar câmera"}
      active={!optionsAwareIsMute}
      disabled={isTogglePending}
      onClick={() => void camera.toggle()}
    >
      {optionsAwareIsMute ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
    </ControlButton>
  );
}

function ScreenShareToggleButton() {
  const { useScreenShareState, useHasOngoingScreenShare } = useCallStateHooks();
  const { screenShare, optionsAwareIsMute, isTogglePending } = useScreenShareState();
  const isSharing = !optionsAwareIsMute;
  // Ninguém mais pode compartilhar enquanto alguém já estiver — mesma regra
  // que o botão pronto do SDK aplica (`disableScreenShareButton`).
  const someoneElseSharing = useHasOngoingScreenShare() && !isSharing;

  return (
    <ControlButton
      label={isSharing ? "Parar compartilhamento de tela" : "Compartilhar tela"}
      active={isSharing}
      tone="share"
      disabled={isTogglePending || someoneElseSharing}
      onClick={() => void screenShare.toggle()}
    >
      <ScreenShare className="h-4 w-4" />
    </ControlButton>
  );
}
