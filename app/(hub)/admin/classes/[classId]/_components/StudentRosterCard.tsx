"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical } from "lucide-react";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import { User } from "@/modules/user/user.types";
import { ClassGroup } from "@/modules/class/class.types";
import { addStudentAction, removeStudentAction, transferStudentAction } from "@/modules/class/class.actions";

interface StudentRosterCardProps {
  classGroupId: string;
  students: User[];
  availableStudents: User[];
  otherClasses: ClassGroup[];
  isEditable: boolean;
  isAddModalOpen: boolean;
  onCloseAddModal: () => void;
}

export function StudentRosterCard({
  classGroupId,
  students,
  availableStudents,
  otherClasses,
  isEditable,
  isAddModalOpen,
  onCloseAddModal,
}: StudentRosterCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [selectedNewStudentId, setSelectedNewStudentId] = useState("");

  const [transferringStudent, setTransferringStudent] = useState<User | null>(null);
  const [selectedTargetClassId, setSelectedTargetClassId] = useState("");

  // Alunos ainda não matriculados nesta turma (a lista `availableStudents` do server
  // já inclui os alunos atuais desta turma, então filtramos por segurança).
  const addableStudents = availableStudents.filter((s) => !students.some((current) => current.id === s.id));

  const handleAddStudent = () => {
    if (!selectedNewStudentId) return;
    setErrorMessage(null);

    startTransition(async () => {
      const result = await addStudentAction({ classGroupId, studentId: selectedNewStudentId });
      if (result.success) {
        setSelectedNewStudentId("");
        onCloseAddModal();
        router.refresh();
      } else {
        setErrorMessage(result.error);
      }
    });
  };

  const handleRemoveStudent = (studentId: string) => {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await removeStudentAction({ classGroupId, studentId });
      if (result.success) {
        router.refresh();
      } else {
        setErrorMessage(result.error);
      }
    });
  };

  const handleTransfer = () => {
    if (!transferringStudent || !selectedTargetClassId) return;
    setErrorMessage(null);

    startTransition(async () => {
      const result = await transferStudentAction({
        studentId: transferringStudent.id,
        sourceClassGroupId: classGroupId,
        targetClassGroupId: selectedTargetClassId,
      });
      if (result.success) {
        setTransferringStudent(null);
        setSelectedTargetClassId("");
        router.refresh();
      } else {
        setErrorMessage(result.error);
      }
    });
  };

  return (
    <div className="bg-white rounded-xl">
      {errorMessage && (
        <div className="p-3 mb-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
          {errorMessage}
        </div>
      )}

      {students.length === 0 ? (
        <p className="text-xs text-slate-400 py-6 text-center">Nenhum aluno matriculado nesta turma ainda.</p>
      ) : (
        <Table>
          <TableHeader>
            <tr>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              {isEditable && <TableHead className="text-right">Ações</TableHead>}
            </tr>
          </TableHeader>
          <TableBody>
            {students.map((student) => (
              <TableRow key={student.id}>
                <TableCell isHeaderCell>
                  <span className="font-semibold text-slate-900">{student.name}</span>
                </TableCell>
                <TableCell mobileLabel="E-mail" className="text-slate-600">
                  {student.email}
                </TableCell>
                {isEditable && (
                  <TableCell mobileLabel="Ações" className="md:justify-end" hideBorderMobile>
                    <Dropdown
                      trigger={
                        <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      }
                    >
                      <DropdownItem
                        onClick={() => {
                          setTransferringStudent(student);
                          setSelectedTargetClassId("");
                        }}
                      >
                        Transferir
                      </DropdownItem>
                      <DropdownItem destructive onClick={() => handleRemoveStudent(student.id)}>
                        Remover
                      </DropdownItem>
                    </Dropdown>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Modal isOpen={isAddModalOpen} onClose={onCloseAddModal} title="Adicionar Aluno">
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Aluno</label>
            <Select
              value={selectedNewStudentId}
              onChange={setSelectedNewStudentId}
              placeholder="Selecione um aluno..."
              options={addableStudents.map((s) => ({ value: s.id, label: s.name }))}
            />
            {addableStudents.length === 0 && (
              <p className="text-[11px] text-slate-400 mt-1">Nenhum aluno disponível (sem turma) no momento.</p>
            )}
          </div>
          <Modal.Footer>
            <Button type="button" variant="outline" onClick={onCloseAddModal}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleAddStudent}
              disabled={!selectedNewStudentId}
              loading={isPending}
              className="bg-primary hover:bg-primary/80 text-primary-foreground"
            >
              Adicionar
            </Button>
          </Modal.Footer>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(transferringStudent)}
        onClose={() => setTransferringStudent(null)}
        title={`Transferir ${transferringStudent?.name ?? ""}`}
      >
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-500">
            O aluno deixará de ver aulas e materiais desta turma e passará a ver apenas os da turma de destino.
          </p>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Turma de Destino</label>
            <Select
              value={selectedTargetClassId}
              onChange={setSelectedTargetClassId}
              placeholder="Selecione a turma de destino..."
              options={otherClasses.map((c) => ({ value: c.id, label: c.name }))}
            />
          </div>
          <Modal.Footer>
            <Button type="button" variant="outline" onClick={() => setTransferringStudent(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleTransfer}
              disabled={!selectedTargetClassId}
              loading={isPending}
              className="bg-primary hover:bg-primary/80 text-primary-foreground"
            >
              Transferir
            </Button>
          </Modal.Footer>
        </div>
      </Modal>
    </div>
  );
}
