"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { CheckCircle2, Loader2, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { QuizQuestion } from "@/modules/practice/practice.types";
import { updateQuizQuestionAction } from "@/modules/practice/practice.actions";

interface QuizQuestionDetailModalProps {
  question: QuizQuestion | null;
  planId: string;
  onClose: () => void;
}

const SECTION_LABELS: Record<string, string> = {
  vocabulary: "Vocabulário",
  grammar: "Gramática",
  context: "Contexto",
  comprehension: "Compreensão Geral",
};

export function QuizQuestionDetailModal({ question, planId, onClose }: QuizQuestionDetailModalProps) {
  return (
    <Modal isOpen={Boolean(question)} onClose={onClose} title="Pergunta de Compreensão">
      {question && (
        // `key`: sem isto, abrir outra pergunta reaproveitaria o estado do
        // formulário anterior — o admin veria o texto da pergunta errada.
        <QuizQuestionBody key={question.id} question={question} planId={planId} onClose={onClose} />
      )}
    </Modal>
  );
}

function QuizQuestionBody({
  question,
  planId,
  onClose,
}: {
  question: QuizQuestion;
  planId: string;
  onClose: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [text, setText] = useState(question.question);
  const [options, setOptions] = useState<string[]>(question.options);
  const [correctIndex, setCorrectIndex] = useState(question.correctIndex);
  const [explanation, setExplanation] = useState(question.explanation ?? "");

  const handleSave = async () => {
    setSaving(true);
    const result = await updateQuizQuestionAction({
      questionId: question.id,
      planId,
      question: text,
      options,
      correctIndex,
      explanation: explanation.trim() ? explanation : undefined,
    });
    setSaving(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Pergunta atualizada.");
    setEditing(false);
    onClose();
  };

  const sectionBadge = (
    <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded border bg-violet-50 text-violet-700 border-violet-200">
      {question.renderMode === "listening_choice"
        ? "Áudio/Vídeo Específico"
        : SECTION_LABELS[question.section ?? ""] ?? question.section}
    </span>
  );

  if (!editing) {
    return (
      <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
        <div className="flex items-center justify-between gap-3">
          {sectionBadge}
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            <Pencil className="w-3.5 h-3.5 mr-1.5" />
            Editar
          </Button>
        </div>

        <p className="text-sm font-semibold text-slate-900 leading-relaxed">{question.question}</p>

        <div className="space-y-2">
          {question.options.map((option, index) => {
            const isCorrect = index === question.correctIndex;
            return (
              <div
                key={index}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
                  isCorrect
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold"
                    : "bg-slate-50 border-slate-200 text-slate-700"
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
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-0.5">
              Explicação
            </span>
            <p className="text-sm text-slate-700 leading-relaxed">{question.explanation}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
      <div className="flex items-center justify-between gap-3">
        {sectionBadge}
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
          <X className="w-3.5 h-3.5 mr-1.5" />
          Cancelar
        </Button>
      </div>

      <label className="block">
        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-1">Pergunta</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </label>

      <div>
        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-1">
          Alternativas — marque a correta
        </span>
        <div className="space-y-2">
          {options.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              {/* Radio, e não checkbox: só existe UMA resposta certa, e o
                  índice dela é o que o motor de prática usa pra corrigir. */}
              <input
                type="radio"
                name="correct-option"
                checked={correctIndex === index}
                onChange={() => setCorrectIndex(index)}
                aria-label={`Marcar alternativa ${index + 1} como correta`}
                className="!h-4 !w-4 shrink-0"
              />
              <input
                type="text"
                value={option}
                onChange={(e) =>
                  setOptions((prev) => prev.map((o, i) => (i === index ? e.target.value : o)))
                }
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-1">
          Explicação (opcional)
        </span>
        <textarea
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </label>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
          Salvar
        </Button>
      </div>
    </div>
  );
}
