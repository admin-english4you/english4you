import Link from "next/link";
import { ArrowLeft, GraduationCap, Mail, ShieldCheck } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { APP_TIMEZONE } from "@/lib/date";
import { IdentityVault } from "./IdentityVault";
import { UserContractsCard } from "./UserContractsCard";
import { StudentBillingCard } from "./StudentBillingCard";
import { AccountStatusCard } from "./AccountStatusCard";
import { ScholarshipCard } from "./ScholarshipCard";
import { ResendInviteCard } from "./ResendInviteCard";
import type { Contract, ContractBillingMode } from "@/modules/contract/contract.types";
import type { StudentFinancialSummary } from "@/modules/payment/payment.types";
import type { Role } from "@/modules/user/user.types";

interface UserDetailViewProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
    status: string;
    avatarUrl: string | null;
    createdAt: Date;
    hasIdentity: boolean;
    hasPhone: boolean;
  };
  classGroup: { id: string; name: string } | null;
  contracts: (Contract & { packageName: string | null })[];
  financial: StudentFinancialSummary | null;
  /** Termos de bolsa do contrato vigente; `null` quando não há contrato. */
  scholarship: {
    scholarshipPercent: number;
    billingMode: ContractBillingMode;
    canEdit: boolean;
  } | null;
  isSelf: boolean;
}

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrador",
  TEACHER: "Professor",
  STUDENT: "Aluno",
};

const ROLE_STYLES: Record<Role, string> = {
  ADMIN: "bg-primary/10 text-primary border-primary/20",
  TEACHER: "bg-amber-50 text-amber-700 border-amber-200",
  STUDENT: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export function UserDetailView({
  user,
  classGroup,
  contracts,
  financial,
  scholarship,
  isSelf,
}: UserDetailViewProps) {
  const isActive = user.status === "Active";
  const isStudent = user.role === "STUDENT";

  const monthLabel = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: APP_TIMEZONE,
  }).format(new Date());

  const hasLiveSubscription = Boolean(
    financial?.subscription &&
      !["CANCELLED", "COMPLETED"].includes(financial.subscription.status)
  );

  return (
    <AppLayout role="ADMIN">
      <div className="mx-auto space-y-6">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para usuários
        </Link>

        {/* Cabeçalho */}
        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center">
          <Avatar name={user.name} src={user.avatarUrl} size="lg" className="shrink-0" />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">{user.name}</h1>
              <span
                className={cn(
                  "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold",
                  ROLE_STYLES[user.role]
                )}
              >
                {ROLE_LABELS[user.role]}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-bold",
                  isActive
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-slate-100 text-slate-500"
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    isActive ? "bg-emerald-500" : "bg-slate-400"
                  )}
                />
                {isActive ? "Ativo" : "Inativo"}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                {user.email}
              </span>
              {classGroup && (
                <Link
                  href={`/admin/classes/${classGroup.id}`}
                  className="inline-flex items-center gap-1.5 hover:text-primary"
                >
                  <GraduationCap className="h-3.5 w-3.5 text-slate-400" />
                  {classGroup.name}
                </Link>
              )}
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
                Desde {user.createdAt.toLocaleDateString("pt-BR")}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <IdentityVault
              userId={user.id}
              userName={user.name}
              hasIdentity={user.hasIdentity}
              hasPhone={user.hasPhone}
            />
            <UserContractsCard contracts={contracts} />
            {isStudent && scholarship && (
              <ScholarshipCard
                userId={user.id}
                userName={user.name}
                scholarshipPercent={scholarship.scholarshipPercent}
                billingMode={scholarship.billingMode}
                packageName={financial?.pkg?.name ?? null}
                installmentValueCents={financial?.pkg?.installmentValueCents ?? null}
                canEdit={scholarship.canEdit}
              />
            )}
          </div>

          <div className="space-y-6">
            {financial && (
              <StudentBillingCard
                financial={financial}
                monthLabel={monthLabel}
                scholarshipPercent={scholarship?.scholarshipPercent ?? 0}
                billingMode={scholarship?.billingMode ?? "MERCADO_PAGO"}
              />
            )}
            <ResendInviteCard userId={user.id} userName={user.name} userEmail={user.email} />
            <AccountStatusCard
              userId={user.id}
              userName={user.name}
              isActive={isActive}
              isStudent={isStudent}
              isSelf={isSelf}
              hasLiveSubscription={hasLiveSubscription}
              openPaymentsCount={financial?.openPayments.length ?? 0}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
