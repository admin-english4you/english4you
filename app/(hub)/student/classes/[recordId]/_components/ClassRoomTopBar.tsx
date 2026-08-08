"use client";

import Link from "next/link";
import { ArrowLeft, Clock } from "lucide-react";
import { formatRelativeDayKey, formatTimeInZone, toDayKey } from "@/lib/date";

interface ClassRoomTopBarProps {
  title: string;
  level: string;
  teacherName: string | null;
  date: Date;
  todayKey: string;
  isLive: boolean;
}

export function ClassRoomTopBar({
  title,
  level,
  teacherName,
  date,
  todayKey,
  isLive,
}: ClassRoomTopBarProps) {
  const dayKey = toDayKey(date);

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-800 bg-slate-900 px-3 sm:px-5">
      <Link
        href="/student/classes"
        aria-label="Voltar para minhas aulas"
        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>

      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Aula · {level}
          {teacherName && <span className="hidden sm:inline"> · Com {teacherName}</span>}
        </p>
        <h1 className="truncate text-sm font-bold text-white">{title}</h1>
      </div>

      {isLive ? (
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-rose-500/15 px-3 py-1 text-xs font-semibold text-rose-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />
          Aula de hoje
        </span>
      ) : (
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
          <Clock className="h-3 w-3" />
          {formatRelativeDayKey(dayKey, todayKey)} · {formatTimeInZone(date)}
        </span>
      )}
    </header>
  );
}
