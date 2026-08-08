"use client";

import { motion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PracticeItem } from "@/modules/practice/practice.types";

/** Cada palavra é identificada pela posição no banco, e não pelo texto —
 *  frases com palavras repetidas ("the ... the") quebrariam com key por texto. */
export interface WordToken {
  id: number;
  word: string;
}

interface SentenceUnscrambleCardProps {
  item: PracticeItem;
  answered: boolean;
  isCorrect: boolean | null;
  built: WordToken[];
  bank: WordToken[];
  onPickFromBank: (token: WordToken) => void;
  onReturnToBank: (token: WordToken) => void;
  onReset: () => void;
}

/**
 * Monte a frase — toque para construir, sem biblioteca de drag and drop.
 *
 * O `layoutId` do framer-motion faz a palavra "voar" entre o banco e a bandeja
 * de graça, o que dá a sensação de arrastar sem o custo (e a fragilidade em
 * touch) de um DnD real.
 */
export function SentenceUnscrambleCard({
  item,
  answered,
  isCorrect,
  built,
  bank,
  onPickFromBank,
  onReturnToBank,
  onReset,
}: SentenceUnscrambleCardProps) {
  if (!item.data.unscramble) return null;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
          Monte a frase
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Toque nas palavras para montar a frase em inglês.
        </p>
      </div>

      {/* Bandeja: a frase sendo construída */}
      <div
        className={cn(
          "min-h-28 rounded-2xl border-2 border-dashed p-4 transition-colors",
          answered && isCorrect === true && "border-emerald-300 bg-emerald-50",
          answered && isCorrect === false && "border-rose-300 bg-rose-50",
          !answered && "border-slate-300 bg-white"
        )}
      >
        {built.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            Toque nas palavras abaixo para começar
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {built.map((token) => (
              <motion.button
                key={token.id}
                layoutId={`word-${item.id}-${token.id}`}
                type="button"
                disabled={answered}
                onClick={() => onReturnToBank(token)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm font-medium shadow-sm transition-colors",
                  answered
                    ? "cursor-default border-slate-200 bg-white text-slate-700"
                    : "border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100"
                )}
              >
                {token.word}
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Banco de palavras */}
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Banco de palavras
        </p>
        <div className="flex min-h-14 flex-wrap gap-2">
          {bank.map((token) => (
            <motion.button
              key={token.id}
              layoutId={`word-${item.id}-${token.id}`}
              type="button"
              disabled={answered}
              onClick={() => onPickFromBank(token)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-indigo-300 hover:bg-slate-50 disabled:opacity-50"
            >
              {token.word}
            </motion.button>
          ))}
        </div>
      </div>

      {built.length > 0 && !answered && (
        <button
          type="button"
          onClick={onReset}
          className="mx-auto flex items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-slate-700"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Resetar
        </button>
      )}
    </div>
  );
}
