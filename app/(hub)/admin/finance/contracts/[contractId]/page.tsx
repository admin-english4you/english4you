import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { contractService } from "@/modules/contract/contract.service";
import { financeService } from "@/modules/finance/finance.service";
import { ContractDetailView } from "./_components/ContractDetailView";

export const metadata: Metadata = {
  title: "Contrato | English4You Admin",
  description: "Texto assinado e dados de auditoria do contrato.",
};

interface ContractPageProps {
  params: Promise<{ contractId: string }>;
}

export default async function AdminContractDetailPage({ params }: ContractPageProps) {
  const { contractId } = await params;

  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/staff/login");

  const [contract, packages] = await Promise.all([
    contractService.getContractDetail(currentUser.role, contractId),
    // Opções do seletor de "Trocar pacote" — só os ativos podem ser vendidos.
    financeService.getActivePackagesForSelect(),
  ]);
  if (!contract) notFound();

  return <ContractDetailView contract={contract} packages={packages} />;
}
