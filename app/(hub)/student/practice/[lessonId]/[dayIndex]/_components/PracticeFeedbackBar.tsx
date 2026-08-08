"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type FeedbackState = "idle" | "correct" | "wrong";

interface PracticeFeedbackBarProps {
  state: FeedbackState;
  correctAnswer?: string;
  explanation?: string;
  onCheck: () => void;
  onContinue: () => void;
  checkDisabled: boolean;
  isLastItem: boolean;
  /** Rótulo alternativo do botão principal (ex: flashcards não "verificam"). */
  checkLabel?: string;
  /** Flashcards se auto-avaliam e não usam a barra de verificação. */
  hideCheckButton?: boolean;
}

export function PracticeFeedbackBar({
  state,
  correctAnswer,
  explanation,
  onCheck,
  onContinue,
  checkDisabled,
  isLastItem,
  checkLabel = "Verificar",
  hideCheckButton = false,
}: PracticeFeedbackBarProps) {
  const isAnswered = state !== "idle";

  return (
    <div
      className={cn(
        "shrink-0 border-t transition-colors",
        state === "correct" && "border-emerald-200 bg-emerald-50",
        state === "wrong" && "border-rose-200 bg-rose-50",
        state === "idle" && "border-slate-200 bg-white"
      )}
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        {/* aria-live para leitores de tela anunciarem o resultado */}
        <div aria-live="polite" className="min-w-0 flex-1">
          <AnimatePresence mode="wait">
            {isAnswered && (
              <motion.div
                key={state}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex items-start gap-2.5"
              >
                {state === "correct" ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                ) : (
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                )}
                <div className="min-w-0">
                  <p
                    className={cn(
                      "text-sm font-bold",
                      state === "correct" ? "text-emerald-800" : "text-rose-800"
                    )}
                  >
                    {state === "correct" ? "Boa!" : "Quase lá."}
                  </p>
                  {state === "wrong" && correctAnswer && (
                    <p className="mt-0.5 text-sm text-rose-700">
                      Resposta certa: <strong>{correctAnswer}</strong>
                    </p>
                  )}
                  {explanation && (
                    <p
                      className={cn(
                        "mt-0.5 text-xs",
                        state === "correct" ? "text-emerald-700" : "text-rose-700"
                      )}
                    >
                      {explanation}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="shrink-0">
          {isAnswered ? (
            <Button
              onClick={onContinue}
              size="lg"
              className={cn(
                "w-full font-bold sm:w-auto",
                state === "correct"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-rose-600 hover:bg-rose-700"
              )}
            >
              {isLastItem ? "Finalizar" : "Continuar"}
            </Button>
          ) : (
            !hideCheckButton && (
              <Button
                onClick={onCheck}
                disabled={checkDisabled}
                size="lg"
                className="w-full font-bold sm:w-auto"
              >
                {checkLabel}
              </Button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
