import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { planService } from "@/modules/plan/plan.service";
import { TeacherLessonsView } from "./_components/TeacherLessonsView";
import type { PlanWithLessons } from "./_components/TeacherLessonsView";

export const metadata: Metadata = {
  title: "Lições | English4You",
  description: "Todas as lições criadas pelo admin, agrupadas por plano de ensino, para estudo.",
};

export default async function TeacherLessonsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/staff/login");

  // Ambos ungated: getActivePlansForSelect só devolve planos ACTIVE,
  // getOrderedLessonsForPlan já devolve na ordem do plano.
  const plans = await planService.getActivePlansForSelect();
  const grouped: PlanWithLessons[] = await Promise.all(
    plans.map(async (plan) => ({
      plan,
      lessons: await planService.getOrderedLessonsForPlan(plan.id),
    }))
  );

  return <TeacherLessonsView groups={grouped.filter((g) => g.lessons.length > 0)} />;
}
