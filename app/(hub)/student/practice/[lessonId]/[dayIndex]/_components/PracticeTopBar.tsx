"use client";

import { Heart, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface PracticeTopBarProps {
  /** 0 a 100. */
  progress: number;
  hearts: number;
  maxHearts: number;
  /** Flashcards não têm "errar", então as vidas somem. */
  showHearts: boolean;
  onExit: () => void;
}

export function PracticeTopBar({
  progress,
  hearts,
  maxHearts,
  showHearts,
  onExit,
}: PracticeTopBarProps) {
  return (
    <header className="flex shrink-0 items-center gap-3 px-4 py-3 sm:px-6">
      <button
        type="button"
        onClick={onExit}
        aria-label="Sair da prática"
        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
      >
        <X className="h-5 w-5" />
      </button>

      <Progress value={progress} className="flex-1" label="Progresso da prática" />

      {showHearts && (
        <div className="flex shrink-0 items-center gap-1" aria-label={`${hearts} vidas restantes`}>
          {Array.from({ length: maxHearts }).map((_, i) => (
            <Heart
              key={i}
              className={cn(
                "h-5 w-5 transition-all",
                i < hearts ? "fill-rose-500 text-rose-500" : "fill-slate-200 text-slate-200"
              )}
            />
          ))}
        </div>
      )}
    </header>
  );
}
