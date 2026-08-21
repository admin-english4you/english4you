"use client";

import { useState } from "react";
import { Headphones } from "lucide-react";
import type { TeacherClassRecordDetail } from "@/modules/class/class.types";
import type { CallAccess } from "@/lib/stream-server";
import { TeacherClassRoomTopBar } from "./TeacherClassRoomTopBar";
import { BoardEditor } from "./BoardEditor";
import { TeacherVideoPanel } from "./TeacherVideoPanel";
import type { CallStatus } from "./CallControls";

interface TeacherClassRoomProps {
  record: TeacherClassRecordDetail;
  initialCallAccess: CallAccess | null;
  selfId: string;
  selfName: string;
  selfAvatarUrl: string | null;
}

function deriveStatus(record: TeacherClassRecordDetail): CallStatus {
  if (record.callStartedAt && !record.completed) return "LIVE";
  if (record.completed) return "ENDED";
  return "NOT_STARTED";
}

export function TeacherClassRoom({
  record,
  initialCallAccess,
  selfId,
  selfName,
  selfAvatarUrl,
}: TeacherClassRoomProps) {
  const [status, setStatus] = useState<CallStatus>(deriveStatus(record));
  const [callAccess, setCallAccess] = useState<CallAccess | null>(initialCallAccess);
  const lesson = record.lesson;

  // Ponto de partida do editor: uma CÓPIA do material canônico, na primeira
  // vez que a sala é aberta (boardContent ainda vazio) — não faz sentido
  // mostrar o material original em somente-leitura ao lado de uma cópia
  // editável dele, então só existe UM editor na tela. Editar aqui nunca
  // volta a afetar lessons.content nem outras turmas.
  const initialBoardContent = record.boardContent || lesson?.content || "";

  // Visível assim que a aula é aberta pela primeira vez, e continua visível
  // mesmo que a chamada seja encerrada/reaberta depois — ativação é sempre
  // uma decisão manual do professor, nunca amarrada ao estado da chamada.
  const hasStarted = status !== "NOT_STARTED";

  return (
    <div className="flex h-screen flex-col">
      <TeacherClassRoomTopBar
        title={lesson?.title ?? "Aula"}
        level={lesson?.level ?? record.classGroup.level}
        classGroupId={record.classGroupId}
        className={record.classGroup.name}
        status={status}
        activateLesson={hasStarted && lesson ? { recordId: record.id, lessonStatus: lesson.status } : null}
      />

      {/* `min-h-0` no grid E nos filhos é obrigatório: sem ele o overflow-y-auto
          não rola dentro da linha do grid e a página estoura a viewport. */}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-4">
        <section className="flex min-h-0 flex-col lg:col-span-3">
          {/* O LessonReader do aluno mostra o áudio da lição, mas o professor só
              via o board (texto) — nunca tinha como ouvir o próprio áudio aqui. */}
          {lesson?.audioUrl && (
            <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2">
              <Headphones className="h-4 w-4 shrink-0 text-slate-500" />
              <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Áudio da aula
              </span>
              <audio src={lesson.audioUrl} controls preload="metadata" className="h-8 max-w-md flex-1" />
            </div>
          )}
          <div className="min-h-0 flex-1">
            <BoardEditor recordId={record.id} initialContent={initialBoardContent} />
          </div>
        </section>

        <aside className="min-h-0 border-t border-slate-800 lg:col-span-1 lg:border-t-0 lg:border-l">
          <TeacherVideoPanel
            recordId={record.id}
            status={status}
            callAccess={callAccess}
            recordingUrls={record.recordingUrls}
            onStart={(access) => {
              setCallAccess(access);
              setStatus("LIVE");
            }}
            onEnd={() => {
              setCallAccess(null);
              setStatus("ENDED");
            }}
            onDisconnected={() => {
              // Conexão caiu (internet/energia) sem o professor ter clicado
              // em "Encerrar aula" — server-side `completed` continua false,
              // só o estado local volta pra "precisa (re)entrar", pra ele
              // conseguir clicar em "Reabrir chamada" e voltar pra MESMA call.
              setCallAccess(null);
              setStatus("ENDED");
            }}
            students={record.students}
            selfId={selfId}
            selfName={selfName}
            selfAvatarUrl={selfAvatarUrl}
          />
        </aside>
      </div>
    </div>
  );
}
