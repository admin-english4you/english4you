import type { Metadata } from "next";
import { StudentDashboard } from "./_components/StudentDashboard";

export const metadata: Metadata = {
  title: "Portal do Aluno | English4You",
  description: "Acesse seu curso, aulas ao vivo e exercícios com inteligência artificial.",
};

export default function StudentDashboardPage() {
  return <StudentDashboard />;
}
