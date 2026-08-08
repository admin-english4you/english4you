import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { todayKey } from "@/lib/date";
import { classService } from "@/modules/class/class.service";
import { StudentClassesView } from "./_components/StudentClassesView";

export const metadata: Metadata = {
  title: "Minha Turma | English4You",
  description: "Veja sua turma, seu professor e o histórico das suas aulas.",
};

export default async function StudentClassesPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const overview = await classService.getStudentClassOverview(currentUser.id);

  return <StudentClassesView overview={overview} todayKey={todayKey()} />;
}
