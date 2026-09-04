"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { StreamVideoClient, type Call } from "@stream-io/video-react-sdk";

interface UseStreamCallParams {
  apiKey: string;
  /**
   * Busca um token de entrada válido — chamado pelo SDK do Stream ao conectar
   * e de novo em toda reconexão automática (ex: o token anterior expirou).
   * Passar uma string estática aqui foi o que fazia toda aula cair sozinha
   * depois de 1h: o SDK nunca tinha como pedir um token novo.
   */
  getToken: () => Promise<string>;
  callId: string;
  userId: string;
  userName: string;
  userImage?: string | null;
}

interface UseStreamCallResult {
  client: StreamVideoClient;
  call: Call;
  /** Mensagem de erro se `call.join()` falhar (ex: token expirado, rede). */
  error: string | null;
}

/**
 * Cria o client + a call do Stream e entra na chamada — a call já foi
 * provisionada no servidor (via `classService.startCall`/`getStudentCallAccess`
 * -> `ensureCallAndGenerateToken`), então aqui é só join.
 *
 * `client`/`call` são construídos via `useMemo`, não dentro do efeito: a
 * construção em si (`new StreamVideoClient(...)`, `client.call(...)`) é
 * síncrona e sem I/O — só `.join()` faz rede, e por isso é o único que vive
 * no `useEffect`. Isso evita precisar de `setState` dentro do efeito só para
 * expor o client/call (o padrão que o eslint-plugin-react-hooks rejeita).
 *
 * Quem usa este hook envolve os filhos em
 * `<StreamVideo client={client}><StreamCall call={call}>` — os hooks de
 * estado (`useCallStateHooks`) só funcionam dentro desses providers, então
 * este hook não expõe `callingState`/`participants` diretamente.
 */
export function useStreamCall({
  apiKey,
  getToken,
  callId,
  userId,
  userName,
  userImage,
}: UseStreamCallParams): UseStreamCallResult {
  const [error, setError] = useState<string | null>(null);

  const client = useMemo(
    () =>
      new StreamVideoClient({
        apiKey,
        user: { id: userId, name: userName, image: userImage ?? undefined },
        tokenProvider: getToken,
      }),
    [apiKey, getToken, userId, userName, userImage]
  );

  const call = useMemo(() => client.call("default", callId), [client, callId]);

  const joinedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    joinedRef.current = false;

    async function run() {
      // Habilita os dispositivos ANTES de entrar — é o padrão recomendado
      // pelo SDK (a call já entra publicando). Fazer isso DEPOIS do
      // join() força uma renegociação separada logo em seguida, que na
      // prática deixava o vídeo/controles presos (câmera ligava mas
      // nenhum tile aparecia, e os botões de controle — que só renderizam
      // quando o SDK confirma a permissão de publicar — nunca chegavam a
      // aparecer) até a página ser recarregada.
      try {
        await call.camera.enable();
        await call.microphone.enable();
      } catch {
        // Permissão negada ou dispositivo indisponível — segue sem
        // publicar vídeo/áudio local, a chamada continua normalmente.
      }
      if (cancelled) return;

      try {
        await call.join();
        if (cancelled) return;
        joinedRef.current = true;
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Não foi possível entrar na chamada.");
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
      // Só desconecta se de fato chegou a entrar — desconectar um client
      // que ainda está no meio do join() corrompia a sessão (o mesmo efeito
      // rodando de novo, ex: Fast Refresh, reentrava numa call já em
      // processo de ser derrubada pela limpeza anterior).
      if (joinedRef.current) {
        call.leave().catch(() => {});
        client.disconnectUser().catch(() => {});
      }
    };
  }, [call, client]);

  return { client, call, error };
}
