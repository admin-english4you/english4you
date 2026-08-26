"use client";

import { CalendarClock, History } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import type { StudentClassOverview } from "@/modules/class/class.types";
import { ClassTeacherCard } from "./ClassTeacherCard";
import { ClassRecordCard } from "./ClassRecordCard";

interface StudentClassesViewProps {
  overview: StudentClassOverview | null;
  /** Dia de hoje resolvido no servidor — evita divergência de hidratação. */
  todayKey: string;
}

export function StudentClassesView({ overview, todayKey }: StudentClassesViewProps) {
  if (!overview) {
    return (
      <AppLayout role="STUDENT">
        <PageHeader
          title="Minha Turma"
          description="Acompanhe suas aulas e o material de cada encontro."
          className="mb-6"
        />
        <EmptyState
          title="Você ainda não está em uma turma"
          description="Assim que a coordenação te alocar em uma turma, suas aulas e materiais aparecem aqui."
        />
      </AppLayout>
    );
  }

  const { classGroup, teacher, plan, pastRecords, upcomingRecords, totalLessons, completedLessons } =
    overview;
  const headTeacherName = teacher?.name ?? null;

  return (
    <AppLayout role="STUDENT">
      <PageHeader
        title="Minha Turma"
        description="Acompanhe suas aulas e o material de cada encontro."
        className="mb-6"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <ClassTeacherCard
            classGroup={classGroup}
            teacher={teacher}
            planName={plan?.name ?? null}
            completedLessons={completedLessons}
            totalLessons={totalLessons}
          />
        </div>

        <div className="space-y-6 lg:col-span-2">
          <section>
            <div className="mb-3 flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-slate-900">Próximas aulas</h2>
              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                {upcomingRecords.length}
              </span>
            </div>

            {upcomingRecords.length > 0 ? (
              <div className="space-y-3">
                {upcomingRecords.map((record, i) => (
                  <ClassRecordCard
                    key={record.id}
                    record={record}
                    variant="upcoming"
                    todayKey={todayKey}
                    headTeacherName={headTeacherName}
                    index={i}
                  />
                ))}
              </div>
            ) : (
              <Card className="py-8 text-center">
                <p className="text-sm text-slate-500">
                  Nenhuma aula futura agendada. Fale com a coordenação se isso não parecer certo.
                </p>
              </Card>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2">
              <History className="h-4 w-4 text-emerald-500" />
              <h2 className="font-semibold text-slate-900">Aulas anteriores</h2>
              <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600">
                {pastRecords.length}
              </span>
            </div>

            {pastRecords.length > 0 ? (
              <div className="space-y-3">
                {pastRecords.map((record, i) => (
                  <ClassRecordCard
                    key={record.id}
                    record={record}
                    variant="past"
                    todayKey={todayKey}
                    headTeacherName={headTeacherName}
                    index={i}
                  />
                ))}
              </div>
            ) : (
              <Card className="py-8 text-center">
                <p className="text-sm text-slate-500">
                  Suas aulas já realizadas aparecem aqui, com o material completo para revisar.
                </p>
              </Card>
            )}
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
