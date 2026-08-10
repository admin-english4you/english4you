"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import type { ClassmateSummary } from "@/modules/class/class.types";
import { StudentDetailModal } from "./StudentDetailModal";

interface RosterListProps {
  classGroupId: string;
  students: ClassmateSummary[];
}

export function RosterList({ classGroupId, students }: RosterListProps) {
  const [selected, setSelected] = useState<ClassmateSummary | null>(null);

  if (students.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-500">Nenhum aluno matriculado ainda.</p>;
  }

  return (
    <>
      <div className="space-y-2">
        {students.map((student) => (
          <button
            key={student.id}
            type="button"
            onClick={() => setSelected(student)}
            className="group flex w-full items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5 text-left transition-colors hover:border-amber-200 hover:bg-amber-50/40"
          >
            <Avatar name={student.name} src={student.avatarUrl} size="sm" />
            <span className="flex-1 truncate text-sm font-medium text-slate-800">{student.name}</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-amber-500" />
          </button>
        ))}
      </div>

      <StudentDetailModal classGroupId={classGroupId} student={selected} onClose={() => setSelected(null)} />
    </>
  );
}
