"use client";

import { useEffect, useState } from "react";
import { Mail, Phone } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Avatar } from "@/components/ui/avatar";
import { getTeacherStudentDetailAction } from "@/modules/class/class.actions";
import type { ClassmateSummary, TeacherStudentDetail } from "@/modules/class/class.types";

interface StudentDetailModalProps {
  classGroupId: string;
  /** Resumo já em mãos (nome/avatar) — some pra frente do modal antes do PII carregar. */
  student: ClassmateSummary | null;
  onClose: () => void;
}

/**
 * PII (e-mail/telefone) é buscada sob demanda ao abrir, via Server Action —
 * nunca pré-carregada na lista do roster (ver getTeacherStudentDetailAction).
 */
export function StudentDetailModal({ classGroupId, student, onClose }: StudentDetailModalProps) {
  const [detail, setDetail] = useState<TeacherStudentDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reseta o estado assim que o aluno selecionado muda, durante o render (em
  // vez de useEffect) — evita um frame mostrando os dados do aluno anterior.
  const [prevStudentId, setPrevStudentId] = useState<string | null>(null);
  if (student && student.id !== prevStudentId) {
    setPrevStudentId(student.id);
    setDetail(null);
    setError(null);
    setLoading(true);
  }

  useEffect(() => {
    if (!student) return;
    let cancelled = false;

    getTeacherStudentDetailAction({ classGroupId, studentId: student.id }).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (result.success && result.data) {
        setDetail(result.data);
      } else if (!result.success) {
        setError(result.error);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [classGroupId, student]);

  if (!student) return null;

  return (
    <Modal isOpen onClose={onClose} title="Dados do aluno">
      <div className="flex flex-col items-center gap-4 p-6">
        <Avatar name={student.name} src={detail?.avatarUrl ?? student.avatarUrl} size="xl" />
        <p className="text-lg font-bold text-slate-900">{student.name}</p>

        {loading && <p className="text-sm text-slate-500">Carregando...</p>}
        {error && <p className="text-sm text-rose-600">{error}</p>}

        {detail && (
          <div className="w-full space-y-3">
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <Mail className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="truncate text-sm text-slate-700">{detail.email}</span>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <Phone className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="text-sm text-slate-700">{detail.phone ?? "Não informado"}</span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
