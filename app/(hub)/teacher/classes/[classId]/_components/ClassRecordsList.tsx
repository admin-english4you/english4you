"use client";

import Link from "next/link";
import { CalendarDays, CheckCircle2, ChevronRight, Clock, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeDayKey, formatTimeInZone, toDayKey } from "@/lib/date";
import type { ClassRecordDetail } from "@/modules/class/class.types";

interface ClassRecordsListProps {
  records: ClassRecordDetail[];
  todayKey: string;
}

export function ClassRecordsList({ records, todayKey }: ClassRecordsListProps) {
  if (records.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-500">Nenhuma aula agendada ainda.</p>;
  }

  return (
    <div className="space-y-2">
      {records.map((record) => {
        const dayKey = toDayKey(record.date);
        const isToday = dayKey === todayKey;

        return (
          <Link
            key={record.id}
            href={`/teacher/live/${record.id}`}
            className={cn(
              "group flex items-center gap-3 rounded-lg border bg-white px-3 py-2.5 transition-all hover:border-amber-300 hover:shadow-sm",
              isToday ? "border-amber-300 ring-2 ring-amber-100" : "border-slate-100"
            )}
          >
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                record.completed
                  ? "bg-emerald-50 text-emerald-600"
                  : isToday
                    ? "bg-amber-50 text-amber-600"
                    : "bg-slate-100 text-slate-400"
              )}
            >
              {record.completed ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : isToday ? (
                <Radio className="h-4 w-4" />
              ) : (
                <CalendarDays className="h-4 w-4" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">
                {record.lesson?.title ?? "Aula sem lição vinculada"}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                <Clock className="h-3 w-3" />
                {formatRelativeDayKey(dayKey, todayKey)} · {formatTimeInZone(record.date)}
                {record.teacher && <span className="text-amber-600"> · substituto: {record.teacher.name}</span>}
              </p>
            </div>

            <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-amber-500" />
          </Link>
        );
      })}
    </div>
  );
}
