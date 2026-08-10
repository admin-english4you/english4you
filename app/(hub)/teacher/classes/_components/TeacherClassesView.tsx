"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/EmptyState";
import { GraduationCap } from "lucide-react";
import type { ClassGroupListItem } from "@/modules/class/class.types";
import { TeacherClassCard } from "./TeacherClassCard";

interface TeacherClassesViewProps {
  classes: ClassGroupListItem[];
}

export function TeacherClassesView({ classes }: TeacherClassesViewProps) {
  return (
    <AppLayout role="TEACHER">
      <PageHeader
        title="Minhas Turmas"
        description="Turmas onde você é o professor titular."
        className="mb-6"
      />

      {classes.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((classGroup, i) => (
            <TeacherClassCard key={classGroup.id} classGroup={classGroup} index={i} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={GraduationCap}
          title="Nenhuma turma atribuída"
          description="Assim que a coordenação te atribuir como professor titular de uma turma, ela aparece aqui."
        />
      )}
    </AppLayout>
  );
}
