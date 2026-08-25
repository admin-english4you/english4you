import { financeRepository } from './finance.repository';
import { deriveEntryStatus } from './finance.utils';
import type {
  FinanceOverview,
  FinanceSummary,
  FinancialEntry,
  FinancialEntryType,
  LedgerEntry,
} from './finance.types';
import { paymentService } from '@/modules/payment/payment.service';
import { userService } from '@/modules/user/user.service';
import { AppError } from '@/lib/errors';
import { APP_TIMEZONE, todayKey, zonedWallClockToUtc } from '@/lib/date';
import type { Role } from '@/modules/user/user.types';
import type { Payment } from '@/modules/payment/payment.types';

/**
 * Visão consolidada de /admin/finance: o livro-caixa manual somado às cobranças
 * que o Mercado Pago gerou sozinho.
 *
 * ARQUIVO SEPARADO DE PROPÓSITO. `contractService` e `paymentService` importam
 * `finance.service.ts` (para ler pacotes), então aquele arquivo tem de continuar
 * folha — importar `paymentService` de dentro dele fecharia um ciclo. Aqui não
 * há ciclo porque ninguém importa este módulo de volta: ele é consumido só pela
 * página /admin/finance e pelo dashboard.
 *
 * Por isso também fala com `financeRepository` diretamente: é o repositório do
 * PRÓPRIO módulo (permitido), enquanto tudo que é de fora entra via Service.
 */

/** Quantas linhas o extrato da visão geral mostra, por origem. */
const LEDGER_LIMIT = 50;

function assertAdmin(actingRole: Role) {
  if (actingRole !== 'ADMIN') {
    throw new AppError('Apenas administradores podem ver o financeiro.');
  }
}

/**
 * Primeiro instante do mês corrente e do mês seguinte, no fuso da escola.
 *
 * Calculado a partir do relógio de São Paulo (e não de `new Date()` cru): num
 * deploy em UTC, "1º de setembro 00:00 UTC" ainda é 31 de agosto no Brasil, e
 * a receita do último dia do mês cairia no mês errado.
 */
function currentMonthRange(): { from: Date; to: Date; label: string } {
  const [year, month] = todayKey().split('-').map(Number);
  const monthStartKey = `${year}-${String(month).padStart(2, '0')}-01`;

  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextStartKey = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

  const from = zonedWallClockToUtc(monthStartKey, '00:00');
  const to = zonedWallClockToUtc(nextStartKey, '00:00');

  const label = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: APP_TIMEZONE,
  }).format(from);

  return { from, to, label };
}

function toLedgerEntry(entry: FinancialEntry, today: string): LedgerEntry {
  return {
    id: entry.id,
    source: 'MANUAL',
    type: entry.type,
    category: entry.category,
    description: entry.description,
    counterparty: entry.counterparty,
    amountCents: entry.amountCents,
    status: deriveEntryStatus(entry, today),
    date: entry.paidAt ?? entry.dueDate,
    dueDate: entry.dueDate,
    paidAt: entry.paidAt,
    method: entry.method,
    notes: entry.notes,
  };
}

/**
 * Uma cobrança do Mercado Pago vista como linha do extrato.
 *
 * `FAILED`/`REFUNDED` viram `OVERDUE`/`PENDING` em vez de ganharem status
 * próprios: no extrato o que importa é "esse dinheiro entrou ou não", e um
 * quarto status só para o MP deixaria a legenda da tabela incoerente. O detalhe
 * da recusa continua visível na aba de pagamentos do aluno.
 */
function paymentToLedgerEntry(payment: Payment, studentName: string | null): LedgerEntry {
  const status = payment.status === 'PAID' ? 'PAID' : payment.status === 'FAILED' ? 'OVERDUE' : 'PENDING';

  return {
    id: payment.id,
    source: 'MERCADO_PAGO',
    type: 'INCOME',
    category: 'TUITION',
    description: payment.status === 'REFUNDED' ? 'Mensalidade (estornada)' : 'Mensalidade',
    counterparty: studentName,
    amountCents: payment.amountCents,
    status,
    date: payment.paidAt ?? payment.dueDate,
    dueDate: payment.dueDate,
    paidAt: payment.paidAt,
    method: 'Mercado Pago',
    notes: null,
  };
}

