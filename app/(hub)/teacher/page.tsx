import type { Metadata } from "next";
import { TeacherDashboard } from "./_components/TeacherDashboard";

export const metadata: Metadata = {
  title: "Portal do Professor | English4You",
  description: "Gerencie suas turmas, aulas virtuais e lançamentos pedagógicos.",
};

export default function TeacherDashboardPage() {
  return <TeacherDashboard />;
}
