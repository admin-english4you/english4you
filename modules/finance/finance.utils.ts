/**
 * Helpers de dinheiro do módulo financeiro.
 *
 * Todo valor monetário é persistido como INTEIRO EM CENTAVOS
 * (`installmentValueCents`), nunca como float ou `numeric`: `numeric` do
 * Drizzle chega em TS como `string` (o driver preserva precisão), o que
 * espalharia `parseFloat` por todo call-site; e float quebra soma de parcelas.
 * A conversão para reais acontece só na borda de apresentação (aqui) e, no
 * futuro, na borda da API do Mercado Pago.
 */

import { toDayKey } from '@/lib/date';
import type {
  EntryStatus,
  FinancialEntryCategory,
  FinancialEntryType,
} from './finance.types';

const BRL_FORMATTER = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

/** `15000` -> `"R$ 150,00"`. */
export function formatCents(cents: number): string {
  return BRL_FORMATTER.format(cents / 100);
}

/**
 * Mensalidade efetiva de um bolsista: o valor do pacote menos a bolsa.
 *
 * Centavos inteiros dos dois lados, com UM único arredondamento — nunca
 * derivar um total e refatiá-lo depois, senão as parcelas deixam de somar o
 * contrato.
 *
 * `Math.round` e não `Math.floor`: com `floor`, 33% de bolsa sobre R$ 150,00
 * daria R$ 100,49, um centavo a menos por mês que ninguém consegue explicar ao
 * aluno. Arredondar para o valor redondo é o comportamento esperado.
 */
export function applyScholarshipDiscount(
  installmentValueCents: number,
  scholarshipPercent: number
): number {
  if (scholarshipPercent <= 0) return installmentValueCents;
  if (scholarshipPercent >= 100) return 0;
  return Math.round((installmentValueCents * (100 - scholarshipPercent)) / 100);
}

/**
 * Menor valor que faz sentido mandar para uma cobrança recorrente.
 *
 * Existe para transformar "bolsa de 99% sobre um pacote barato" num erro nosso,
 * com texto útil, em vez de um 400 opaco do Mercado Pago que
 * `throwMercadoPagoError` traduziria como "a integração está mal configurada" —
 * culpando a coisa errada.
 */
export const MIN_CHARGEABLE_CENTS = 100;

/**
 * Lê o que o admin digitou no formulário de pacote e devolve centavos.
 * Aceita `"R$ 1.234,56"`, `"1234,56"`, `"1234.56"` e `"1234"`.
 * Devolve `null` quando não dá para interpretar — quem chama decide a mensagem.
 */
export function parseBRLToCents(input: string): number | null {
  const cleaned = input.replace(/[R$\s]/g, '').trim();
  if (!cleaned) return null;

  // "1.234,56" (pt-BR) -> "1234.56"; "1234.56" (já decimal) fica como está.
  const normalized = cleaned.includes(',')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned;

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;

  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) return null;

  // `Math.round` porque 19.99 * 100 = 1998.9999... em ponto flutuante.
  return Math.round(value * 100);
}

/** `15000` -> `"150,00"` — para preencher o input de edição sem o símbolo. */
export function centsToInputValue(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

// ---------------------------------------------------------------------------
// Lançamentos manuais (livro-caixa)
// ---------------------------------------------------------------------------

export const ENTRY_TYPE_LABELS: Record<FinancialEntryType, string> = {
  INCOME: 'Entrada',
  EXPENSE: 'Saída',
};

export const ENTRY_CATEGORY_LABELS: Record<FinancialEntryCategory, string> = {
  TUITION: 'Mensalidade',
  ENROLLMENT: 'Matrícula',
  MATERIAL: 'Material didático',
  OTHER_INCOME: 'Outra entrada',
  TEACHER_PAYOUT: 'Repasse a professor',
  RENT: 'Aluguel e contas',
  SOFTWARE: 'Ferramentas e software',
  MARKETING: 'Marketing',
  TAX: 'Impostos e taxas',
  OTHER_EXPENSE: 'Outra saída',
};

/** Quais categorias o formulário oferece para cada tipo. */
export const CATEGORIES_BY_TYPE: Record<FinancialEntryType, FinancialEntryCategory[]> = {
  INCOME: ['TUITION', 'ENROLLMENT', 'MATERIAL', 'OTHER_INCOME'],
  EXPENSE: ['TEACHER_PAYOUT', 'RENT', 'SOFTWARE', 'MARKETING', 'TAX', 'OTHER_EXPENSE'],
};

export const ENTRY_STATUS_LABELS: Record<EntryStatus, string> = {
  PAID: 'Liquidado',
  PENDING: 'Em aberto',
  OVERDUE: 'Vencido',
};

export const ENTRY_STATUS_STYLES: Record<EntryStatus, string> = {
  PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  OVERDUE: 'bg-rose-50 text-rose-700 border-rose-200',
};

/**
 * Situação de um lançamento a partir das duas únicas colunas que a definem.
 *
 * `todayKey` é injetado (e não lido de `new Date()` aqui dentro) para que
 * servidor e cliente cheguem ao MESMO resultado: sem isso, um lançamento que
 * vence hoje pode ser "vencido" no relógio do navegador do admin e "em aberto"
 * no servidor, e o React acusa erro de hidratação.
 */
export function deriveEntryStatus(
  entry: { dueDate: Date; paidAt: Date | null },
  todayKey: string
): EntryStatus {
  if (entry.paidAt) return 'PAID';
  return toDayKey(entry.dueDate) < todayKey ? 'OVERDUE' : 'PENDING';
}

/** `+R$ 150,00` / `-R$ 150,00` — o sinal vem do tipo, o valor é sempre positivo. */
export function formatSignedCents(type: FinancialEntryType, cents: number): string {
  return `${type === 'EXPENSE' ? '-' : '+'}${formatCents(cents)}`;
}
