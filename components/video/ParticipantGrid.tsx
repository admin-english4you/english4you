"use client";

import { ParticipantView, useCallStateHooks } from "@stream-io/video-react-sdk";

/**
 * Grade de tiles com vídeo/áudio reais dos participantes conectados.
 *
 * `ParticipantView` sem `trackType` renderiza só a câmera (`videoTrack`, o
 * default do SDK) — a track de compartilhamento de tela é uma track
 * SEPARADA (`screenShareTrack`) que nunca aparecia em lugar nenhum, nem pro
 * próprio professor. Quando alguém está compartilhando (`screenShareStream`
 * presente no participante), essa tela ganha um tile grande em destaque
 * (mesma ideia do `SpeakerLayout` pronto do SDK), e a grade de câmeras
 * continua embaixo, menor.
 */
export function ParticipantGrid() {
  const { useParticipants } = useCallStateHooks();
  const participants = useParticipants();

  if (participants.length === 0) {
    return (
      <p className="flex h-full min-h-32 items-center justify-center px-4 text-center text-xs text-slate-500">
        Aguardando participantes entrarem...
      </p>
    );
  }

  const presenter = participants.find((participant) => !!participant.screenShareStream);

  return (
    <div className="flex h-full flex-col gap-2 p-2">
      {presenter && (
        <div className="e4y-video-tile relative aspect-video overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
          <ParticipantView participant={presenter} trackType="screenShareTrack" />
        </div>
      )}

      <div className={presenter ? "grid grid-cols-3 gap-2" : "grid grid-cols-2 gap-2"}>
        {participants.map((participant) => (
          <div
            key={participant.sessionId}
            className="e4y-video-tile relative aspect-video overflow-hidden rounded-lg border border-slate-800 bg-slate-800/60"
          >
            <ParticipantView participant={participant} />
          </div>
        ))}
      </div>
    </div>
  );
}
