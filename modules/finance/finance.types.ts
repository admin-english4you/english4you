import { z } from 'zod';
import {
  CreateFinancialEntrySchema,
  FinancialEntryCategoryEnum,
  FinancialEntrySchema,
  FinancialEntryTypeEnum,
  CreatePackageSchema,
  PackageSchema,
  financialEntriesTable,
  packagesTable,
} from './finance.schema';

export type Package = z.infer<typeof PackageSchema>;
export type NewPackage = typeof packagesTable.$inferInsert;
export type CreatePackageInput = z.infer<typeof CreatePackageSchema>;

export type FinancialEntry = z.infer<typeof FinancialEntrySchema>;
export type NewFinancialEntry = typeof financialEntriesTable.$inferInsert;
export type CreateFinancialEntryInput = z.infer<typeof CreateFinancialEntrySchema>;
export type FinancialEntryType = z.infer<typeof FinancialEntryTypeEnum>;
export type FinancialEntryCategory = z.infer<typeof FinancialEntryCategoryEnum>;

/**
 * Situação de um lançamento. Derivada de `paidAt`/`dueDate`, nunca persistida
 * — ver o comentário da tabela em finance.schema.ts.
 */
export type EntryStatus = 'PAID' | 'PENDING' | 'OVERDUE';

/**
 * Uma linha do extrato de /admin/finance.
 *
 * Unifica as duas origens de dinheiro da escola: o que o admin lançou à mão
 * (`MANUAL`, editável) e o que o Mercado Pago cobrou sozinho (`MERCADO_PAGO`,
 * somente leitura — quem manda lá é o webhook). A UI usa `source` para decidir
 * se mostra os botões de editar/excluir.
 */
export interface LedgerEntry {
  id: string;
  source: 'MANUAL' | 'MERCADO_PAGO';
  type: FinancialEntryType;
  category: FinancialEntryCategory | null;
  description: string;
  counterparty: string | null;
  amountCents: number;
  status: EntryStatus;
  /** `paidAt` quando liquidado, senão `dueDate` — é por ela que o extrato ordena. */
  date: Date;
  dueDate: Date;
  paidAt: Date | null;
  method: string | null;
  notes: string | null;
}

/** Totais do mês corrente + posição do que está em aberto (a receber / a pagar). */
export interface FinanceSummary {
  /** Entradas liquidadas no mês (manuais + Mercado Pago). */
  monthIncomeCents: number;
  /** Saídas liquidadas no mês. */
  monthExpenseCents: number;
  /** `monthIncomeCents - monthExpenseCents`. Pode ser negativo. */
  monthNetCents: number;
  /** Quanto do mês veio do Mercado Pago — o resto foi lançado à mão. */
  monthMercadoPagoCents: number;
  receivableCents: number;
  receivableCount: number;
  receivableOverdueCents: number;
  receivableOverdueCount: number;
  payableCents: number;
  payableCount: number;
  payableOverdueCents: number;
  payableOverdueCount: number;
}

export interface FinanceOverview {
  summary: FinanceSummary;
  entries: LedgerEntry[];
  /** Rótulo do mês de referência dos cards, ex: "agosto de 2026". */
  monthLabel: string;
}
