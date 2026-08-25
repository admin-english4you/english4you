/** Cards do topo de /admin. */
export interface DashboardStats {
  /** Entradas liquidadas no mês (livro-caixa + Mercado Pago). */
  monthIncomeCents: number;
  /** Entradas menos saídas no mês. Pode ser negativo. */
  monthNetCents: number;
  activeStudents: number;
  activeTeachers: number;
  activeClasses: number;
  pendingContracts: number;
}

/** De onde a atividade veio — define ícone, cor e link do item no feed. */
export type ActivityKind = 'ENROLLMENT' | 'CONTRACT' | 'PAYMENT' | 'CLASS';

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  text: string;
  /** Já formatado no servidor ("Há 15 min") — ver `formatRelativeTime`. */
  relative: string;
  href: string;
}

export interface AdminDashboard {
  stats: DashboardStats;
  activities: ActivityItem[];
  /** Mês de referência dos cards financeiros, ex: "agosto de 2026". */
  monthLabel: string;
}
