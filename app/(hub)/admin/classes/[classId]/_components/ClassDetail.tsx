"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import { MoreVertical, Loader2, AlertTriangle, Users, Plus } from "lucide-react";
import { ClassGroup, ClassGroupDetail } from "@/modules/class/class.types";
import { User } from "@/modules/user/user.types";
import { Plan } from "@/modules/plan/plan.types";
import { STATUS_LABELS, STATUS_STYLES } from "@/modules/class/class.utils";
import { deactivateClassAction, reactivateClassAction, archiveClassAction } from "@/modules/class/class.actions";
import { TeacherAssignmentCard } from "./TeacherAssignmentCard";
import { PlanAssignmentCard } from "./PlanAssignmentCard";
import { StudentRosterCard } from "./StudentRosterCard";
import { LessonsList } from "./LessonsList";

interface ClassDetailProps {
  classData: ClassGroupDetail;
  teachers: User[];
  availableStudents: User[];
  activePlans: Plan[];
  otherClasses: ClassGroup[];
}

type ConfirmAction = "deactivate" | "archive" | null;

export function ClassDetail({ classData, teachers, availableStudents, activePlans, otherClasses }: ClassDetailProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);

  const isEditable = classData.status === "ACTIVE";
  const isFull = classData.students.length >= classData.maxStudents;

  const closeConfirm = () => {
    setConfirmAction(null);
    setErrorMessage(null);
  };

  const handleDeactivate = () => {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await deactivateClassAction({ classGroupId: classData.id });
      if (result.success) {
        setConfirmAction(null);
        router.refresh();
      } else {
        setErrorMessage(result.error);
      }
    });
  };

  const handleArchive = () => {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await archiveClassAction({ classGroupId: classData.id });
      if (result.success) {
        setConfirmAction(null);
        router.refresh();
      } else {
        setErrorMessage(result.error);
      }
    });
  };

  const handleReactivate = () => {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await reactivateClassAction({ classGroupId: classData.id });
      if (!result.success) {
        setErrorMessage(result.error);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <AppLayout role="ADMIN">
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          title={classData.name}
          description={`Nível ${classData.level}`}
        >
          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${STATUS_STYLES[classData.status]}`}>
            {STATUS_LABELS[classData.status]}
          </span>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Users className="w-4 h-4 text-slate-400" />
            {classData.students.length}/{classData.maxStudents} alunos
          </div>

          <Button
            type="button"
            size="sm"
            onClick={() => setIsAddStudentModalOpen(true)}
            disabled={!isEditable || isFull}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Plus className="w-4 h-4 mr-1" /> Adicionar Aluno
          </Button>

          {classData.status !== "COMPLETED" && (
            <Dropdown
              trigger={
                <button className="p-2 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors">
                  <MoreVertical className="w-4 h-4" />
                </button>
              }
            >
              {classData.status === "ACTIVE" && (
                <DropdownItem destructive onClick={() => setConfirmAction("deactivate")}>
                  Desativar Turma
                </DropdownItem>
              )}
              {classData.status === "INACTIVE" && (
                <>
                  <DropdownItem onClick={handleReactivate}>Reativar Turma</DropdownItem>
                  <DropdownItem destructive onClick={() => setConfirmAction("archive")}>
                    Arquivar Turma
                  </DropdownItem>
                </>
              )}
            </Dropdown>
          )}
        </PageHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TeacherAssignmentCard classGroupId={classData.id} currentTeacher={classData.teacher} teachers={teachers} isEditable={isEditable} />
          <PlanAssignmentCard classGroupId={classData.id} currentPlan={classData.plan} activePlans={activePlans} isEditable={isEditable} />
        </div>

        <StudentRosterCard
          classGroupId={classData.id}
          students={classData.students}
          availableStudents={availableStudents}
          otherClasses={otherClasses}
          isEditable={isEditable}
          isAddModalOpen={isAddStudentModalOpen}
          onCloseAddModal={() => setIsAddStudentModalOpen(false)}
        />

        <LessonsList
          classGroupId={classData.id}
          records={classData.records}
          teachers={teachers}
          defaultTeacher={classData.teacher}
          isEditable={isEditable}
        />
      </div>

      <Modal isOpen={confirmAction === "deactivate"} onClose={closeConfirm} title="Desativar Turma">
        <div className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
              {errorMessage}
            </div>
          )}

          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 font-medium">
              Esta ação removerá todos os {classData.students.length} aluno(s) desta turma (ficarão sem turma,
              prontos para uma nova), bloqueará qualquer alteração na turma e ela passará para o status
              &quot;Inativa&quot;. Você poderá reativá-la ou arquivá-la depois.
            </p>
          </div>

          <Modal.Footer>
            <Button type="button" variant="outline" onClick={closeConfirm} disabled={isPending}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleDeactivate}
              disabled={isPending}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Desativando...
                </>
              ) : (
                "Confirmar Desativação"
              )}
            </Button>
          </Modal.Footer>
        </div>
      </Modal>

      <Modal isOpen={confirmAction === "archive"} onClose={closeConfirm} title="Arquivar Turma">
        <div className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
              {errorMessage}
            </div>
          )}

          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 font-medium">
              Turmas arquivadas ficam permanentemente somente-leitura e não podem ser reativadas. O histórico
              (alunos, aulas e professores) é preservado — a turma não é deletada.
            </p>
          </div>

          <Modal.Footer>
            <Button type="button" variant="outline" onClick={closeConfirm} disabled={isPending}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleArchive}
              disabled={isPending}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Arquivando...
                </>
              ) : (
                "Confirmar Arquivamento"
              )}
            </Button>
          </Modal.Footer>
        </div>
      </Modal>
    </AppLayout>
  );
}
