"use client";

import { Flame, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatXp } from "@/modules/progress/progress.utils";

interface WeeklyXpBarProps {
  earnedThisWeek: number;
  balance: number;
  goal: number;
}

export function WeeklyXpBar({ earnedThisWeek, balance, goal }: WeeklyXpBarProps) {
  const percent = goal > 0 ? Math.min(100, Math.round((earnedThisWeek / goal) * 100)) : 0;
  const reached = earnedThisWeek >= goal;

  return (
    <Card>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Sua semana
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{formatXp(earnedThisWeek)}</p>
        </div>
        <div className="rounded-lg bg-amber-50 px-3 py-2 text-right">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700">Saldo</p>
          <p className="flex items-center gap-1 text-sm font-bold text-amber-700">
            <Trophy className="h-3.5 w-3.5" />
            {balance}
          </p>
        </div>
      </div>

      <Progress value={percent} tone={reached ? "success" : "xp"} label="Meta semanal de XP" />

      <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
        {reached ? (
          <>
            <Flame className="h-3.5 w-3.5 text-orange-500" />
            Meta da semana batida! Continue praticando.
          </>
        ) : (
          <>Faltam {formatXp(goal - earnedThisWeek)} para a meta da semana.</>
        )}
      </p>
    </Card>
  );
}
