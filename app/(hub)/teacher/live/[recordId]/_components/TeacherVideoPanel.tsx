"use client";

import { Users, Video } from "lucide-react";
import { CallRoom } from "@/components/video/CallRoom";
import { ParticipantGrid } from "@/components/video/ParticipantGrid";
import { CallControlsBar } from "@/components/video/CallControlsBar";
import { RecordingsList } from "@/components/video/RecordingsList";
import { getInitials } from "@/components/ui/avatar";
import { startCallRecordingAction } from "@/modules/class/class.actions";
import type { ClassmateSummary } from "@/modules/class/class.types";
import type { CallAccess } from "@/lib/stream-server";
import { CallControls, type CallStatus } from "./CallControls";

interface TeacherVideoPanelProps {
  recordId: string;
  status: CallStatus;
  callAccess: CallAccess | null;
  recordingUrls: string[];
  onStart: (access: CallAccess) => void;
  onEnd: () => void;
  /** Conexão caiu (internet/energia) depois de já ter entrado — ver TeacherClassRoom. */
  onDisconnected: () => void;
  students: ClassmateSummary[];
  selfId: string;
  selfName: string;
  selfAvatarUrl: string | null;
}

export function TeacherVideoPanel({
  recordId,
  status,
  callAccess,
  recordingUrls,
  onStart,
  onEnd,
  onDisconnected,
  students,
  selfId,
  selfName,
  selfAvatarUrl,
}: TeacherVideoPanelProps) {
  const isLiveWithAccess = status === "LIVE" && callAccess !== null;

  return (
    <div className="flex h-full flex-col bg-slate-900">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-800 px-4 py-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Chamada de vídeo
        </span>
        {!isLiveWithAccess && (
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
            {status === "ENDED" ? "Encerrada" : "Aguardando início"}
          </span>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {isLiveWithAccess ? (
          <CallRoom
            apiKey={callAccess.apiKey}
            token={callAccess.token}
            callId={callAccess.callId}
            userId={selfId}
            userName={selfName}
            userImage={selfAvatarUrl}
            // Só o PRÓPRIO professor liga a gravação, e só depois de entrar
            // de fato na sessão — o Stream exige uma sessão ativa pra
            // startRecording() (ver lib/stream-server.ts).
            onJoined={() => {
              void startCallRecordingAction({ recordId });
            }}
            onLeft={onDisconnected}
          >
            <div className="min-h-0 flex-1 overflow-y-auto">
              <ParticipantGrid />
            </div>
            <CallControlsBar canShareScreen />
          </CallRoom>
        ) : (
          <div className="space-y-4 p-4">
            {/* Tracejada, igual ao estado vazio de "Alunos" abaixo — sinaliza
                "ainda não está ao vivo", não uma câmera já ligada. */}
            <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-700 bg-slate-900/60">
              <Video className="h-7 w-7 text-slate-600" />
              <span className="absolute bottom-2 left-2 rounded bg-slate-950/70 px-1.5 py-0.5 text-[10px] font-medium text-slate-300">
                Você (professor)
              </span>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Alunos
                </p>
                <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                  <Users className="h-3 w-3" />
                  {students.length}
                </span>
              </div>

              {students.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {students.map((student) => (
                    <div
                      key={student.id}
                      className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-800 bg-slate-800/30"
                      title={`${student.name} — ainda não conectado`}
                    >
                      <span className="text-xs font-bold text-slate-600">{getInitials(student.name)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-slate-800 px-3 py-4 text-center text-xs text-slate-500">
                  Nenhum aluno na turma ainda.
                </p>
              )}
            </div>

            <RecordingsList urls={recordingUrls} />
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-slate-800 p-3">
        <CallControls recordId={recordId} status={status} onStart={onStart} onEnd={onEnd} />
      </div>
    </div>
  );
}
