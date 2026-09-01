"use client";

import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { ArrowRight, BookOpen, Calendar, PhoneCall, PlayCircle, Sparkles, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatRelativeDayKey, formatTimeInZone, toDayKey } from "@/lib/date";
import type { StudentClassOverview } from "@/modules/class/class.types";
import type { PracticeDayState } from "@/modules/practice/practice.types";
import type { XpSummary } from "@/modules/progress/progress.types";
import { PRACTICE_MODE_HINTS, PRACTICE_MODE_LABELS, formatXp } from "@/modules/progress/progress.utils";
import type { User } from "@/modules/user/user.types";

interface StudentDashboardProps {
  user: User;
  overview: StudentClassOverview | null;
  todayPractice: PracticeDayState[];
  xp: XpSummary;
  todayKey: string;
}

export function StudentDashboard({
  user,
  overview,
  todayPractice,
  xp,
  todayKey,
}: StudentDashboardProps) {
  const firstName = user.name.split(" ")[0];
  const nextClass = overview?.nextRecord ?? null;
  // Chamada ao vivo AGORA, em qualquer aula da turma — não só a "próxima"
  // (`nextRecord` é só a mais próxima por data agendada). Mesmo critério do
  // servidor (`getStudentCallAccess`): não importa qual professor iniciou,
  // nem se foi adiantada ou atrasada — se está ao vivo, aparece aqui.
  const liveRecord = overview?.upcomingRecords.find((r) => r.callStartedAt && !r.completed) ?? null;
  const playableToday = todayPractice.filter(
    (d) => d.status === "AVAILABLE" || d.status === "REPLAYABLE"
  );
  const nextPractice = playableToday[0] ?? null;

  const progressPercent =
    overview && overview.totalLessons > 0
      ? Math.round((overview.completedLessons / overview.totalLessons) * 100)
      : 0;

  return (
    <AppLayout role="STUDENT">
      <div className="mx-auto space-y-8">
        {/* Aula ao vivo agora — topo da tela de propósito, acima até das
            boas-vindas: é o aviso que faltava em todo o app fora da própria
            página da aula (ver ClassRecordCard, mesmo critério). */}
        {liveRecord && (
          <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border-2 border-rose-400 bg-rose-50 p-5 shadow-sm sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-rose-500" />
              </span>
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wide text-rose-600">
                  Sua aula está ao vivo agora
                </p>
                <p className="text-sm font-semibold text-slate-800">
                  {liveRecord.lesson?.title ?? "Aula"}
                </p>
              </div>
            </div>
            <Button
              render={<Link href={`/student/classes/${liveRecord.id}`} />}
              className="w-full bg-rose-600 font-bold hover:bg-rose-700 sm:w-auto"
            >
              <PhoneCall className="mr-2 h-4 w-4" /> Entrar agora
            </Button>
          </div>
        )}

        {/* Boas-vindas */}
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl bg-gradient-to-r from-primary to-violet-600 p-6 text-white shadow-md sm:flex-row sm:items-center sm:p-8">
          <div>
            {nextPractice && (
              <span className="mb-2 inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm">
                <Sparkles className="mr-1 h-3.5 w-3.5" /> Prática liberada hoje
              </span>
            )}
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Olá, {firstName}!
            </h1>
            <p className="mt-1 text-sm text-primary-foreground/80">
              {overview
                ? `Você já concluiu ${overview.completedLessons} de ${overview.totalLessons} aulas da turma ${overview.classGroup.name}.`
                : "Assim que você for alocado em uma turma, suas aulas aparecem aqui."}
            </p>
          </div>

          {nextPractice && (
            <Button
              render={
                <Link href={`/student/practice/${nextPractice.lessonId}/${nextPractice.dayIndex}`} />
              }
              className="bg-white font-bold text-primary shadow-sm hover:bg-slate-100"
            >
              <PlayCircle className="mr-2 h-4 w-4 text-primary" /> Praticar agora
            </Button>
          )}
        </div>

        {/* Indicadores */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <StatCard
            icon={<BookOpen className="h-6 w-6" />}
            tone="indigo"
            label="Nível atual"
            value={overview?.classGroup.level ?? "—"}
          />
          <StatCard
            icon={<Calendar className="h-6 w-6" />}
            tone="amber"
            label="Próxima aula"
            value={
              nextClass
                ? `${formatRelativeDayKey(toDayKey(nextClass.date), todayKey)} · ${formatTimeInZone(nextClass.date)}`
                : "Nenhuma agendada"
            }
          />
          <StatCard
            icon={<Trophy className="h-6 w-6" />}
            tone="emerald"
            label="Seu XP"
            value={formatXp(xp.balance)}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Curso */}
          <Card className="space-y-5 lg:col-span-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Minha turma</h2>
              {overview && (
                <span className="rounded-md border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                  {overview.classGroup.level}
                </span>
              )}
            </div>

            {overview ? (
              <>
                <div>
                  <h3 className="mb-1 text-xl font-bold text-slate-900">
                    {overview.plan?.name ?? overview.classGroup.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {overview.teacher
                      ? `Professor(a): ${overview.teacher.name}`
                      : "Professor(a) ainda não definido"}
                  </p>
                </div>

                <div>
                  <div className="mb-1.5 flex justify-between text-xs font-semibold text-slate-600">
                    <span>Progresso do curso</span>
                    <span>{progressPercent}%</span>
                  </div>
                  <Progress value={progressPercent} label="Progresso do curso" />
                </div>

                <div className="flex justify-end pt-2">
                  <Button render={<Link href="/student/classes" />} size="sm">
                    Ver minhas aulas <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">
                Você ainda não está em uma turma. Fale com a coordenação.
              </p>
            )}
          </Card>

          {/* Prática do dia */}
          <Card className="space-y-4">
            <h2 className="flex items-center justify-between border-b border-slate-100 pb-3 text-base font-bold text-slate-900">
              <span>Prática de hoje</span>
              <Sparkles className="h-4 w-4 text-amber-500" />
            </h2>

            {playableToday.length > 0 ? (
              <div className="space-y-3">
                {playableToday.map((day) => (
                  <Link
                    key={`${day.lessonId}-${day.dayIndex}`}
                    href={`/student/practice/${day.lessonId}/${day.dayIndex}`}
                    className="group block rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 transition-all hover:border-primary/30 hover:bg-primary/10"
                  >
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-800 transition-colors group-hover:text-primary">
                        {PRACTICE_MODE_LABELS[day.renderMode]}
                      </h4>
                      <span className="shrink-0 rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-700">
                        {day.xpReward > 0 ? `+${day.xpReward} XP` : "Revisão"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {PRACTICE_MODE_HINTS[day.renderMode]}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-slate-500">
                Nada liberado hoje. Sua prática começa no dia seguinte à aula.
              </p>
            )}

            <Button
              render={<Link href="/student/practice" />}
              variant="outline"
              size="sm"
              className="w-full"
            >
              Ver a trilha completa
            </Button>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

const TONE_STYLES = {
  indigo: "bg-primary/10 text-primary border-primary/20",
  amber: "bg-amber-50 text-amber-600 border-amber-100",
  emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
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
