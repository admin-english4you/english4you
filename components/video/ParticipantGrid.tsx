"use client";

import { ParticipantView, useCallStateHooks } from "@stream-io/video-react-sdk";

/** Grade de tiles com vídeo/áudio reais dos participantes conectados. */
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

  return (
    <div className="grid grid-cols-2 gap-2 p-2">
      {participants.map((participant) => (
        <div
          key={participant.sessionId}
          className="e4y-video-tile relative aspect-video overflow-hidden rounded-lg border border-slate-800 bg-slate-800/60"
        >
          <ParticipantView participant={participant} />
        </div>
      ))}
    </div>
  );
}
