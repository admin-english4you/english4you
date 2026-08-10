"use client";

import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { ArrowRight, Clock, GraduationCap, PlayCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatRelativeDayKey, formatTimeInZone, toDayKey } from "@/lib/date";
import type { TeacherOverview } from "@/modules/class/class.types";
import type { User } from "@/modules/user/user.types";

interface TeacherDashboardProps {
  user: User;
  overview: TeacherOverview;
  todayKey: string;
}

export function TeacherDashboard({ user, overview, todayKey }: TeacherDashboardProps) {
  const firstName = user.name.split(" ")[0];
  const nextRecord = overview.upcomingRecords[0] ?? null;

  return (
    <AppLayout role="TEACHER" userName={user.name} userAvatarUrl={user.avatarUrl}>
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Olá, {firstName}!</h1>
            <p className="mt-1 text-sm text-slate-500">
              Confira suas turmas e as próximas aulas agendadas.
            </p>
          </div>
          {nextRecord && (
            <Button render={<Link href={`/teacher/live/${nextRecord.id}`} />} className="bg-amber-600 hover:bg-amber-700">
              <PlayCircle className="mr-2 h-4 w-4" /> Ir para a próxima aula
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <StatCard
            icon={<GraduationCap className="h-6 w-6" />}
            tone="amber"
            label="Minhas turmas"
            value={`${overview.classCount} ${overview.classCount === 1 ? "turma" : "turmas"}`}
          />
          <StatCard
            icon={<Users className="h-6 w-6" />}
            tone="indigo"
            label="Total de alunos"
            value={`${overview.studentCount} ${overview.studentCount === 1 ? "aluno" : "alunos"}`}
          />
        </div>

        <Card>
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">Próximas aulas</h2>
            <Button render={<Link href="/teacher/classes" />} variant="outline" size="sm">
              Ver minhas turmas <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>

          {overview.upcomingRecords.length > 0 ? (
            <div className="space-y-3">
              {overview.upcomingRecords.map((record) => {
                const dayKey = toDayKey(record.date);
                return (
                  <Link
                    key={record.id}
                    href={`/teacher/live/${record.id}`}
                    className="group flex flex-col items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4 transition-all hover:border-amber-200 hover:bg-amber-50/40 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-slate-800 transition-colors group-hover:text-amber-700">
                        {record.lesson?.title ?? "Aula sem lição vinculada"}
                      </h3>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                        <Clock className="h-3.5 w-3.5" />
                        {formatRelativeDayKey(dayKey, todayKey)} · {formatTimeInZone(record.date)}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-amber-500" />
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-slate-500">Nenhuma aula agendada.</p>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}

const TONE_STYLES = {
  amber: "bg-amber-50 text-amber-600 border-amber-100",
  indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
} as const;

function StatCard({
  icon,
  tone,
  label,
  value,
}: {
  icon: React.ReactNode;
  tone: keyof typeof TONE_STYLES;
  label: string;
  value: string;
}) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <div className={`rounded-xl border p-3 ${TONE_STYLES[tone]}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase text-slate-400">{label}</p>
        <p className="truncate text-base font-bold text-slate-900">{value}</p>
      </div>
    </Card>
  );
}
