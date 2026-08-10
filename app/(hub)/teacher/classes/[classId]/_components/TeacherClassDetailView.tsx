"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardTitle } from "@/components/ui/card";
import { Users, CalendarClock } from "lucide-react";
import { formatScheduleSummary } from "@/modules/class/class.utils";
import type { TeacherClassGroupDetail } from "@/modules/class/class.types";
import { RosterList } from "./RosterList";
import { ClassRecordsList } from "./ClassRecordsList";

interface TeacherClassDetailViewProps {
  detail: TeacherClassGroupDetail;
  todayKey: string;
}

export function TeacherClassDetailView({ detail, todayKey }: TeacherClassDetailViewProps) {
  const { classGroup, plan, students, records } = detail;

  return (
    <AppLayout role="TEACHER">
      <PageHeader
        title={classGroup.name}
        description={`Nível ${classGroup.level} · ${formatScheduleSummary(classGroup.schedule)}`}
        className="mb-6"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-500" />
              Alunos ({students.length})
            </CardTitle>
            <div className="mt-4">
              <RosterList classGroupId={classGroup.id} students={students} />
            </div>
          </Card>

          {plan && (
            <Card>
              <CardTitle>Plano de ensino</CardTitle>
              <p className="mt-2 text-sm font-medium text-slate-800">{plan.name}</p>
              {plan.description && <p className="mt-1 text-xs text-slate-500">{plan.description}</p>}
            </Card>
          )}
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-amber-500" />
              Aulas ({records.length})
            </CardTitle>
            <div className="mt-4">
              <ClassRecordsList records={records} todayKey={todayKey} />
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
