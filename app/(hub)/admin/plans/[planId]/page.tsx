import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { planService } from "@/modules/plan/plan.service";
import { practiceService } from "@/modules/practice/practice.service";
import { getCurrentUser } from "@/lib/auth-server";
import { PlanDetail } from "./_components/PlanDetail";
import { LearningItem, QuizQuestion } from "@/modules/practice/practice.types";

export const metadata: Metadata = {
  title: "Detalhes do Plano | English4You Admin",
  description: "Lições, conteúdo e itens de prática do plano de ensino.",
};

interface AdminPlanDetailPageProps {
  params: Promise<{ planId: string }>;
}

export default async function AdminPlanDetailPage({ params }: AdminPlanDetailPageProps) {
  const { planId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    notFound();
  }

  const plan = await planService.getPlanById(planId);
  if (!plan) {
    notFound();
  }

  const lessons = await planService.getOrderedLessonsForPlan(planId);

  const learningItemsEntries = await Promise.all(
    lessons.map(async (lesson) => [lesson.id, await practiceService.getItemsForLesson(user.role, lesson.id)] as const)
  );
  const learningItemsByLessonId = Object.fromEntries(learningItemsEntries) as Record<string, LearningItem[]>;

  const quizQuestionsEntries = await Promise.all(
    lessons.map(async (lesson) => [lesson.id, await practiceService.getQuizQuestionsForLesson(user.role, lesson.id)] as const)
  );
  const quizQuestionsByLessonId = Object.fromEntries(quizQuestionsEntries) as Record<string, QuizQuestion[]>;

  return (
    <PlanDetail
      plan={plan}
      lessons={lessons}
      learningItemsByLessonId={learningItemsByLessonId}
      quizQuestionsByLessonId={quizQuestionsByLessonId}
    />
  );
}
