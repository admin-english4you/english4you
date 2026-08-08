"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { User } from "@/modules/user/user.types";
import { assignTeacherAction } from "@/modules/class/class.actions";

interface TeacherAssignmentCardProps {
  classGroupId: string;
  currentTeacher: User | null;
  teachers: User[];
  isEditable: boolean;
}

export function TeacherAssignmentCard({ classGroupId, currentTeacher, teachers, isEditable }: TeacherAssignmentCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedTeacherId, setSelectedTeacherId] = useState(currentTeacher?.id ?? "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasChanges = selectedTeacherId && selectedTeacherId !== (currentTeacher?.id ?? "");

  const handleSave = () => {
    if (!selectedTeacherId) return;
    setErrorMessage(null);

    startTransition(async () => {
      const result = await assignTeacherAction({ classGroupId, teacherId: selectedTeacherId });
      if (result.success) {
        router.refresh();
      } else {
        setErrorMessage(result.error);
      }
    });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <GraduationCap className="w-4 h-4 text-slate-400" />
        <h3 className="font-bold text-slate-900 text-sm">Professor Responsável</h3>
      </div>

      {errorMessage && (
        <div className="p-3 mb-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
          {errorMessage}
        </div>
      )}

      <p className="text-xs text-slate-500 mb-3">
        Atual: <span className="font-semibold text-slate-700">{currentTeacher?.name ?? "Sem professor definido"}</span>
      </p>

      {isEditable ? (
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Select
              value={selectedTeacherId}
              onChange={setSelectedTeacherId}
              placeholder="Selecione um professor..."
              options={teachers.map((t) => ({ value: t.id, label: t.name }))}
            />
          </div>
          <Button type="button" onClick={handleSave} disabled={!hasChanges} loading={isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            Salvar
          </Button>
        </div>
      ) : (
        <p className="text-[11px] text-slate-400">Turma não está ativa — não é possível alterar o professor.</p>
      )}
    </div>
  );
}
