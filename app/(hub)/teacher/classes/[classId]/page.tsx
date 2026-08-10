import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { todayKey } from "@/lib/date";
import { classService } from "@/modules/class/class.service";
import { TeacherClassDetailView } from "./_components/TeacherClassDetailView";

interface TeacherClassDetailPageProps {
  params: Promise<{ classId: string }>;
}

export const metadata: Metadata = {
  title: "Minha Turma | English4You",
};

export default async function TeacherClassDetailPage({ params }: TeacherClassDetailPageProps) {
  const { classId } = await params;

  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/staff/login");

  const detail = await classService.getTeacherClassDetail(currentUser.id, classId);
  if (!detail) notFound();

  return <TeacherClassDetailView detail={detail} todayKey={todayKey()} />;
}
