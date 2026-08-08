"use client";

import Link from "next/link";
import { CalendarClock, Clock, UserRound } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatRelativeDayKey, formatTimeInZone, toDayKey } from "@/lib/date";
import { formatScheduleSummary } from "@/modules/class/class.utils";
import type { ClassRecordDetail, ClassGroup } from "@/modules/class/class.types";

interface NextClassCardProps {
  record: ClassRecordDetail | null;
  classGroup: ClassGroup | null;
  headTeacherName: string | null;
  todayKey: string;
}

export function NextClassCard({ record, classGroup, headTeacherName, todayKey }: NextClassCardProps) {
  if (!classGroup) {
    return (
      <Card>
        <CardTitle>Próxima aula</CardTitle>
        <p className="mt-2 text-sm text-slate-500">
          Você ainda não está em uma turma. Assim que for alocado, sua agenda aparece aqui.
        </p>
      </Card>
    );
  }

  if (!record) {
    return (
      <Card>
        <CardTitle>Próxima aula</CardTitle>
        <p className="mt-2 text-sm text-slate-500">
          Nenhuma aula futura agendada para a turma {classGroup.name}.
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Horário da turma: {formatScheduleSummary(classGroup.schedule)}
        </p>
      </Card>
    );
  }

  const dayKey = toDayKey(record.date);
  const teacherName = record.teacher?.name ?? headTeacherName;

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center gap-2 bg-indigo-50 px-6 py-3">
        <CalendarClock className="h-4 w-4 text-indigo-600" />
        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
          Próxima aula
        </span>
      </div>

      <div className="p-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {formatRelativeDayKey(dayKey, todayKey)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            <Clock className="h-3 w-3" />
            {formatTimeInZone(record.date)}
          </span>
        </div>

        <p className="font-semibold text-slate-900">
          {record.lesson?.title ?? "Aula sem lição vinculada"}
        </p>
        <p className="mt-0.5 text-sm text-slate-500">{classGroup.name}</p>

        {teacherName && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
            <UserRound className="h-3.5 w-3.5" />
            Com {teacherName}
          </p>
        )}

        <Button render={<Link href="/student/classes" />} variant="outline" size="sm" className="mt-5">
          Ver todas as aulas
        </Button>
      </div>
    </Card>
  );
}
