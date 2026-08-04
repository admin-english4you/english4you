import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { classService } from "@/modules/class/class.service";
import { userService } from "@/modules/user/user.service";
import { planService } from "@/modules/plan/plan.service";
import { getCurrentUser } from "@/lib/auth-server";
import { ClassDetail } from "./_components/ClassDetail";

export const metadata: Metadata = {
  title: "Detalhes da Turma | English4You Admin",
  description: "Professor, plano de ensino, alunos e aulas da turma.",
};

interface AdminClassDetailPageProps {
  params: Promise<{ classId: string }>;
}

export default async function AdminClassDetailPage({ params }: AdminClassDetailPageProps) {
  const { classId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    notFound();
  }

  const classDetail = await classService.getClassById(user.role, classId);
  if (!classDetail) {
    notFound();
  }

  const [teachers, availableStudents, activePlans, otherClasses] = await Promise.all([
    userService.getTeachersForSelect(user.role),
    userService.getAvailableStudentsForClass(user.role, classId),
    planService.getActivePlansForSelect(),
    classService.getOtherActiveClasses(user.role, classId),
  ]);

  return (
    <ClassDetail
      classData={classDetail}
      teachers={teachers}
      availableStudents={availableStudents}
      activePlans={activePlans}
      otherClasses={otherClasses}
    />
  );
}
