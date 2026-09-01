"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CalendarDays, ChevronRight, Clock, Lock, PlayCircle, UserRound } from "lucide-react";
import { formatRelativeDayKey, formatTimeInZone, toDayKey } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { ClassRecordDetail } from "@/modules/class/class.types";

interface ClassRecordCardProps {
  record: ClassRecordDetail;
  variant: "past" | "upcoming";
  /** Dia de hoje ('YYYY-MM-DD') vindo do servidor, para o rótulo "Hoje/Amanhã". */
  todayKey: string;
  headTeacherName: string | null;
  index?: number;
}

export function ClassRecordCard({
  record,
  variant,
  todayKey,
  headTeacherName,
  index = 0,
}: ClassRecordCardProps) {
  const dayKey = toDayKey(record.date);
  const isToday = dayKey === todayKey;
  const teacherName = record.teacher?.name ?? headTeacherName;

  // Chamada ao vivo AGORA — não depende de "hoje"/horário agendado nem de
  // qual professor a iniciou (titular ou substituto): é o mesmo critério
  // que `getStudentCallAccess` usa no servidor pra decidir se o aluno pode
  // entrar. Sem isso, uma aula que o professor abre fora do horário previsto
  // (adiantada, atrasada, ou reaberta depois de cair a internet) não tinha
  // NENHUM sinal visual em lugar nenhum do app fora da própria página da
  // aula — o aluno só via o botão de entrar se já estivesse exatamente
  // naquela tela no momento certo.
  const isLiveNow = Boolean(record.callStartedAt) && !record.completed;

  // A lição só é legível quando publicada; DISABLED significa "o aluno ainda
  // não chegou aqui", então o card fica sem link — EXCETO se a chamada já
  // está ao vivo: aí a barreira de conteúdo não pode impedir a aluna de
  // entrar na aula que está acontecendo agora.
  const isOpenable = isLiveNow || Boolean(record.lesson && record.lesson.status !== "DISABLED");

  const body = (
    <div
      className={cn(
        "group flex items-center gap-4 rounded-xl border bg-white p-4 transition-all",
        isLiveNow
          ? "border-rose-400 ring-2 ring-rose-200"
          : isToday
            ? "border-primary ring-2 ring-primary/20"
            : "border-slate-200",
        isOpenable ? "hover:border-primary hover:shadow-sm" : "opacity-75"
      )}
    >
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
          isLiveNow
            ? "bg-rose-50 text-rose-600"
            : variant === "past"
              ? "bg-emerald-50 text-emerald-600"
              : "bg-primary/10 text-primary"
        )}
      >
        {isOpenable ? <PlayCircle className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          {isLiveNow && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-600">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rose-500" />
              </span>
              AO VIVO AGORA
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            <CalendarDays className="h-3 w-3" />
            {formatRelativeDayKey(dayKey, todayKey)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            <Clock className="h-3 w-3" />
            {formatTimeInZone(record.date)}
          </span>
        </div>

        <p className="truncate font-semibold text-slate-900">
          {record.lesson?.title ?? "Aula sem lição vinculada"}
        </p>

        {teacherName && (
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
            <UserRound className="h-3 w-3 shrink-0" />
            Com {teacherName}
            {record.teacher && <span className="text-amber-600"> (substituto)</span>}
          </p>
        )}
      </div>

      {isOpenable ? (
        <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 transition-colors group-hover:text-primary" />
      ) : (
        <span className="shrink-0 text-xs text-slate-400">Em breve</span>
      )}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 6) * 0.04 }}
    >
      {isOpenable ? <Link href={`/student/classes/${record.id}`}>{body}</Link> : body}
    </motion.div>
  );
}
