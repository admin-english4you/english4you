"use client";

import { StreamVideo, StreamCall } from "@stream-io/video-react-sdk";
import { useStreamCall } from "@/hooks/useStreamCall";
import { CallStateWatcher } from "./CallStateWatcher";
// Sem isto, o SDK renderiza o <video> sem width/height (ele depende inteiramente
// das classes .str-video__* pra dimensão) — a câmera liga e publica normalmente,
// só que o elemento colapsa a 0x0 e nada aparece na tela.
import "@stream-io/video-react-sdk/dist/css/styles.css";

interface CallRoomProps {
  apiKey: string;
  /** Ver `useStreamCall` — busca um token novo a cada (re)conexão, não só na primeira. */
  getToken: () => Promise<string>;
  callId: string;
  userId: string;
  userName: string;
  userImage?: string | null;
  /** Disparado uma vez quando este usuário entra de fato na chamada. */
  onJoined?: () => void;
  /** Disparado uma vez se a conexão cair depois de ter entrado (ver CallStateWatcher). */
  onLeft?: () => void;
  children: React.ReactNode;
}

/**
 * Ponto único de entrada pro SDK de vídeo do Stream — cria o client, entra na
 * call e provê o contexto que `ParticipantGrid`/`CallStateWatcher` precisam.
 * Usado tanto pelo painel do professor quanto pelo do aluno.
 */
export function CallRoom({
  apiKey,
  getToken,
  callId,
  userId,
  userName,
  userImage,
  onJoined,
  onLeft,
  children,
}: CallRoomProps) {
  const { client, call, error } = useStreamCall({ apiKey, getToken, callId, userId, userName, userImage });

  if (error) {
    return (
      <p className="flex h-full items-center justify-center px-4 text-center text-xs text-rose-400">
        {error}
      </p>
    );
  }

  return (
    <StreamVideo client={client}>
      <StreamCall call={call}>
        <CallStateWatcher onJoined={onJoined} onLeft={onLeft} />
        {children}
      </StreamCall>
    </StreamVideo>
  );
}
