import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth-server";
import { financeService } from "@/modules/finance/finance.service";
import { contractService } from "@/modules/contract/contract.service";
import { ContractStatusEnum } from "@/modules/contract/contract.schema";
import { FinanceShell, type FinanceTab } from "./_components/FinanceShell";
import { FinancialOverview } from "./_components/FinancialOverview";
import { PackagesTab } from "./_components/PackagesTab";
import { TemplatesTab } from "./_components/TemplatesTab";
import { ContractsTab } from "./_components/ContractsTab";

export const metadata: Metadata = {
  title: "Financeiro | English4You Admin",
  description: "Pacotes, contratos e modelos de contrato da escola.",
};

/** `.catch()` para que um `?tab=` inventado caia na visão geral em vez de derrubar a página. */
const TabSchema = z
  .enum(["visao-geral", "contratos", "modelos", "pacotes"])
  .catch("visao-geral");

const StatusFilterSchema = ContractStatusEnum.optional().catch(undefined);

interface AdminFinancePageProps {
  searchParams: Promise<{ tab?: string; status?: string }>;
}

/**
 * Abas por URL (`?tab=`), e não por estado de cliente: assim cada aba busca
 * APENAS os seus dados no servidor (a lista de contratos cresce sem limite),
 * o link é compartilhável e o `revalidatePath` das actions basta para
 * atualizar a tela.
 */
export default async function AdminFinancePage({ searchParams }: AdminFinancePageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/staff/login");

  const params = await searchParams;
  const tab: FinanceTab = TabSchema.parse(params.tab);
  const status = StatusFilterSchema.parse(params.status);

  return (
    <FinanceShell activeTab={tab}>
      {tab === "visao-geral" && <FinancialOverview />}

      {tab === "pacotes" && (
        <PackagesTab packages={await financeService.getAllPackages(currentUser.role)} />
      )}

      {tab === "modelos" && (
        <TemplatesTab templates={await contractService.getTemplates(currentUser.role)} />
      )}

      {tab === "contratos" && (
        <ContractsTab
          contracts={await contractService.getContracts(currentUser.role, { status })}
          activeStatus={status ?? "ALL"}
        />
      )}
    </FinanceShell>
  );
}
