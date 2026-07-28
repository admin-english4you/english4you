"use client";

import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { 
  Users, 
  GraduationCap, 
  DollarSign, 
  FileSignature, 
  TrendingUp, 
  ArrowRight,
  UserPlus,
  PlusCircle,
  Clock,
  BookOpen
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DashboardOverview() {
  const stats = [
    { title: "Receita Mensal", value: "R$ 24.500,00", change: "+12,5%", icon: DollarSign, color: "emerald", href: "/admin/finance" },
    { title: "Alunos Ativos", value: "128 Alunos", change: "+8 este mês", icon: Users, color: "indigo", href: "/admin/users" },
    { title: "Turmas Ativas", value: "14 Turmas", change: "100% capacidade", icon: GraduationCap, color: "amber", href: "/admin/classes" },
    { title: "Contratos Pendentes", value: "5 Assinaturas", change: "Ação necessária", icon: FileSignature, color: "rose", href: "/admin/finance" },
  ];

  const recentActivities = [
    { id: 1, text: "Novo aluno matriculado: Noah Patel", time: "Há 15 min", badge: "Matrícula", color: "bg-emerald-50 text-emerald-700" },
    { id: 2, text: "Contrato assinado por Sofia Kim (Teacher)", time: "Há 1 hora", badge: "Contrato", color: "bg-indigo-50 text-indigo-700" },
    { id: 3, text: "Pagamento confirmado de Lucas Silva", time: "Há 3 horas", badge: "Financeiro", color: "bg-amber-50 text-amber-700" },
    { id: 4, text: "Nova turma criada: Business English B2", time: "Ontem", badge: "Turmas", color: "bg-purple-50 text-purple-700" },
  ];

  return (
    <AppLayout role="ADMIN">
      <div className="max-w-7xl mx-auto space-y-8">
        <PageHeader 
          title="Painel do Administrador" 
          description="Bem-vinda de volta, Sarah! Aqui está o resumo das operações da English4You hoje."
        >
          <Link href="/admin/users" className={cn(buttonVariants({ variant: "outline" }), "flex-1 sm:flex-initial")}>
            <UserPlus className="w-4 h-4 mr-2" /> Novo Usuário
          </Link>
          <Link href="/admin/classes" className={cn(buttonVariants({ variant: "default" }), "flex-1 sm:flex-initial bg-indigo-600 hover:bg-indigo-700 text-white")}>
            <PlusCircle className="w-4 h-4 mr-2" /> Criar Turma
          </Link>
        </PageHeader>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <Link
                key={idx}
                href={stat.href}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{stat.title}</span>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center border
                    ${stat.color === 'emerald' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                      stat.color === 'indigo' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                      stat.color === 'amber' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                      'bg-rose-50 text-rose-600 border-rose-100'}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-900 mb-1">{stat.value}</div>
                <div className="flex items-center text-xs font-medium text-slate-500">
                  <TrendingUp className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                  <span className="text-slate-600">{stat.change}</span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Two Column Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <h2 className="font-bold text-slate-900 text-base">Atividades Recentes</h2>
                <span className="text-xs text-slate-400">Atualizado em tempo real</span>
              </div>
              <div className="space-y-4">
                {recentActivities.map((act) => (
                  <div key={act.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${act.color}`}>
                        {act.badge}
                      </span>
                      <span className="text-sm font-medium text-slate-700">{act.text}</span>
                    </div>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {act.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 text-right">
              <Link href="/admin/users" className="text-indigo-600 text-sm font-semibold hover:underline inline-flex items-center gap-1">
                Ver todos os logs <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Quick Modules */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="font-bold text-slate-900 text-base mb-4 pb-3 border-b border-slate-100">Atalhos dos Módulos</h2>
            <div className="space-y-3">
              <Link href="/admin/plans" className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all group">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">Planos de Ensino</p>
                    <p className="text-xs text-slate-400">Criar lições e materiais</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
              </Link>

              <Link href="/admin/finance" className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/50 transition-all group">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">Financeiro & Contratos</p>
                    <p className="text-xs text-slate-400">Pagamentos Mercado Pago</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
              </Link>

              <Link href="/admin/classes" className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-amber-200 hover:bg-amber-50/50 transition-all group">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">Turmas & Aulas</p>
                    <p className="text-xs text-slate-400">Capacidade max 12 alunos</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-colors" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
