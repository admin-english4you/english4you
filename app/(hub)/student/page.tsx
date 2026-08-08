import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { todayKey } from "@/lib/date";
import { userService } from "@/modules/user/user.service";
import { classService } from "@/modules/class/class.service";
import { progressService } from "@/modules/progress/progress.service";
import { StudentDashboard } from "./_components/StudentDashboard";

export const metadata: Metadata = {
  title: "Portal do Aluno | English4You",
  description: "Acesse seu curso, aulas ao vivo e a prática do dia.",
};

export default async function StudentDashboardPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  // O usuário do cookie é um snapshot: relemos do banco para o avatar e a
  // turma virem atualizados.
  const user = await userService.getUserById(currentUser.id);
  if (!user) redirect("/login");

  const [overview, todayPractice, xp] = await Promise.all([
    classService.getStudentClassOverview(currentUser.id),
    progressService.getTodayPracticeDays(currentUser.id),
    progressService.getXpSummary(currentUser.id),
  ]);

  return (
    <StudentDashboard
      user={user}
      overview={overview}
      todayPractice={todayPractice}
      xp={xp}
      todayKey={todayKey()}
    />
  );
}
