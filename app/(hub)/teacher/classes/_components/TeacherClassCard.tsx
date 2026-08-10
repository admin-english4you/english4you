"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CalendarDays, ChevronRight, Users } from "lucide-react";
import { formatScheduleSummary } from "@/modules/class/class.utils";
import { STATUS_LABELS, STATUS_STYLES } from "@/modules/class/class.utils";
import { cn } from "@/lib/utils";
import type { ClassGroupListItem } from "@/modules/class/class.types";

interface TeacherClassCardProps {
  classGroup: ClassGroupListItem;
  index?: number;
}

export function TeacherClassCard({ classGroup, index = 0 }: TeacherClassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 6) * 0.05 }}
    >
      <Link
        href={`/teacher/classes/${classGroup.id}`}
        className="group block rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-amber-300 hover:shadow-sm"
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-bold text-slate-900 group-hover:text-amber-700">
              {classGroup.name}
            </h3>
            <p className="text-xs text-slate-500">Nível {classGroup.level}</p>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-semibold",
              STATUS_STYLES[classGroup.status]
            )}
          >
            {STATUS_LABELS[classGroup.status]}
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatScheduleSummary(classGroup.schedule)}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {classGroup.enrolledCount} {classGroup.enrolledCount === 1 ? "aluno" : "alunos"}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-end text-xs font-medium text-amber-600 opacity-0 transition-opacity group-hover:opacity-100">
          Ver turma <ChevronRight className="h-3.5 w-3.5" />
        </div>
      </Link>
    </motion.div>
  );
}
