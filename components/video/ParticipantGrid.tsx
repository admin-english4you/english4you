"use client";

import { ParticipantView, useCallStateHooks } from "@stream-io/video-react-sdk";
import { hasScreenShare } from "@stream-io/video-client";

/**
 * Grade de tiles com vídeo/áudio reais dos participantes conectados.
 *
 * `ParticipantView` sem `trackType` renderiza só a câmera (`videoTrack`, o
 * default do SDK) — a track de compartilhamento de tela é uma track
 * SEPARADA (`screenShareTrack`) que nunca aparecia em lugar nenhum.
 *
 * Achar o apresentador com `hasScreenShare` (checa `publishedTracks`, que
 * chega via sinalização assim que ALGUÉM publica a track — local ou remoto)
 * em vez de `participant.screenShareStream` (só populado depois que a SFU
 * já está de fato enviando a mídia PRA VOCÊ): pro professor, que está
 * compartilhando, `screenShareStream` é o preview local e já vem pronto na
 * hora, então "funcionava" pra ele; pro aluno, que só recebe via SFU, esse
 * campo só existe DEPOIS que algum elemento de vídeo pede a track — e esse
 * pedido só acontece se a gente já tivesse decidido renderizar o tile, um
 * impasse que nunca se resolve sozinho. `hasScreenShare` quebra esse ciclo.
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

  const presenter = participants.find(hasScreenShare);

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
