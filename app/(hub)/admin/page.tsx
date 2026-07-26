import type { Metadata } from "next";
import { DashboardOverview } from "./_components/DashboardOverview";

export const metadata: Metadata = {
  title: "Dashboard Admin | English4You",
  description: "Painel administrativo de controle de alunos, turmas e financeiro.",
};

export default function AdminDashboardPage() {
  return <DashboardOverview />;
}
