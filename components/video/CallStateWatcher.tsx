"use client";

import { useEffect, useRef } from "react";
import { CallingState, useCallStateHooks } from "@stream-io/video-react-sdk";

interface CallStateWatcherProps {
  /** Disparado exatamente uma vez, quando o `callingState` vira JOINED. */
  onJoined?: () => void;
  /**
   * Disparado exatamente uma vez se, DEPOIS de ter entrado, a conexão cai
   * (internet/energia) ou o host encerra a call — cobre `LEFT`,
   * `RECONNECTING_FAILED` e `OFFLINE`. Quem usa isto deve limpar o
   * `callAccess` local pra voltar pra tela de "(re)entrar na chamada", já
   * que a call em si continua existindo no Stream (mesmo callId) e pode ser
   * reaberta a qualquer momento.
   */
  onLeft?: () => void;
}

const DISCONNECTED_STATES = new Set([
  CallingState.LEFT,
  CallingState.RECONNECTING_FAILED,
  CallingState.OFFLINE,
]);

/**
 * Componente sem render — precisa viver DENTRO de `<StreamVideo><StreamCall>`
 * pra `useCallStateHooks()` funcionar. Existe só pra observar transições de
 * `callingState` e avisar quem está por fora (marcar presença, ligar a
 * gravação, detectar queda de conexão), sem forçar o painel de vídeo inteiro
 * a saber sobre isso.
 */
export function CallStateWatcher({ onJoined, onLeft }: CallStateWatcherProps) {
  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();
  const joinedFiredRef = useRef(false);
  const leftFiredRef = useRef(false);

  useEffect(() => {
    if (callingState === CallingState.JOINED && !joinedFiredRef.current) {
      joinedFiredRef.current = true;
      onJoined?.();
    }

    if (joinedFiredRef.current && DISCONNECTED_STATES.has(callingState) && !leftFiredRef.current) {
      leftFiredRef.current = true;
      onLeft?.();
    }
  }, [callingState, onJoined, onLeft]);

  return null;
}
