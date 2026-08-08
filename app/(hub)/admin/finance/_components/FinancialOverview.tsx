"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { 
  DollarSign, 
  CreditCard, 
  Download, 
  FileText, 
  TrendingUp, 
  TrendingDown,
  Clock,
  AlertCircle,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { PaymentStatus } from "@/modules/finance/finance.types";

interface Transaction {
  id: string;
  student: string;
  type: string;
  amount: number;
  date: string;
  status: PaymentStatus;
  method: string;
}

export function FinancialOverview() {
  const transactions: Transaction[] = [
    { id: "TRX-9382", student: "Noah Patel", type: "Mensalidade (Fev)", amount: 450.00, date: "2026-02-24", status: "PAID", method: "Mercado Pago (PIX)" },
    { id: "TRX-9381", student: "Olivia Chen", type: "Taxa de Material", amount: 150.00, date: "2026-02-24", status: "PAID", method: "Cartão de Crédito" },
    { id: "TRX-9380", student: "Lucas Silva", type: "Mensalidade (Fev)", amount: 450.00, date: "2026-02-23", status: "PENDING", method: "Boleto Bancário" },
    { id: "TRX-9379", student: "Liam Garcia", type: "Aulas Particulares (5h)", amount: 350.00, date: "2026-02-21", status: "PAID", method: "Cartão de Crédito" },
    { id: "TRX-9378", student: "Mia Wong", type: "Mensalidade (Fev)", amount: 450.00, date: "2026-02-20", status: "OVERDUE", method: "Em Atraso" },
    { id: "TRX-9377", student: "Emma Thompson", type: "Repasse de Horas (Teacher)", amount: -2800.00, date: "2026-02-15", status: "PAID", method: "Transferência" },
    { id: "TRX-9376", student: "Sophia Kim", type: "Repasse de Horas (Teacher)", amount: -2500.00, date: "2026-02-15", status: "PAID", method: "Transferência" },
    { id: "TRX-9375", student: "Robert James", type: "Repasse de Horas (Teacher)", amount: -3100.00, date: "2026-02-15", status: "FAILED", method: "Cartão Recusado" },
  ];

  return (
    <AppLayout role="ADMIN">
      <div className="mx-auto space-y-6">
        <PageHeader 
          title="Visão Geral Financeira" 
          description="Monitore receitas, mensalidades do Mercado Pago e repsasse a professores."
        >
          <Button variant="outline" className="flex-1 sm:flex-none">
            <Download className="w-4 h-4 mr-2" /> Exportar CSV
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700 flex-1 sm:flex-none">
            <FileText className="w-4 h-4 mr-2" /> Nova Fatura
          </Button>
        </PageHeader>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-emerald-200 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 font-bold">
                <DollarSign className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-slate-600 text-sm">Receita Mensal</h3>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">R$ 24.500,00</div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
              <TrendingUp className="w-4 h-4" /> +12.5% <span className="text-slate-400 font-normal">vs mês anterior</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-amber-200 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 font-bold">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-slate-600 text-sm">Pagamentos Pendentes</h3>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">R$ 3.250,00</div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <span>12 faturas aguardando pagamento</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-rose-200 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 font-bold">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-slate-600 text-sm">Inadimplentes (OVERDUE)</h3>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">R$ 850,00</div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-600">
              <TrendingDown className="w-4 h-4" /> 2 alunos <span className="text-slate-400 font-normal">bloqueio automático</span>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
            <h2 className="font-bold text-base text-slate-900">Transações Recentes</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="text-xs">
                Últimos 30 Dias <ChevronDown className="w-3.5 h-3.5 ml-1 text-slate-400" />
              </Button>
              <Button variant="outline" size="sm" className="text-xs">
                Todos os Status <ChevronDown className="w-3.5 h-3.5 ml-1 text-slate-400" />
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-xs uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-3.5">ID Transação</th>
                  <th className="px-6 py-3.5">Usuário / Entidade</th>
                  <th className="px-6 py-3.5">Descrição</th>
                  <th className="px-6 py-3.5">Valor</th>
                  <th className="px-6 py-3.5">Data</th>
                  <th className="px-6 py-3.5">Método</th>
                  <th className="px-6 py-3.5">Status (PaymentStatusEnum)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((trx) => {
                  const isExpense = trx.amount < 0;

                  return (
                    <tr key={trx.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-slate-400">{trx.id}</td>
                      <td className="px-6 py-4 font-semibold text-slate-900">{trx.student}</td>
                      <td className="px-6 py-4 text-slate-600">{trx.type}</td>
                      <td className={`px-6 py-4 font-bold ${isExpense ? 'text-slate-900' : 'text-emerald-600'}`}>
                        {isExpense ? '-' : '+'}R$ {Math.abs(trx.amount).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs">
                        {new Date(trx.date).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-600 text-xs">
                          <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                          <span>{trx.method}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold border ${
                          trx.status === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          trx.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          trx.status === 'OVERDUE' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {trx.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-slate-200 bg-slate-50 text-center">
            <button className="text-indigo-600 font-semibold text-xs hover:underline transition-colors">
              Ver histórico completo de transações →
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
