"use client";

import { useEffect, useRef, useState } from "react";
import { PhoneCall, Users, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CallRoom } from "@/components/video/CallRoom";
import { ParticipantGrid } from "@/components/video/ParticipantGrid";
import { CallControlsBar } from "@/components/video/CallControlsBar";
import { RecordingsList } from "@/components/video/RecordingsList";
import { getInitials } from "@/components/ui/avatar";
import { getStudentCallAccessAction, markAttendanceAction } from "@/modules/class/class.actions";
import type { ClassmateSummary } from "@/modules/class/class.types";
import type { CallAccess } from "@/lib/stream-server";

interface VideoPanelProps {
  classRecordId: string;
  initialCallAccess: CallAccess | null;
  /** `class_records.callStartedAt` já preenchido no carregamento da página. */
  callStarted: boolean;
  /** `class_records.completed` no carregamento — só usado pro texto, não trava o poll (o professor pode reabrir). */
  callEnded: boolean;
  recordingUrls: string[];
  teacherName: string | null;
  /** Id do professor (mesmo `user_id` usado no Stream, ver `buildCallAccess`) — usado pra focar só nele no mobile dentro da call (ver `ParticipantGrid`). */
  teacherUserId: string | null;
  participants: ClassmateSummary[];
  selfId: string;
  selfName: string;
  selfAvatarUrl: string | null;
  /**
   * Avisa o pai (LiveClassRoom) toda vez que `callAccess` muda — é a fonte de
   * verdade mais fresca de "há uma chamada pra entrar agora" (atualizada pelo
   * poll abaixo), usada só pra decidir se a gaveta de vídeo do MOBILE deve
   * aparecer. No desktop o painel sempre aparece, então isto é ignorado lá.
   */
  onCallActiveChange?: (active: boolean) => void;
}

const POLL_INTERVAL_MS = 5000;

/**
 * Chamada de vídeo real do aluno (Stream).
 *
 * Sem infra de realtime neste projeto: se a página já estava aberta quando o
 * professor clicou "Iniciar chamada" (ou reabriu depois de uma queda), não
 * há como saber sem consultar de novo — por isso o poll leve continua rodando
 * sempre que não há uma call ativa, mesmo que a aula já tenha sido encerrada
 * uma vez (o professor pode reabrir a qualquer momento).
 */
