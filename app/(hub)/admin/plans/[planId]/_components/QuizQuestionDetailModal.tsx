"use client";

import { Modal } from "@/components/ui/modal";
import { CheckCircle2 } from "lucide-react";
import { QuizQuestion } from "@/modules/practice/practice.types";

interface QuizQuestionDetailModalProps {
  question: QuizQuestion | null;
  onClose: () => void;
}

const SECTION_LABELS: Record<string, string> = {
  vocabulary: "Vocabulário",
  grammar: "Gramática",
  context: "Contexto",
  comprehension: "Compreensão Geral",
};

export function QuizQuestionDetailModal({ question, onClose }: QuizQuestionDetailModalProps) {
  return (
    <Modal isOpen={Boolean(question)} onClose={onClose} title="Pergunta de Compreensão">
      {question && (
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded border bg-violet-50 text-violet-700 border-violet-200">
            {question.renderMode === "listening_choice"
              ? "Áudio/Vídeo Específico"
              : SECTION_LABELS[question.section ?? ""] ?? question.section}
          </span>

          <p className="text-sm font-semibold text-slate-900 leading-relaxed">{question.question}</p>

          <div className="space-y-2">
            {question.options.map((option, index) => {
              const isCorrect = index === question.correctIndex;
              return (
                <div
                  key={index}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
                    isCorrect ? "bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold" : "bg-slate-50 border-slate-200 text-slate-700"
                  }`}
                >
                  {isCorrect ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <span className="w-4 h-4 shrink-0" />}
                  {option}
                </div>
              );
            })}
          </div>

          {question.explanation && (
            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-0.5">Explicação</span>
              <p className="text-sm text-slate-700 leading-relaxed">{question.explanation}</p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
