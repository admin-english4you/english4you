"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookOpenCheck, Calendar, CheckCircle2, Loader2 } from "lucide-react";
import { Select } from "@/components/ui/select";
import { ClassRecordDetail } from "@/modules/class/class.types";
import { User } from "@/modules/user/user.types";
import { assignSubstituteTeacherAction } from "@/modules/class/class.actions";

interface LessonsListProps {
  classGroupId: string;
  records: ClassRecordDetail[];
  teachers: User[];
  defaultTeacher: User | null;
  isEditable: boolean;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function LessonCard({
  record,
  teachers,
  defaultTeacher,
  isEditable,
}: {
  record: ClassRecordDetail;
  teachers: User[];
  defaultTeacher: User | null;
  isEditable: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedTeacherId, setSelectedTeacherId] = useState(record.teacherId ?? "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasSubstitute = Boolean(record.teacherId);
  const hasChanges = selectedTeacherId && selectedTeacherId !== (record.teacherId ?? "");

  const handleSave = () => {
    if (!selectedTeacherId) return;
    setErrorMessage(null);

    startTransition(async () => {
      const result = await assignSubstituteTeacherAction({ classRecordId: record.id, teacherId: selectedTeacherId });
      if (result.success) {
        router.refresh();
      } else {
        setErrorMessage(result.error);
      }
    });
  };

  return (
    <div className="border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-900 text-sm truncate">{record.lesson?.title ?? "Lição"}</span>
          {record.completed && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
              <CheckCircle2 className="w-3 h-3" /> Concluída
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span className="capitalize">{formatDate(record.date)}</span>
        </div>
        {errorMessage && <p className="text-[11px] text-rose-600 mt-1">{errorMessage}</p>}
      </div>

      <div className="flex items-center gap-2 sm:w-64">
        <div className="flex-1">
          <Select
            value={selectedTeacherId}
            onChange={setSelectedTeacherId}
            placeholder={defaultTeacher ? `${defaultTeacher.name} (titular)` : "Sem professor titular"}
            options={teachers.map((t) => ({ value: t.id, label: t.name }))}
            disabled={!isEditable}
          />
        </div>
        {isEditable && (
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges || isPending}
            className="text-xs font-semibold text-primary hover:text-primary/80 disabled:opacity-30 disabled:hover:text-primary shrink-0"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
          </button>
        )}
      </div>

      {hasSubstitute && (
        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 shrink-0">
          Substituto
        </span>
      )}
    </div>
  );
}

export function LessonsList({ records, teachers, defaultTeacher, isEditable }: LessonsListProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <BookOpenCheck className="w-4 h-4 text-slate-400" />
        <h3 className="font-bold text-slate-900 text-sm">
          Aulas <span className="text-slate-400 font-normal">({records.length})</span>
        </h3>
      </div>

      {records.length === 0 ? (
        <p className="text-xs text-slate-400 py-6 text-center">
          Nenhuma aula gerada ainda. Atribua um plano de ensino para a turma para gerar a grade de aulas.
        </p>
      ) : (
        <div className="space-y-3">
          {records.map((record) => (
            <LessonCard key={record.id} record={record} teachers={teachers} defaultTeacher={defaultTeacher} isEditable={isEditable} />
          ))}
        </div>
      )}
    </div>
  );
}
