import Link from "next/link";
import { CalendarClock, Clock, GraduationCap, Users } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { formatRelativeDayKey, formatTimeInZone, toDayKey } from "@/lib/date";
import type { TeacherOverview } from "@/modules/class/class.types";

interface TeacherProfileAsideProps {
  overview: TeacherOverview;
  todayKey: string;
}

/** Server component — sem interatividade, então sem "use client". */
export function TeacherProfileAside({ overview, todayKey }: TeacherProfileAsideProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardTitle>Suas turmas</CardTitle>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-amber-50 px-3 py-3 text-center">
            <GraduationCap className="mx-auto h-5 w-5 text-amber-600" />
            <p className="mt-1.5 text-lg font-bold text-amber-800">{overview.classCount}</p>
            <p className="text-[11px] font-medium text-amber-700">
              {overview.classCount === 1 ? "Turma" : "Turmas"}
            </p>
          </div>
          <div className="rounded-xl bg-indigo-50 px-3 py-3 text-center">
            <Users className="mx-auto h-5 w-5 text-indigo-600" />
            <p className="mt-1.5 text-lg font-bold text-indigo-800">{overview.studentCount}</p>
            <p className="text-[11px] font-medium text-indigo-700">
              {overview.studentCount === 1 ? "Aluno" : "Alunos"}
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-indigo-500" />
          Próximas aulas
        </CardTitle>

        {overview.upcomingRecords.length > 0 ? (
          <div className="mt-4 space-y-3">
            {overview.upcomingRecords.map((record) => {
              const dayKey = toDayKey(record.date);
              return (
                <Link
                  key={record.id}
                  href={`/teacher/live/${record.id}`}
                  className="block rounded-lg border border-slate-100 bg-slate-50/60 p-3 transition-colors hover:border-amber-200 hover:bg-amber-50/40"
                >
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {record.lesson?.title ?? "Aula sem lição vinculada"}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock className="h-3 w-3" />
                    {formatRelativeDayKey(dayKey, todayKey)} · {formatTimeInZone(record.date)}
                  </p>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">Nenhuma aula agendada.</p>
        )}
      </Card>
    </div>
  );
}
