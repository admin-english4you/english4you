import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { classService } from "@/modules/class/class.service";
import { TeacherClassesView } from "./_components/TeacherClassesView";

export const metadata: Metadata = {
  title: "Minhas Turmas | English4You",
  description: "Turmas onde você é o professor titular.",
};

export default async function TeacherClassesPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/staff/login");

  const classes = await classService.getTeacherClasses(currentUser.id);

  return <TeacherClassesView classes={classes} />;
}
