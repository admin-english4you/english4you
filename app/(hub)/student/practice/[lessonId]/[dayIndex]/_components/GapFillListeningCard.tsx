"use client";

import { useEffect, useRef } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { useSpeech } from "@/hooks/useSpeech";
import { cn } from "@/lib/utils";
import type { PracticeItem } from "@/modules/practice/practice.types";

interface GapFillListeningCardProps {
  item: PracticeItem;
  answered: boolean;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isCorrect: boolean | null;
}

/**
 * Complete a frase ouvindo.
 *
 * O TTS do navegador fala a palavra que falta; o aluno digita o que ouviu.
 * Quando `speechSynthesis` não existe (WebViews antigos, algumas versões de
 * Android), o exercício degrada mostrando a palavra escrita — sem isso, o dia
 * inteiro ficaria impossível de completar.
 */
export function GapFillListeningCard({
  item,
  answered,
  value,
  onChange,
  onSubmit,
  isCorrect,
}: GapFillListeningCardProps) {
  const { speak, supported, speaking } = useSpeech();
  const inputRef = useRef<HTMLInputElement>(null);
  // Ref, e não state: é só uma trava de "já falei este item", que não deve
  // provocar re-render.
  const spokenForItemRef = useRef<string | null>(null);

  const gapFill = item.data.gapFill;
  const answerToSpeak = gapFill?.correctAnswer;

  // Tentativa de fala automática. No iOS o navegador exige um gesto antes da
  // primeira fala, por isso o botão "ouvir de novo" é sempre proeminente.
  useEffect(() => {
    inputRef.current?.focus();
    if (!answerToSpeak || !supported || spokenForItemRef.current === item.id) return;
    spokenForItemRef.current = item.id;
    speak(answerToSpeak);
  }, [item.id, answerToSpeak, supported, speak]);

  if (!gapFill) return null;

  const [before, after] = gapFill.sentenceWithGap.split("____");

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => speak(gapFill.correctAnswer)}
          disabled={!supported}
          aria-label="Ouvir a palavra que falta"
          className={cn(
            "flex h-20 w-20 items-center justify-center rounded-full transition-all",
            supported
              ? "bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 active:scale-95"
              : "cursor-not-allowed bg-slate-200 text-slate-400",
            speaking && "ring-4 ring-indigo-200"
          )}
        >
          {supported ? <Volume2 className="h-8 w-8" /> : <VolumeX className="h-8 w-8" />}
        </button>

        {supported ? (
          <>
            <p className="text-xs text-slate-500">Toque para ouvir de novo</p>
            <button
              type="button"
              onClick={() => speak(gapFill.fullSentenceForTTS ?? item.mainText)}
              className="text-xs font-medium text-indigo-600 hover:underline"
            >
              Ouvir a frase completa
            </button>
          </>
        ) : (
          <div className="rounded-lg bg-amber-50 px-3 py-2 text-center">
            <p className="text-xs text-amber-800">Seu navegador não reproduz áudio.</p>
            <p className="mt-0.5 text-sm font-bold text-amber-900">{gapFill.correctAnswer}</p>
          </div>
        )}
      </div>

      <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Complete a frase
        </p>

        <p className="text-lg leading-relaxed text-slate-800 sm:text-xl">
          <span>{before}</span>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !answered && value.trim()) {
                e.preventDefault();
                onSubmit();
              }
            }}
            disabled={answered}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            aria-label="Palavra que falta"
            placeholder="..."
            /* A regra global de @layer base força todo input a w-full h-9;
               os `!` são necessários para o campo de jogo. */
            className={cn(
              "!inline-block !h-auto !w-36 !rounded-none !border-0 !border-b-2 !bg-transparent !px-1 !py-0 text-center !text-lg font-bold sm:!w-44 sm:!text-xl",
              answered && isCorrect === true && "!border-emerald-500 !text-emerald-700",
              answered && isCorrect === false && "!border-rose-500 !text-rose-700",
              !answered && "!border-indigo-400 !text-indigo-700"
            )}
          />
          <span>{after}</span>
        </p>
      </div>
    </div>
  );
}
