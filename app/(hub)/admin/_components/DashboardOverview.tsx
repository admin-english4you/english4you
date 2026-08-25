import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import {
  Users,
  GraduationCap,
  DollarSign,
  FileSignature,
  ArrowRight,
  UserPlus,
  PlusCircle,
  Clock,
  BookOpen,
  Inbox,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatCents } from "@/modules/finance/finance.utils";
import type { ActivityKind, AdminDashboard } from "@/modules/dashboard/dashboard.types";

interface DashboardOverviewProps {
  dashboard: AdminDashboard;
  adminName: string;
}

const ACTIVITY_BADGES: Record<ActivityKind, { label: string; className: string }> = {
  ENROLLMENT: { label: "Cadastro", className: "bg-emerald-50 text-emerald-700" },
  CONTRACT: { label: "Contrato", className: "bg-indigo-50 text-indigo-700" },
  PAYMENT: { label: "Financeiro", className: "bg-amber-50 text-amber-700" },
  CLASS: { label: "Turmas", className: "bg-purple-50 text-purple-700" },
};

/**
 * Componente de SERVIDOR (sem "use client"): só renderiza os dados que a
 * página busca e não tem nenhuma interação própria — todo o estado que existia
 * aqui era mock. Os textos de tempo ("Há 15 min") já chegam formatados do
 * Service, justamente para não precisarem de relógio no cliente.
 */
export function DashboardOverview({ dashboard, adminName }: DashboardOverviewProps) {
  const { stats, activities, monthLabel } = dashboard;

  const cards = [
    {
      title: "Entradas do mês",
      value: formatCents(stats.monthIncomeCents),
      detail: `Saldo de ${formatCents(stats.monthNetCents)} em ${monthLabel}`,
      icon: DollarSign,
      color: "emerald" as const,
      href: "/admin/finance",
    },
    {
      title: "Alunos ativos",
      value: `${stats.activeStudents} ${stats.activeStudents === 1 ? "aluno" : "alunos"}`,
      detail: `${stats.activeTeachers} ${stats.activeTeachers === 1 ? "professor" : "professores"} na equipe`,
      icon: Users,
      color: "indigo" as const,
      href: "/admin/users",
    },
    {
      title: "Turmas ativas",
      value: `${stats.activeClasses} ${stats.activeClasses === 1 ? "turma" : "turmas"}`,
      detail:
        stats.activeClasses === 0
          ? "Nenhuma turma em funcionamento"
          : `Até ${stats.activeClasses * 12} alunos de capacidade`,
      icon: GraduationCap,
      color: "amber" as const,
      href: "/admin/classes",
    },
    {
      title: "Contratos pendentes",
      value: `${stats.pendingContracts} ${stats.pendingContracts === 1 ? "assinatura" : "assinaturas"}`,
      detail: stats.pendingContracts > 0 ? "Aguardando o aluno assinar" : "Nenhum contrato aguardando",
      icon: FileSignature,
      color: "rose" as const,
      href: "/admin/finance?tab=contratos",
    },
  ];

  return (
    <AppLayout role="ADMIN">
      <div className="mx-auto space-y-8">
        <PageHeader
          title="Painel do Administrador"
          description={`Bem-vindo de volta, ${adminName}! Aqui está o resumo das operações da English4You hoje.`}
        >
          <Link href="/admin/users" className={cn(buttonVariants({ variant: "outline" }), "flex-1 sm:flex-initial")}>
            <UserPlus className="mr-2 h-4 w-4" /> Novo Usuário
          </Link>
          <Link
            href="/admin/classes"
            className={cn(
              buttonVariants({ variant: "default" }),
              "flex-1 bg-indigo-600 text-white hover:bg-indigo-700 sm:flex-initial"
            )}
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Criar Turma
          </Link>
        </PageHeader>

        {/* Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.title}
                href={card.href}
                className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {card.title}
                  </span>
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg border",
                      card.color === "emerald" && "border-emerald-100 bg-emerald-50 text-emerald-600",
                      card.color === "indigo" && "border-indigo-100 bg-indigo-50 text-indigo-600",
                      card.color === "amber" && "border-amber-100 bg-amber-50 text-amber-600",
                      card.color === "rose" && "border-rose-100 bg-rose-50 text-rose-600"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <div className="mb-1 text-2xl font-bold text-slate-900">{card.value}</div>
                <div className="text-xs font-medium text-slate-500">{card.detail}</div>
              </Link>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Atividades */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <div>
              <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900">Atividades Recentes</h2>
                <span className="text-xs text-slate-400">Cadastros, contratos, turmas e pagamentos</span>
              </div>

              {activities.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-slate-200 px-4 py-10 text-center">
                  <Inbox className="h-6 w-6 text-slate-300" />
                  <p className="text-sm font-medium text-slate-500">Nenhuma atividade ainda</p>
                  <p className="max-w-sm text-xs text-slate-400">
                    Cadastre um usuário ou crie uma turma — os acontecimentos da escola aparecem aqui
                    automaticamente.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activities.map((activity) => {
                    const badge = ACTIVITY_BADGES[activity.kind];
                    return (
                      <Link
                        key={activity.id}
                        href={activity.href}
                        className="flex items-center justify-between gap-3 rounded-lg border border-transparent p-3 transition-colors hover:border-slate-100 hover:bg-slate-50"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className={cn(
                              "shrink-0 rounded px-2 py-0.5 text-[11px] font-bold",
                              badge.className
                            )}
                          >
                            {badge.label}
                          </span>
                          <span className="truncate text-sm font-medium text-slate-700">
                            {activity.text}
                          </span>
                        </div>
                        <span className="flex shrink-0 items-center gap-1 text-xs text-slate-400">
                          <Clock className="h-3 w-3" /> {activity.relative}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-6 border-t border-slate-100 pt-4 text-right">
              <Link
                href="/admin/users"
                className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:underline"
              >
                Ver todos os usuários <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Atalhos */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 border-b border-slate-100 pb-3 text-base font-bold text-slate-900">
              Atalhos dos Módulos
            </h2>
            <div className="space-y-3">
              <Link
                href="/admin/plans"
                className="group flex items-center justify-between rounded-lg border border-slate-100 p-3 transition-all hover:border-indigo-200 hover:bg-indigo-50/50"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Planos de Ensino</p>
                    <p className="text-xs text-slate-400">Criar lições e materiais</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 transition-colors group-hover:text-indigo-600" />
              </Link>

              <Link
                href="/admin/finance"
                className="group flex items-center justify-between rounded-lg border border-slate-100 p-3 transition-all hover:border-emerald-200 hover:bg-emerald-50/50"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                    <DollarSign className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Financeiro &amp; Contratos</p>
                    <p className="text-xs text-slate-400">Livro-caixa e Mercado Pago</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 transition-colors group-hover:text-emerald-600" />
              </Link>

              <Link
                href="/admin/classes"
                className="group flex items-center justify-between rounded-lg border border-slate-100 p-3 transition-all hover:border-amber-200 hover:bg-amber-50/50"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-amber-50 p-2 text-amber-600 transition-colors group-hover:bg-amber-600 group-hover:text-white">
                    <GraduationCap className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Turmas &amp; Aulas</p>
                    <p className="text-xs text-slate-400">Capacidade máx. 12 alunos</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 transition-colors group-hover:text-amber-600" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
