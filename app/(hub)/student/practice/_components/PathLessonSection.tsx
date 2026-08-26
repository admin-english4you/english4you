"use client";

import { CalendarDays, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatDayKeyPtBr } from "@/lib/date";
import type { PracticeDayState } from "@/modules/practice/practice.types";
import type { PracticeLessonSection } from "@/modules/progress/progress.types";
import { PathDayNode } from "./PathDayNode";

interface PathLessonSectionProps {
  section: PracticeLessonSection;
  onPurchase: (day: PracticeDayState) => void;
}

export function PathLessonSection({ section, onPurchase }: PathLessonSectionProps) {
  const total = section.days.length;
  const percent = total > 0 ? Math.round((section.completedCount / total) * 100) : 0;
  const isDone = total > 0 && section.completedCount === total;

  return (
    <Card>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
            Nível {section.lessonLevel}
            {!section.hasAudio && <span className="text-slate-400"> · sem áudio</span>}
          </p>
          <h3 className="truncate text-base font-bold text-slate-900">{section.lessonTitle}</h3>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
            <CalendarDays className="h-3 w-3" />
            Aula de {formatDayKeyPtBr(section.classDateKey)}
          </p>
        </div>

        <div className="text-right">
          {isDone ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Completo
            </span>
          ) : (
            <span className="text-xs font-medium text-slate-500">
              {section.completedCount} de {total}
            </span>
          )}
        </div>
      </div>

      <Progress
        value={percent}
        tone={isDone ? "success" : "default"}
        size="sm"
        className="mb-6"
        label={`Progresso de ${section.lessonTitle}`}
      />

      {/* Rolagem horizontal no mobile mantém os 6 nós numa trilha só. */}
      <div className="-mx-2 overflow-x-auto scrollbar-hide">
        <div className="flex min-w-max items-start gap-2 px-2 sm:justify-between sm:gap-1">
          {section.days.map((day, i) => (
            <div key={day.dayIndex} className="flex items-start">
              <PathDayNode day={day} onPurchase={onPurchase} index={i} />
              {i < section.days.length - 1 && (
                <span
                  aria-hidden
                  className="mt-7 h-0.5 w-4 shrink-0 rounded-full bg-slate-200 sm:w-6"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
