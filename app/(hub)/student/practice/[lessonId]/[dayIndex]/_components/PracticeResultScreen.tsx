"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, PartyPopper, Target, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatXp } from "@/modules/progress/progress.utils";

interface PracticeResultScreenProps {
  correct: number;
  total: number;
  xpEarned: number;
  isReplay: boolean;
  saving: boolean;
  saveError: string | null;
  onRetrySave: () => void;
}

export function PracticeResultScreen({
  correct,
  total,
  xpEarned,
  isReplay,
  saving,
  saveError,
  onRetrySave,
}: PracticeResultScreenProps) {
  const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
  const nailed = percent >= 80;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex w-full max-w-md flex-col items-center px-5 py-10 text-center"
    >
      <motion.div
        initial={{ scale: 0.6, rotate: -12 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 14 }}
        className={`flex h-20 w-20 items-center justify-center rounded-3xl ${
          nailed ? "bg-emerald-100 text-emerald-600" : "bg-primary/10 text-primary"
        }`}
      >
        {nailed ? <PartyPopper className="h-9 w-9" /> : <Target className="h-9 w-9" />}
      </motion.div>

      <h2 className="mt-6 text-2xl font-bold text-slate-900">
        {nailed ? "Mandou bem!" : "Prática concluída"}
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Você acertou {correct} de {total} ({percent}%).
      </p>

      <div className="mt-6 w-full rounded-2xl border border-slate-200 bg-white p-5">
        {saving ? (
          <p className="flex items-center justify-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Salvando seu progresso...
          </p>
        ) : saveError ? (
          <div>
            <p className="text-sm text-rose-700">{saveError}</p>
            <Button variant="outline" size="sm" onClick={onRetrySave} className="mt-3">
              Tentar salvar de novo
            </Button>
          </div>
        ) : isReplay ? (
          <p className="text-sm text-slate-600">
            Revisão registrada. <strong>Refazer não gera XP.</strong>
          </p>
        ) : (
          <motion.p
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="flex items-center justify-center gap-2 text-lg font-bold text-amber-600"
          >
            <Trophy className="h-5 w-5" />+{formatXp(xpEarned)}
          </motion.p>
        )}
      </div>

      <Button
        render={<Link href="/student/practice" />}
        size="lg"
        className="mt-6 w-full font-bold"
        disabled={saving}
      >
        Voltar para a trilha
      </Button>
    </motion.div>
  );
}
