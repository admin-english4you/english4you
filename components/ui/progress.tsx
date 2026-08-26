"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const TONE_STYLES = {
  default: "bg-primary",
  success: "bg-success",
  xp: "bg-xp",
  warning: "bg-warning",
} as const;

interface ProgressProps {
  /** 0 a 100. Valores fora do intervalo são fixados nas bordas. */
  value: number;
  tone?: keyof typeof TONE_STYLES;
  size?: "sm" | "default" | "lg";
  className?: string;
  /** Rótulo acessível; sem ele a barra é tratada como decorativa. */
  label?: string;
}

const SIZE_STYLES = {
  sm: "h-1.5",
  default: "h-2.5",
  lg: "h-4",
} as const;

export function Progress({ value, tone = "default", size = "default", className, label }: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));

  return (
    <div
      role={label ? "progressbar" : undefined}
      aria-label={label}
      aria-valuenow={label ? Math.round(clamped) : undefined}
      aria-valuemin={label ? 0 : undefined}
      aria-valuemax={label ? 100 : undefined}
      className={cn("w-full overflow-hidden rounded-full bg-slate-200", SIZE_STYLES[size], className)}
    >
      <motion.div
        className={cn("h-full rounded-full", TONE_STYLES[tone])}
        initial={false}
        animate={{ width: `${clamped}%` }}
        transition={{ type: "spring", stiffness: 220, damping: 30 }}
      />
    </div>
  );
}
