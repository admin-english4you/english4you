"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, Circle, Radio } from "lucide-react";
import { ActivateLessonButton } from "./ActivateLessonButton";
import type { LessonStatus } from "@/modules/lesson/lesson.types";

interface TeacherClassRoomTopBarProps {
  title: string;
  level: string;
  classGroupId: string;
  className: string;
  status: "NOT_STARTED" | "LIVE" | "ENDED";
  /** `null` antes da aula começar — ativação só faz sentido depois de aberta. */
  activateLesson: { recordId: string; lessonStatus: LessonStatus } | null;
}

const STATUS_CONFIG = {
  NOT_STARTED: {
    label: "Não iniciada",
    className: "bg-slate-800 text-slate-300",
    icon: Circle,
  },
  LIVE: {
    label: "Ao vivo",
    className: "bg-rose-500/15 text-rose-400",
    icon: Radio,
  },
  ENDED: {
    label: "Encerrada",
    className: "bg-emerald-500/15 text-emerald-400",
    icon: CheckCircle2,
  },
} as const;

export function TeacherClassRoomTopBar({
  title,
  level,
  classGroupId,
  className,
  status,
  activateLesson,
}: TeacherClassRoomTopBarProps) {
  const config = STATUS_CONFIG[status];
  const StatusIcon = config.icon;

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-800 bg-slate-900 px-3 sm:px-5">
      <Link
        href={`/teacher/classes/${classGroupId}`}
        aria-label="Voltar para a turma"
        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>

      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          {className} · {level}
        </p>
        <h1 className="truncate text-sm font-bold text-white">{title}</h1>
      </div>

      {activateLesson && (
        <ActivateLessonButton recordId={activateLesson.recordId} lessonStatus={activateLesson.lessonStatus} />
      )}

      <span
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${config.className}`}
      >
        <StatusIcon className={`h-3 w-3 ${status === "LIVE" ? "animate-pulse" : ""}`} />
        {config.label}
      </span>
    </header>
  );
}
