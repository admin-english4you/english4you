"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { toDayKey } from "@/lib/date";
import type { StudentClassRecordDetail } from "@/modules/class/class.types";
import type { CallAccess } from "@/lib/stream-server";
import { ClassRoomTopBar } from "./ClassRoomTopBar";
import { LessonReader } from "@/components/lesson/LessonReader";
import { VideoPanel } from "./VideoPanel";

interface LiveClassRoomProps {
  record: StudentClassRecordDetail;
  initialCallAccess: CallAccess | null;
  selfId: string;
  selfName: string;
  selfAvatarUrl: string | null;
  todayKey: string;
}

export function LiveClassRoom({
  record,
  initialCallAccess,
  selfId,
  selfName,
  selfAvatarUrl,
  todayKey,
}: LiveClassRoomProps) {
  // No mobile a chamada vira uma gaveta recolhível no topo, para o conteúdo
  // da lição não ficar espremido em telas pequenas.
  const [videoOpenMobile, setVideoOpenMobile] = useState(false);

  const lesson = record.lesson;
  const isLive = toDayKey(record.date) === todayKey;

  return (
    <div className="flex h-screen flex-col">
      <ClassRoomTopBar
        title={lesson?.title ?? "Aula"}
        level={lesson?.level ?? record.classGroup.level}
        teacherName={record.effectiveTeacher?.name ?? null}
        date={record.date}
        todayKey={todayKey}
        isLive={isLive}
      />

      {/* `min-h-0` no grid E nos dois filhos é obrigatório: sem ele o
          overflow-y-auto não rola dentro da linha do grid e a página estoura
          a viewport. */}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-4">
        {/* Conteúdo da lição — 3/4 da largura, altura total, rolagem própria */}
        <section className="order-2 min-h-0 overflow-y-auto bg-white lg:order-1 lg:col-span-3">
          <LessonReader
            title={lesson?.title ?? "Aula"}
            level={lesson?.level ?? record.classGroup.level}
            html={lesson?.content ?? ""}
            audioUrl={lesson?.audioUrl ?? null}
            videoUrl={lesson?.videoUrl ?? null}
          />
        </section>

        {/* Chamada de vídeo — 1/4 da largura, altura total */}
        <aside
          className={cn(
            "order-1 min-h-0 border-slate-800 lg:order-2 lg:col-span-1 lg:h-full lg:border-l",
            videoOpenMobile ? "h-auto border-b lg:h-full" : "h-auto border-b lg:h-full"
          )}
        >
          <button
            type="button"
            onClick={() => setVideoOpenMobile((v) => !v)}
            aria-expanded={videoOpenMobile}
            className="flex w-full items-center justify-between bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-300 lg:hidden"
          >
            <span className="flex items-center gap-2">
              Chamada de vídeo
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                {record.completed ? "Encerrada" : "Ao vivo"}
              </span>
            </span>
            {videoOpenMobile ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          <div className={cn("h-full", videoOpenMobile ? "block" : "hidden lg:block")}>
            <VideoPanel
              classRecordId={record.id}
              initialCallAccess={initialCallAccess}
              callStarted={Boolean(record.callStartedAt)}
              callEnded={record.completed}
              recordingUrls={record.recordingUrls}
              teacherName={record.effectiveTeacher?.name ?? null}
              participants={record.classmates}
              selfId={selfId}
              selfName={selfName}
              selfAvatarUrl={selfAvatarUrl}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
