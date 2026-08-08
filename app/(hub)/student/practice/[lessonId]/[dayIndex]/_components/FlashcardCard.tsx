"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { RotateCcw, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSpeech } from "@/hooks/useSpeech";
import { cn } from "@/lib/utils";
import type { PracticeItem } from "@/modules/practice/practice.types";

interface FlashcardCardProps {
  item: PracticeItem;
  onResult: (correct: boolean) => void;
}

/**
 * Flashcard estilo Anki, SEM repetição espaçada: só "acertei" ou "não lembrei".
 *
 * Atende os dois modos do ciclo — `flashcard_visual` (palavra -> significado,
 * com imagem quando houver) e `flashcard_recall` (significado -> palavra). O
 * motor já monta `front`/`back` na direção certa, então a UI é a mesma.
 */
export function FlashcardCard({ item, onResult }: FlashcardCardProps) {
  const [flipped, setFlipped] = useState(false);
  const { speak, supported } = useSpeech();

  const flashcard = item.data.flashcard;
  // No recall a frente é a tradução (português); a palavra em inglês é o verso,
  // e é ela que o TTS lê.
  const isRecall = item.renderMode === "flashcard_recall";

  // Cada item começa virado para a frente. Ajuste durante o render em vez de
  // useEffect, para não haver um frame com o card do item anterior já virado.
  const [prevItemId, setPrevItemId] = useState(item.id);
  if (item.id !== prevItemId) {
    setPrevItemId(item.id);
    setFlipped(false);
  }

  if (!flashcard) return null;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-6">
      <div className="card-perspective w-full">
        <motion.div
          className="card-3d relative h-72 w-full cursor-pointer sm:h-80"
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          onClick={() => setFlipped((v) => !v)}
          role="button"
          tabIndex={0}
          aria-label={flipped ? "Ver a frente do card" : "Virar o card"}
          onKeyDown={(e) => {
            if (e.key === " " || e.key === "Enter") {
              e.preventDefault();
              setFlipped((v) => !v);
            }
          }}
        >
          {/* Frente */}
          <div className="card-face absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm">
            {flashcard.imageUrl && (
              <div className="relative h-28 w-28 overflow-hidden rounded-xl bg-slate-100">
                <Image
                  src={flashcard.imageUrl}
                  alt=""
                  fill
                  sizes="112px"
                  className="object-cover"
                />
              </div>
            )}

            <p
              className={cn(
                "text-center font-bold text-slate-900",
                isRecall ? "text-2xl" : "text-3xl sm:text-4xl"
              )}
            >
              {flashcard.front}
            </p>

            {!isRecall && supported && flashcard.useTTS && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  speak(flashcard.front);
                }}
                aria-label="Ouvir a pronúncia"
                className="rounded-full bg-indigo-50 p-2.5 text-indigo-600 transition-colors hover:bg-indigo-100"
              >
                <Volume2 className="h-5 w-5" />
              </button>
            )}

            <p className="absolute bottom-4 flex items-center gap-1.5 text-xs text-slate-400">
              <RotateCcw className="h-3 w-3" />
              Toque para revelar
            </p>
          </div>

          {/* Verso */}
          <div
            className="card-face absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-indigo-200 bg-indigo-50 p-6 shadow-sm"
            style={{ transform: "rotateY(180deg)" }}
          >
            <p className="text-center text-2xl font-bold text-indigo-900 sm:text-3xl">
              {flashcard.back}
            </p>

            {isRecall && supported && flashcard.useTTS && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  speak(flashcard.back);
                }}
                aria-label="Ouvir a pronúncia"
                className="rounded-full bg-white p-2.5 text-indigo-600 transition-colors hover:bg-indigo-100"
              >
                <Volume2 className="h-5 w-5" />
              </button>
            )}
          </div>
        </motion.div>
      </div>

      {/* A autoavaliação só aparece depois de revelar a resposta. */}
      <motion.div
        initial={false}
        animate={{ opacity: flipped ? 1 : 0.35 }}
        className="flex w-full gap-3"
      >
        <Button
          variant="outline"
          size="lg"
          disabled={!flipped}
          onClick={() => onResult(false)}
          className="flex-1 border-rose-200 font-bold text-rose-700 hover:bg-rose-50"
        >
          Não lembrei
        </Button>
        <Button
          size="lg"
          disabled={!flipped}
          onClick={() => onResult(true)}
          className="flex-1 bg-emerald-600 font-bold hover:bg-emerald-700"
        >
          Acertei
        </Button>
      </motion.div>
    </div>
  );
}
