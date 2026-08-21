"use client";

import { ParticipantView, useCallStateHooks, type StreamVideoParticipant } from "@stream-io/video-react-sdk";
import { hasScreenShare } from "@stream-io/video-client";

interface ParticipantGridProps {
  /**
   * No MOBILE, mostra só um tile — o compartilhamento de tela em andamento
   * (se houver) ou este usuário (o professor, no caso do aluno) — em vez da
   * grade completa. Numa tela pequena, ver a si mesmo e os colegas junto do
   * professor só atrapalha; o que importa é ver a aula. Sem este prop (ex:
   * painel do professor), o mobile mostra a grade completa igual ao
   * desktop, que continua sempre com a grade completa de qualquer forma.
   */
  mobileFocusUserId?: string;
}

/**
 * Alguns navegadores mobile (Chrome/Safari no iOS) bloqueiam silenciosamente
 * o autoplay de um `<video>` remoto sem `muted`/`playsInline`: o elemento
 * fica na tela, mas o `.play()` interno do SDK nunca "pega", e o aluno vê um
 * tile vazio mesmo com a câmera do professor ligada — no desktop os
 * navegadores são mais permissivos e o mesmo código funciona sem isso.
 * `refs.setVideoElement` é o gancho que o SDK expõe pra alcançar o elemento
 * de vídeo real (ver `ParticipantView`). Marcar como `muted` aqui não afeta
 * o áudio da chamada: o SDK reproduz o áudio de cada participante num
 * `<audio>` completamente separado (ver `Audio.tsx` do SDK).
 */
const videoRefs = {
  setVideoElement: (element: HTMLVideoElement | null) => {
    if (!element) return;
    element.muted = true;
    element.playsInline = true;
  },
};

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
export function ParticipantGrid({ mobileFocusUserId }: ParticipantGridProps) {
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

  const mobileFocus: StreamVideoParticipant | null = mobileFocusUserId
    ? (presenter ?? participants.find((p) => p.userId === mobileFocusUserId) ?? participants[0])
    : null;

  return (
    <div className="flex h-full flex-col gap-2 p-2">
      {mobileFocus && (
        <div className="e4y-video-tile relative aspect-video overflow-hidden rounded-lg border border-slate-800 bg-slate-950 lg:hidden">
          <ParticipantView
            participant={mobileFocus}
            trackType={mobileFocus === presenter ? "screenShareTrack" : "videoTrack"}
            refs={videoRefs}
          />
        </div>
      )}

      <div className={mobileFocus ? "hidden lg:flex lg:flex-1 lg:flex-col lg:gap-2" : "flex flex-1 flex-col gap-2"}>
        {presenter && (
          <div className="e4y-video-tile relative aspect-video overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
            <ParticipantView participant={presenter} trackType="screenShareTrack" refs={videoRefs} />
          </div>
        )}

        <div className={presenter ? "grid grid-cols-3 gap-2" : "grid grid-cols-2 gap-2"}>
          {participants.map((participant) => (
            <div
              key={participant.sessionId}
              className="e4y-video-tile relative aspect-video overflow-hidden rounded-lg border border-slate-800 bg-slate-800/60"
            >
              <ParticipantView participant={participant} refs={videoRefs} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
