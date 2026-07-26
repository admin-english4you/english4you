import type { Metadata } from "next";
import { ClassesList } from "./_components/ClassesList";

export const metadata: Metadata = {
  title: "Turmas | English4You Admin",
  description: "Gerenciamento de turmas, horários e professores alocados.",
};

export default function AdminClassesPage() {
  return <ClassesList />;
}
