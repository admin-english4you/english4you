import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { contractService } from "@/modules/contract/contract.service";
import { ContractTemplateEditor } from "./_components/ContractTemplateEditor";

export const metadata: Metadata = {
  title: "Modelo de Contrato | English4You Admin",
  description: "Edite o texto e as variáveis do modelo de contrato.",
};

interface TemplatePageProps {
  params: Promise<{ templateId: string }>;
}

export default async function AdminContractTemplatePage({ params }: TemplatePageProps) {
  const { templateId } = await params;

  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/staff/login");

  const template = await contractService.getTemplateById(currentUser.role, templateId);
  if (!template) notFound();

  return <ContractTemplateEditor template={template} />;
}
