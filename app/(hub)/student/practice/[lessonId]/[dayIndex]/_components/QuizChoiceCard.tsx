"use client";

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PracticeItem } from "@/modules/practice/practice.types";

interface QuizChoiceCardProps {
  item: PracticeItem;
  answered: boolean;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  /** Conteúdo acima da pergunta — usado pelo listening para o player de áudio. */
  header?: React.ReactNode;
}

const OPTION_LETTERS = ["A", "B", "C", "D"];

export function QuizChoiceCard({
  item,
  answered,
  selectedIndex,
  onSelect,
  header,
}: QuizChoiceCardProps) {
  const quiz = item.data.quiz;
  if (!quiz) return null;

  return (
    <div className="mx-auto w-full max-w-xl">
      {header}

      <p className="mb-6 text-lg font-semibold leading-snug text-slate-900 sm:text-xl">
        {quiz.question}
      </p>

      <div className="flex flex-col gap-3">
        {quiz.options.map((option, index) => {
          const isSelected = selectedIndex === index;
          const isRight = index === quiz.correctIndex;
          // Depois de responder, a correta sempre aparece em verde — mesmo que
          // o aluno tenha escolhido outra; é o que ensina.
          const showAsCorrect = answered && isRight;
          const showAsWrong = answered && isSelected && !isRight;

          return (
            <motion.button
              key={index}
              type="button"
              disabled={answered}
              onClick={() => onSelect(index)}
              whileTap={answered ? undefined : { scale: 0.985 }}
              className={cn(
                "flex items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition-colors",
                showAsCorrect && "border-emerald-400 bg-emerald-50",
                showAsWrong && "border-rose-400 bg-rose-50",
                !answered && isSelected && "border-indigo-400 bg-indigo-50",
                !answered && !isSelected && "border-slate-200 bg-white hover:border-indigo-300",
                answered && !showAsCorrect && !showAsWrong && "border-slate-200 bg-white opacity-60"
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                  showAsCorrect && "bg-emerald-500 text-white",
                  showAsWrong && "bg-rose-500 text-white",
                  !answered && isSelected && "bg-indigo-500 text-white",
                  !answered && !isSelected && "bg-slate-100 text-slate-500",
                  answered && !showAsCorrect && !showAsWrong && "bg-slate-100 text-slate-400"
                )}
              >
                {showAsCorrect ? (
                  <Check className="h-4 w-4" />
                ) : showAsWrong ? (
                  <X className="h-4 w-4" />
                ) : (
                  OPTION_LETTERS[index] ?? index + 1
                )}
              </span>

              <span
                className={cn(
                  "text-sm font-medium sm:text-base",
                  showAsCorrect && "text-emerald-900",
                  showAsWrong && "text-rose-900",
                  !showAsCorrect && !showAsWrong && "text-slate-700"
                )}
              >
                {option}
              </span>
            </motion.button>
          );
        })}
      </div>

      {!answered && (
        <p className="mt-4 text-center text-xs text-slate-400">
          Dica: use as teclas 1 a {quiz.options.length} para responder.
        </p>
      )}
    </div>
  );
}