export function VideoPanel({
  classRecordId,
  initialCallAccess,
  callStarted,
  callEnded,
  recordingUrls,
  teacherName,
  teacherUserId,
  participants,
  selfId,
  selfName,
  selfAvatarUrl,
  onCallActiveChange,
}: VideoPanelProps) {
  const [callAccess, setCallAccess] = useState<CallAccess | null>(initialCallAccess);
  const [wasEverConnected, setWasEverConnected] = useState(false);
  // Ingressar é sempre uma ação explícita do aluno, mesmo se a chamada já
  // estava ao vivo no carregamento da página — nunca entra sozinho ligando
  // câmera/mic sem o aluno saber.
  const [wantsToJoin, setWantsToJoin] = useState(false);

  useEffect(() => {
    onCallActiveChange?.(!!callAccess);
  }, [callAccess, onCallActiveChange]);

  useEffect(() => {
    // Só para de revalidar depois que o aluno ENTROU de fato na chamada
    // (CallStateWatcher assume dali em diante, ver handleLeft). Enquanto
    // `wantsToJoin` é false — inclusive com `callAccess` já setado, tela
    // "Entrar na chamada" — o poll continua: sem isso, um professor que
    // encerra a aula enquanto o aluno está parado nessa tela nunca é
    // percebido, e o botão de entrar fica ativo pra sempre, apontando pra
    // uma call que já não existe mais (o aluno conseguiria efetivamente
    // reabri-la ao clicar). Depende só de `wantsToJoin`, não de `callAccess`
    // — senão cada resposta do poll (um token novo, mesmo que a call
    // continue a mesma) reiniciaria este efeito e disparava outro poll na
    // hora, num ciclo sem o intervalo de 5s valer nada.
    if (wantsToJoin) return;

    let cancelled = false;
    const poll = () => {
      getStudentCallAccessAction({ recordId: classRecordId }).then((result) => {
        if (cancelled) return;
        if (result.success) {
          setCallAccess(result.data ?? null);
        }
      });
    };

    // Tenta na hora também, não só depois do primeiro intervalo — importante
    // pra quem cai e reabre rápido (não faz sentido esperar até 5s à toa).
    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [wantsToJoin, classRecordId]);

  const markedRef = useRef(false);
  const handleJoined = () => {
    setWasEverConnected(true);
    if (markedRef.current) return;
    markedRef.current = true;
    void markAttendanceAction({ recordId: classRecordId });
  };

  // Conexão caiu (internet/energia), o aluno saiu ou o professor encerrou a
  // call — volta pra tela de espera; o poll acima resume sozinho. Exige um
  // novo clique em "Entrar na chamada" da próxima vez, mesmo que a call
  // continue ao vivo (ex: o aluno mesmo saiu de propósito).
  const handleLeft = () => {
    setCallAccess(null);
    setWantsToJoin(false);
  };

  if (callAccess && !wantsToJoin) {
    return (
      <div className="flex h-fit flex-col bg-slate-900">
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 p-4">
          <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl border border-slate-800 bg-gradient-to-br from-slate-800 to-slate-900">
            <span className="text-2xl font-bold text-slate-600">
              {teacherName ? getInitials(teacherName) : <Video className="h-6 w-6" />}
            </span>
            {teacherName && (
              <span className="absolute bottom-2 left-2 max-w-[80%] truncate rounded bg-slate-950/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-200">
                {teacherName}
              </span>
            )}
          </div>
          <p className="text-center text-xs text-slate-400">A aula já está ao vivo.</p>
          <Button onClick={() => setWantsToJoin(true)} className="w-full bg-rose-600 font-bold hover:bg-rose-700">
            <PhoneCall className="mr-2 h-4 w-4" />
            Entrar na chamada
          </Button>
        </div>
      </div>
    );
  }

  if (callAccess) {
    return (
      <div className="flex h-fit flex-col bg-slate-900">
      
        <div className="flex flex-col">
          <CallRoom
            apiKey={callAccess.apiKey}
            token={callAccess.token}
            callId={callAccess.callId}
            userId={selfId}
            userName={selfName}
            userImage={selfAvatarUrl}
            onJoined={handleJoined}
            onLeft={handleLeft}
          >
            <div>            
              <CallControlsBar showLeave />
              <ParticipantGrid mobileFocusUserId={teacherUserId ?? undefined} />
            </div>
          </CallRoom>
        </div>
      </div>
    );
  }

  // Aula já gravada e sem chamada ao vivo agora: mostra só a gravação, sem o
  // placeholder de "aguardando professor" nem o grid de colegas — nenhum dos
  // dois faz sentido pra quem só quer reassistir. Também corta bastante a
  // altura do conteúdo, que era o que estourava o scroll no mobile (a gaveta
  // ali é "h-fit", sem scroll interno próprio — ela só cabe se o conteúdo for
  // curto o bastante pra não precisar rolar).
  if (recordingUrls.length > 0) {
    return (
      <div className="flex h-full flex-col bg-slate-900">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-800 px-4 py-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Gravação da aula
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <RecordingsList urls={recordingUrls} />
        </div>
      </div>
    );
  }

  const waitingLabel = wasEverConnected || callEnded ? "Aguardando o professor voltar" : callStarted ? "Conectando..." : "Aguardando o professor";

  // Aguardando o professor (ainda não começou, ou caiu e ainda não voltou) —
  // mesmo roster estático de antes, como placeholder.
  return (
    <div className="flex h-full flex-col bg-slate-900">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-800 px-4 py-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Chamada de vídeo
        </span>
        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
          {waitingLabel}
        </span>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {/* Sem avatar do professor aqui de propósito — ele ainda NÃO está
            conectado nesta tela (chamada não começou, ou o professor caiu e
            não voltou), então um avatar pareceria uma câmera ligada. Borda
            tracejada + indicador pulsando comunicam "aguardando", não "ao
            vivo" (mesmo idioma visual do estado vazio de "Colegas" abaixo). */}
        <div className="relative flex aspect-video flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-dashed border-slate-700 bg-slate-900/60 px-4 text-center">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-slate-600 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-slate-600" />
          </span>
          <p className="text-xs font-medium text-slate-400">{waitingLabel}</p>
          {teacherName && <p className="max-w-[85%] truncate text-[11px] text-slate-600">{teacherName}</p>}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Colegas</p>
            <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
              <Users className="h-3 w-3" />
              {participants.length}
            </span>
          </div>

          {participants.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {participants.map((person) => (
                <div
                  key={person.id}
                  className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-800 bg-slate-800/30"
                  title={`${person.name} — ainda não conectado`}
                >
                  <span className="text-xs font-bold text-slate-600">{getInitials(person.name)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-slate-800 px-3 py-4 text-center text-xs text-slate-500">
              Nenhum colega na turma ainda.
            </p>
          )}
        </div>

        <RecordingsList urls={recordingUrls} />
      </div>
    </div>
  );
}
