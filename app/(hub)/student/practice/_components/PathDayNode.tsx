"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Check,
  Coins,
  Headphones,
  HelpCircle,
  Layers,
  Lock,
  MessageSquareText,
  Play,
  Shuffle,
  Slash,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PracticeDayState } from "@/modules/practice/practice.types";
import type { PracticeMode } from "@/modules/practice/practice.types";
import { PRACTICE_MODE_LABELS } from "@/modules/progress/progress.utils";

const MODE_ICONS: Record<PracticeMode, typeof Layers> = {
  flashcard_visual: Layers,
  gap_fill_listening: Headphones,
  sentence_unscramble: Shuffle,
  flashcard_recall: MessageSquareText,
  quiz_comprehensive: HelpCircle,
  listening_choice: Headphones,
  review_standard: Layers,
};

interface PathDayNodeProps {
  day: PracticeDayState;
  /** Aberto quando o dia é comprável — o pai decide o que mostrar. */
  onPurchase: (day: PracticeDayState) => void;
  index: number;
}

export function PathDayNode({ day, onPurchase, index }: PathDayNodeProps) {
  const Icon = MODE_ICONS[day.renderMode];
  const label = PRACTICE_MODE_LABELS[day.renderMode];
  const href = `/student/practice/${day.lessonId}/${day.dayIndex}`;

  const isPlayable = day.status === "AVAILABLE" || day.status === "REPLAYABLE";
  const isPurchasable = day.status === "EXPIRED" || day.status === "COMPLETED";

  const circle = (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="relative">
        {/* Halo pulsante marca a atividade de hoje. */}
        {day.status === "AVAILABLE" && (
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full bg-primary/70"
            animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        <div
          className={cn(
            "relative flex h-14 w-14 items-center justify-center rounded-full border-4 transition-transform",
            day.status === "COMPLETED" && "border-emerald-200 bg-emerald-500 text-white",
            day.status === "REPLAYABLE" && "border-violet-200 bg-violet-500 text-white",
            day.status === "AVAILABLE" && "border-primary/30 bg-primary text-primary-foreground shadow-lg",
            day.status === "LOCKED_FUTURE" && "border-slate-100 bg-slate-200 text-slate-400",
            day.status === "EXPIRED" && "border-amber-100 bg-slate-300 text-slate-600",
            day.status === "EMPTY" && "border-dashed border-slate-300 bg-slate-50 text-slate-300",
            (isPlayable || isPurchasable) && "group-hover:scale-105"
          )}
        >
          {day.status === "COMPLETED" ? (
            <Check className="h-6 w-6" />
          ) : day.status === "AVAILABLE" ? (
            <Play className="h-6 w-6 fill-current" />
          ) : day.status === "LOCKED_FUTURE" ? (
            <Lock className="h-5 w-5" />
          ) : day.status === "EMPTY" ? (
            <Slash className="h-5 w-5" />
          ) : (
            <Icon className="h-6 w-6" />
          )}
        </div>

        {isPurchasable && (
          <span className="absolute -right-1 -top-1 flex items-center gap-0.5 rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-amber-950 shadow">
            <Coins className="h-2.5 w-2.5" />
            {day.unlockCost}
          </span>
        )}
      </div>

      <div className="w-20">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
          Dia {day.dayIndex}
        </p>
        <p className="truncate text-[11px] font-medium leading-tight text-slate-600" title={label}>
          {label}
        </p>
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: Math.min(index, 6) * 0.05 }}
      className="group"
    >
      {isPlayable ? (
        <Link href={href} aria-label={`${label} — dia ${day.dayIndex}`}>
          {circle}
        </Link>
      ) : isPurchasable ? (
        <button
          type="button"
          onClick={() => onPurchase(day)}
          aria-label={`Desbloquear ${label} do dia ${day.dayIndex} por ${day.unlockCost} XP`}
          className="cursor-pointer"
        >
          {circle}
        </button>
      ) : (
        <div
          aria-label={`${label} — dia ${day.dayIndex}, indisponível`}
          className="cursor-not-allowed"
        >
          {circle}
        </div>
      )}
    </motion.div>
  );
}
