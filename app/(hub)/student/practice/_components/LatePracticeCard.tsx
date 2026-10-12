import Link from "next/link";
import { Clock } from "lucide-react";
import { formatDayKeyPtBr } from "@/lib/date";
import type { PracticeDayState } from "@/modules/practice/practice.types";
import { PRACTICE_MODE_LABELS } from "@/modules/progress/progress.utils";

interface LatePracticeCardProps {
  days: PracticeDayState[];
  /** Quantos itens mostrar antes do "e mais N". */
  limit?: number;
}

/** Práticas que passaram sem ser feitas: continuam liberadas. */
export function LatePracticeCard({ days, limit = 5 }: LatePracticeCardProps) {
  if (days.length === 0) return null;

  const visible = days.slice(0, limit);
  const hidden = days.length - visible.length;

  return (
    <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-amber-600" />
        <h3 className="text-sm font-bold text-amber-900">Práticas pendentes ({days.length})</h3>
      </div>
      <p className="text-xs text-amber-800">Ainda dá tempo: faça quando puder.</p>

      <div className="space-y-2">
        {visible.map((day) => (
          <Link
            key={`${day.lessonId}-${day.dayIndex}`}
            href={`/student/practice/${day.lessonId}/${day.dayIndex}`}
            className="block rounded-xl border border-amber-100 bg-white p-3 transition-colors hover:border-amber-300"
          >
            <p className="text-xs font-bold text-slate-800">
              Dia {day.dayIndex} · {PRACTICE_MODE_LABELS[day.renderMode]}
            </p>
            <p className="truncate text-[11px] text-slate-500">
              {day.lessonTitle} · era para {formatDayKeyPtBr(day.dateKey)}
            </p>
          </Link>
        ))}
      </div>

      {hidden > 0 && <p className="text-[11px] text-amber-800">e mais {hidden} na trilha.</p>}
    </div>
  );
}