function pickTotal<T extends { type: FinancialEntryType }>(
  rows: T[],
  type: FinancialEntryType
): T | undefined {
  return rows.find((row) => row.type === type);
}

export const financeOverviewService = {
  async getOverview(actingRole: Role): Promise<FinanceOverview> {
    assertAdmin(actingRole);

    const { from, to, label } = currentMonthRange();
    const today = todayKey();
    const now = new Date();

    const [settledThisMonth, openByType, recentEntries, recentPayments, mpMonthCents] =
      await Promise.all([
        financeRepository.sumSettledByTypeInRange(from, to),
        financeRepository.sumOpenByType(now),
        financeRepository.findRecentEntries(LEDGER_LIMIT),
        paymentService.getRecentPayments(actingRole, LEDGER_LIMIT),
        paymentService.sumPaidInRange(actingRole, from, to),
      ]);

    // Nomes dos alunos das cobranças do MP: a tabela `payments` guarda só o
    // `userId` (desnormalizado de propósito), então a resolução é aqui.
    const studentIds = Array.from(new Set(recentPayments.map((p) => p.userId)));
    const students = await userService.getUsersByIds(studentIds);
    const nameById = new Map(students.map((s) => [s.id, s.name]));

    const manualIncome = pickTotal(settledThisMonth, 'INCOME')?.totalCents ?? 0;
    const monthExpenseCents = pickTotal(settledThisMonth, 'EXPENSE')?.totalCents ?? 0;
    const monthIncomeCents = manualIncome + mpMonthCents;

    const openIncome = pickTotal(openByType, 'INCOME');
    const openExpense = pickTotal(openByType, 'EXPENSE');

    const summary: FinanceSummary = {
      monthIncomeCents,
      monthExpenseCents,
      monthNetCents: monthIncomeCents - monthExpenseCents,
      monthMercadoPagoCents: mpMonthCents,
      receivableCents: openIncome?.totalCents ?? 0,
      receivableCount: openIncome?.count ?? 0,
      receivableOverdueCents: openIncome?.overdueCents ?? 0,
      receivableOverdueCount: openIncome?.overdueCount ?? 0,
      payableCents: openExpense?.totalCents ?? 0,
      payableCount: openExpense?.count ?? 0,
      payableOverdueCents: openExpense?.overdueCents ?? 0,
      payableOverdueCount: openExpense?.overdueCount ?? 0,
    };

    const entries = [
      ...recentEntries.map((entry) => toLedgerEntry(entry, today)),
      ...recentPayments.map((payment) =>
        paymentToLedgerEntry(payment, nameById.get(payment.userId) ?? null)
      ),
    ]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, LEDGER_LIMIT);

    return { summary, entries, monthLabel: label };
  },

  /**
   * Só os números de receita/despesa do mês — o dashboard não precisa carregar
   * o extrato inteiro para mostrar um card.
   */
  async getMonthTotals(actingRole: Role): Promise<{
    incomeCents: number;
    expenseCents: number;
    netCents: number;
    monthLabel: string;
  }> {
    assertAdmin(actingRole);

    const { from, to, label } = currentMonthRange();

    const [settled, mpMonthCents] = await Promise.all([
      financeRepository.sumSettledByTypeInRange(from, to),
      paymentService.sumPaidInRange(actingRole, from, to),
    ]);

    const incomeCents = (pickTotal(settled, 'INCOME')?.totalCents ?? 0) + mpMonthCents;
    const expenseCents = pickTotal(settled, 'EXPENSE')?.totalCents ?? 0;

    return {
      incomeCents,
      expenseCents,
      netCents: incomeCents - expenseCents,
      monthLabel: label,
    };
  },
};
