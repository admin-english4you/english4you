import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { planService } from "@/modules/plan/plan.service";
import { practiceService } from "@/modules/practice/practice.service";
import { getCurrentUser } from "@/lib/auth-server";
import { PlanDetail } from "./_components/PlanDetail";
import { LearningItem, QuizQuestion } from "@/modules/practice/practice.types";

/**
 * Teto de execução das Server Actions desta rota, em segundos.
 *
 * "Gerar com IA" (`generateLearningItemsAction`) é de longe a ação mais lenta
 * do painel: medido, a extração de vocabulário/estrutura leva ~20s, o quiz de
 * compreensão ~13s e o de listening ~6s. Com o padrão da Vercel (10s no plano
 * Hobby) a ação era cortada no meio e o admin via um erro genérico, sem os
 * itens terem sido gravados.
 *
 * 60 é o TETO do plano Hobby — não adianta pedir mais, o deploy é recusado.
 * Se um dia isso não bastar (lição com áudio soma a transcrição antes de
 * disparar os lotes), o caminho não é aumentar o número: é tirar a geração do
 * ciclo da requisição.
 */
export const maxDuration = 60;

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
