"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PracticeDayState } from "@/modules/practice/practice.types";
import { PRACTICE_MODE_HINTS, PRACTICE_MODE_LABELS, formatXp } from "@/modules/progress/progress.utils";

interface TodayPracticeCardProps {
  days: PracticeDayState[];
}

/**
 * "O que eu faço agora".
 *
 * Essencial porque os ciclos se sobrepõem: num dia em que duas aulas estão
 * ativas, o aluno tem mais de uma atividade liberada, de lições diferentes.
 */
export function TodayPracticeCard({ days }: TodayPracticeCardProps) {
  const playable = days.filter((d) => d.status === "AVAILABLE" || d.status === "REPLAYABLE");

  if (playable.length === 0) {
    const allDone = days.length > 0 && days.every((d) => d.status === "COMPLETED");

    return (
      <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-6 text-slate-100">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Prática de hoje
        </p>
        <p className="mt-2 text-lg font-bold">
          {allDone ? "Tudo feito por hoje!" : "Nada liberado hoje"}
        </p>
        <p className="mt-1 text-sm text-slate-300">
          {allDone
            ? "Volte amanhã para a próxima atividade."
            : "Sua prática começa no dia seguinte à sua próxima aula."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {playable.map((day, i) => (
        <motion.div
          key={`${day.lessonId}-${day.dayIndex}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          className="rounded-2xl bg-gradient-to-br from-primary to-violet-600 p-6 text-white shadow-lg"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-primary-foreground/70">
                Prática de hoje · Dia {day.dayIndex}
              </p>
              <h2 className="mt-1 text-lg font-bold">{PRACTICE_MODE_LABELS[day.renderMode]}</h2>
            </div>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <Sparkles className="h-4 w-4" />
            </span>
          </div>

          <p className="mt-2 text-sm text-primary-foreground/80">{PRACTICE_MODE_HINTS[day.renderMode]}</p>
          <p className="mt-1 truncate text-xs text-primary-foreground/70">{day.lessonTitle}</p>

          <div className="mt-5 flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-primary-foreground/80">
              {day.xpReward > 0 ? `+${formatXp(day.xpReward)}` : "Revisão · sem XP"}
            </span>
            <Button
              render={<Link href={`/student/practice/${day.lessonId}/${day.dayIndex}`} />}
              className="bg-white font-bold text-primary hover:bg-primary/10"
              size="sm"
            >
              {day.status === "REPLAYABLE" ? "Refazer" : "Começar"}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
