import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { dashboardService } from "@/modules/dashboard/dashboard.service";
import { DashboardOverview } from "./_components/DashboardOverview";

export const metadata: Metadata = {
  title: "Dashboard Admin | English4You",
  description: "Painel administrativo de controle de alunos, turmas e financeiro.",
};

export default async function AdminDashboardPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/staff/login");

  const dashboard = await dashboardService.getAdminDashboard(currentUser.role);

  // Só o primeiro nome na saudação — "Bem-vindo de volta, Ana Paula Ferreira!"
  // fica estranho e quebra a linha no mobile.
  const firstName = currentUser.name.split(" ")[0];

  return <DashboardOverview dashboard={dashboard} adminName={firstName} />;
}
