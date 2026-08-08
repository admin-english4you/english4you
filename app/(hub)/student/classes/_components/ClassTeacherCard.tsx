"use client";

import { CalendarDays, Layers, UserRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { formatScheduleSummary } from "@/modules/class/class.utils";
import type { ClassGroup } from "@/modules/class/class.types";
import type { User } from "@/modules/user/user.types";

interface ClassTeacherCardProps {
  classGroup: ClassGroup;
  teacher: User | null;
  planName: string | null;
  completedLessons: number;
  totalLessons: number;
}

export function ClassTeacherCard({
  classGroup,
  teacher,
  planName,
  completedLessons,
  totalLessons,
}: ClassTeacherCardProps) {
  const percent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return (
    <Card className="overflow-hidden p-0">
      <div className="bg-gradient-to-r from-indigo-600 to-blue-500 px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-100">Minha turma</p>
        <h2 className="text-xl font-bold text-white mt-1">{classGroup.name}</h2>
        <p className="text-sm text-indigo-100 mt-0.5">Nível {classGroup.level}</p>
      </div>

      <div className="p-6 space-y-5">
        <div className="flex items-center gap-3">
          {teacher ? (
            <>
              <Avatar name={teacher.name} src={teacher.avatarUrl} size="md" />
              <div className="min-w-0">
                <p className="text-xs text-slate-500">Professor(a)</p>
                <p className="font-semibold text-slate-900 truncate">{teacher.name}</p>
              </div>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                <UserRound className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Professor(a)</p>
                <p className="font-medium text-slate-500">Ainda não definido</p>
              </div>
            </>
          )}
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-start gap-2.5 rounded-lg bg-slate-50 px-3 py-2.5">
            <CalendarDays className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <dt className="text-xs text-slate-500">Horário</dt>
              <dd className="text-sm font-medium text-slate-800">
                {formatScheduleSummary(classGroup.schedule)}
              </dd>
            </div>
          </div>
          <div className="flex items-start gap-2.5 rounded-lg bg-slate-50 px-3 py-2.5">
            <Layers className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <dt className="text-xs text-slate-500">Plano de ensino</dt>
              <dd className="text-sm font-medium text-slate-800 truncate">
                {planName ?? "Não atribuído"}
              </dd>
            </div>
          </div>
        </dl>

        {totalLessons > 0 && (
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-xs font-medium text-slate-600">Progresso do curso</span>
              <span className="text-xs text-slate-500">
                {completedLessons} de {totalLessons} aulas
              </span>
            </div>
            <Progress value={percent} label="Progresso do curso" />
          </div>
        )}
      </div>
    </Card>
  );
}
