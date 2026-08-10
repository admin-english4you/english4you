import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { lessonService } from "@/modules/lesson/lesson.service";
import { TeacherLessonView } from "./_components/TeacherLessonView";

interface TeacherLessonPageProps {
  params: Promise<{ lessonId: string }>;
}

export const metadata: Metadata = {
  title: "Lição | English4You",
};

export default async function TeacherLessonPage({ params }: TeacherLessonPageProps) {
  const { lessonId } = await params;

  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/staff/login");

  // Ungated: devolve a lição só se publicada (ACTIVE ou IN_PROGRESS, nunca DISABLED).
  const lesson = await lessonService.getPublishedLessonById(lessonId);
  if (!lesson) notFound();

  return <TeacherLessonView lesson={lesson} />;
}
