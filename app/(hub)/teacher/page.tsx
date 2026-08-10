import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { todayKey } from "@/lib/date";
import { userService } from "@/modules/user/user.service";
import { classService } from "@/modules/class/class.service";
import { TeacherDashboard } from "./_components/TeacherDashboard";

export const metadata: Metadata = {
  title: "Portal do Professor | English4You",
  description: "Gerencie suas turmas, aulas ao vivo e materiais pedagógicos.",
};

export default async function TeacherDashboardPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/staff/login");

  const user = await userService.getUserById(currentUser.id);
  if (!user) redirect("/staff/login");

  const overview = await classService.getTeacherClassesOverview(currentUser.id);

  return <TeacherDashboard user={user} overview={overview} todayKey={todayKey()} />;
}
