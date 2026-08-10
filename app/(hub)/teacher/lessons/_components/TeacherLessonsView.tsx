"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { BookOpen, ChevronRight } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import { LESSON_STATUS_LABELS, LESSON_STATUS_STYLES } from "@/modules/lesson/lesson.utils";
import type { Lesson } from "@/modules/lesson/lesson.types";
import type { Plan } from "@/modules/plan/plan.types";

export interface PlanWithLessons {
  plan: Plan;
  lessons: Lesson[];
}

interface TeacherLessonsViewProps {
  groups: PlanWithLessons[];
}

export function TeacherLessonsView({ groups }: TeacherLessonsViewProps) {
  return (
    <AppLayout role="TEACHER">
      <PageHeader
        title="Lições"
        description="Todo o conteúdo criado pelo admin, agrupado por plano de ensino, para você estudar."
        className="mb-6"
      />

      {groups.length > 0 ? (
        <div className="space-y-6">
          {groups.map((group, gi) => (
            <motion.div
              key={group.plan.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(gi, 6) * 0.05 }}
            >
              <Card>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-amber-500" />
                  {group.plan.name}
                </CardTitle>
                {group.plan.description && (
                  <p className="mt-1 text-xs text-slate-500">{group.plan.description}</p>
                )}

                <div className="mt-4 space-y-2">
                  {group.lessons.map((lesson) => {
                    const openable = lesson.status !== "DISABLED";
                    const row = (
                      <div
                        className={cn(
                          "group flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5 transition-colors",
                          openable ? "hover:border-amber-200 hover:bg-amber-50/40" : "opacity-60"
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-800">{lesson.title}</p>
                          <p className="text-xs text-slate-500">Nível {lesson.level}</p>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-semibold",
                            LESSON_STATUS_STYLES[lesson.status]
                          )}
                        >
                          {LESSON_STATUS_LABELS[lesson.status]}
                        </span>
                        {openable && (
                          <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-amber-500" />
                        )}
                      </div>
                    );

                    return openable ? (
                      <Link key={lesson.id} href={`/teacher/lessons/${lesson.id}`}>
                        {row}
                      </Link>
                    ) : (
                      <div key={lesson.id}>{row}</div>
                    );
                  })}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={BookOpen}
          title="Nenhuma lição disponível ainda"
          description="Assim que o admin publicar planos de ensino com lições, elas aparecem aqui."
        />
      )}
    </AppLayout>
  );
}
