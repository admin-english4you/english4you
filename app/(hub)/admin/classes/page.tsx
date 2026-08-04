import type { Metadata } from "next";
import { ClassesList } from "./_components/ClassesList";
import { classService } from "@/modules/class/class.service";
import { getCurrentUser } from "@/lib/auth-server";

export const metadata: Metadata = {
  title: "Turmas | English4You Admin",
  description: "Gerenciamento de turmas, horários e professores alocados.",
};

export default async function AdminClassesPage() {
  const user = await getCurrentUser();
  const classes = user ? await classService.getAllClasses(user.role) : [];

  return <ClassesList initialClasses={classes} />;
}
