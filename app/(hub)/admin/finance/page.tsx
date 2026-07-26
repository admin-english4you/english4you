import type { Metadata } from "next";
import { FinancialOverview } from "./_components/FinancialOverview";

export const metadata: Metadata = {
  title: "Financeiro | English4You Admin",
  description: "Visão geral financeira, relatórios de receita e status das mensalidades.",
};

export default function AdminFinancePage() {
  return <FinancialOverview />;
}
