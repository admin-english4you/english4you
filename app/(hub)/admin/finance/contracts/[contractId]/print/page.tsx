import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { contractService } from "@/modules/contract/contract.service";
import { ContractPrintView } from "./_components/ContractPrintView";

export const metadata: Metadata = {
  title: "Contrato | English4You",
};

interface ContractPrintPageProps {
  params: Promise<{ contractId: string }>;
}

/**
 * Versão para impressão/PDF de um contrato.
 *
 * Sem sidebar, header ou qualquer cromo do painel: a página é só o documento,
 * e o "Baixar PDF" é o próprio diálogo de impressão do navegador (Salvar como
 * PDF). Gerar o arquivo no servidor exigiria um motor de renderização — o
 * contrato é HTML rico do editor, e converter isso fielmente sem um navegador
 * é justamente a parte difícil. O navegador do admin já é esse motor.
 */
export default async function ContractPrintPage({ params }: ContractPrintPageProps) {
  const { contractId } = await params;

  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/staff/login");

  const contract = await contractService.getContractDetail(currentUser.role, contractId);
  if (!contract) notFound();

  return (
    <ContractPrintView
      html={contract.html}
      userName={contract.userName}
      packageName={contract.pkg?.name ?? null}
      signedAt={contract.signedAt}
      status={contract.status}
    />
  );
}
