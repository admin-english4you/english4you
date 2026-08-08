"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import type { PracticeDayState } from "@/modules/practice/practice.types";
import type { PracticePathView } from "@/modules/progress/progress.types";
import { WeeklyXpBar } from "./WeeklyXpBar";
import { TodayPracticeCard } from "./TodayPracticeCard";
import { PathLessonSection } from "./PathLessonSection";
import { PurchaseDayModal } from "./PurchaseDayModal";

interface PracticePathProps {
  path: PracticePathView;
}

export function PracticePath({ path }: PracticePathProps) {
  const [dayToPurchase, setDayToPurchase] = useState<PracticeDayState | null>(null);
  const hasSections = path.sections.length > 0;

  return (
    <AppLayout role="STUDENT">
      <PageHeader
        title="Prática"
        description="Uma atividade nova por dia para fixar o que você viu em aula."
        className="mb-6"
      />

      {!hasSections ? (
        <Card className="flex flex-col items-center py-14 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50">
            <Sparkles className="h-7 w-7 text-indigo-400" />
          </div>
          <p className="font-semibold text-slate-800">Sua prática ainda não começou</p>
          <p className="mt-1 max-w-md text-sm text-slate-500">
            As atividades são liberadas a partir do dia seguinte à sua primeira aula. Assim que o
            professor der a aula, seus 6 dias de prática aparecem aqui.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-1 lg:order-2">
            <TodayPracticeCard days={path.today} />
            <WeeklyXpBar
              earnedThisWeek={path.xp.earnedThisWeek}
              balance={path.xp.balance}
              goal={path.weeklyGoal}
            />
          </div>

          <div className="space-y-5 lg:col-span-2 lg:order-1">
            {path.sections.map((section) => (
              <PathLessonSection
                key={section.lessonId}
                section={section}
                onPurchase={setDayToPurchase}
              />
            ))}
          </div>
        </div>
      )}

      <PurchaseDayModal
        day={dayToPurchase}
        cost={path.unlockCost}
        balance={path.xp.balance}
        onClose={() => setDayToPurchase(null)}
      />
    </AppLayout>
  );
}
