import type { PaymentStatus, SubscriptionStatus } from './payment.types';

/**
 * Tradução entre o vocabulário do Mercado Pago e o nosso, mais rótulos de UI.
 *
 * Puro de propósito: as telas do aluno (`/fix-payment`, aba de pagamentos) são
 * Client Components e importam os mapas de rótulo daqui, enquanto o service usa
 * os `map*` no server ao processar o webhook.
 */

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  PENDING: 'Aguardando autorização',
  AUTHORIZED: 'Ativa',
  PAYMENT_FAILED: 'Pagamento recusado',
  PAUSED: 'Pausada',
  CANCELLED: 'Cancelada',
  COMPLETED: 'Encerrada',
};

export const SUBSCRIPTION_STATUS_STYLES: Record<SubscriptionStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  AUTHORIZED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PAYMENT_FAILED: 'bg-rose-50 text-rose-700 border-rose-200',
  PAUSED: 'bg-rose-50 text-rose-700 border-rose-200',
  CANCELLED: 'bg-slate-100 text-slate-600 border-slate-200',
  COMPLETED: 'bg-slate-100 text-slate-600 border-slate-200',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'Processando',
  PAID: 'Pago',
  FAILED: 'Recusado',
  REFUNDED: 'Estornado',
  CANCELED: 'Cancelada',
};

export const PAYMENT_STATUS_STYLES: Record<PaymentStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  FAILED: 'bg-rose-50 text-rose-700 border-rose-200',
  REFUNDED: 'bg-slate-100 text-slate-600 border-slate-200',
  CANCELED: 'bg-slate-100 text-slate-500 border-slate-200',
};

/**
 * Motivos de recusa do Mercado Pago em português. É o texto que decide se o
 * aluno resolve sozinho ou abre um chamado — `cc_rejected_insufficient_amount`
 * cru não ajuda ninguém.
 *
 * A lista cobre os `status_detail` de cartão mais comuns; o que não estiver aqui
 * cai no texto genérico de `describeRejection`.
 */
export const REJECTION_REASON_LABELS: Record<string, string> = {
  cc_rejected_insufficient_amount: 'O cartão não tinha limite ou saldo suficiente para a cobrança.',
  cc_rejected_bad_filled_card_number: 'O número do cartão está incorreto.',
  cc_rejected_bad_filled_date: 'A data de validade do cartão está incorreta.',
  cc_rejected_bad_filled_security_code: 'O código de segurança (CVV) está incorreto.',
  cc_rejected_bad_filled_other: 'Algum dado do cartão está incorreto.',
  cc_rejected_call_for_authorize: 'O banco pediu que você autorize esta cobrança antes de continuar.',
  cc_rejected_card_disabled: 'O cartão está desativado. Ative-o com o banco ou use outro.',
  cc_rejected_card_error: 'O banco não conseguiu processar a cobrança neste cartão.',
  cc_rejected_duplicated_payment: 'Já existe uma cobrança igual a esta.',
  cc_rejected_high_risk: 'O pagamento foi recusado por segurança. Tente outro cartão.',
  cc_rejected_invalid_installments: 'O cartão não aceita cobrança recorrente nesta modalidade.',
  cc_rejected_max_attempts: 'Muitas tentativas seguidas. Use outro cartão.',
  cc_rejected_other_reason: 'O banco recusou a cobrança sem informar o motivo.',
  cc_rejected_blacklist: 'O pagamento foi recusado por segurança. Use outro cartão.',
};

/** Texto legível do motivo da recusa, com fallback para códigos desconhecidos. */
export function describeRejection(statusDetail: string | null): string {
  if (!statusDetail) return 'A cobrança foi recusada pelo banco.';
  return REJECTION_REASON_LABELS[statusDetail] ?? 'A cobrança foi recusada pelo banco.';
}

/**
 * `status` do preapproval do MP → nosso `subscription_status`.
 *
 * Só traduz o que o MP conhece: `PAYMENT_FAILED` e `COMPLETED` são estados
 * nossos, decididos ao processar as cobranças e o fim do contrato — por isso
 * `authorized` nunca "desbloqueia" sozinho aqui; quem faz isso é o service, ao
 * registrar uma cobrança aprovada.
 */
export function mapMpPreapprovalStatus(mpStatus: string | undefined): SubscriptionStatus | null {
  switch (mpStatus) {
    case 'pending':
      return 'PENDING';
    case 'authorized':
      return 'AUTHORIZED';
    case 'paused':
      return 'PAUSED';
    case 'cancelled':
      return 'CANCELLED';
    default:
      return null;
  }
}

/**
 * Status de uma cobrança recorrente. O MP expõe dois níveis: o da *invoice*
 * (`scheduled | processed | recycling`) e o do pagamento em si
 * (`approved | rejected | pending | refunded`). O do pagamento manda quando existe,
 * porque `processed` só diz que o MP tentou — não que deu certo.
 */
export function mapMpPaymentStatus(
  invoiceStatus: string | undefined,
  paymentStatus: string | undefined
): PaymentStatus {
  switch (paymentStatus) {
    case 'approved':
      return 'PAID';
    case 'rejected':
    case 'cancelled':
      return 'FAILED';
    case 'refunded':
    case 'charged_back':
      return 'REFUNDED';
  }

  // Sem pagamento associado ainda: `recycling` é o MP retentando após uma
  // recusa, o que já vale como falha para bloquear o aluno.
  if (invoiceStatus === 'recycling') return 'FAILED';
  return 'PENDING';
}

/** `10.5` (reais, como o MP manda) → `1050` centavos. */
export function amountToCents(amount: number | undefined): number {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return 0;
  return Math.round(amount * 100);
}

/** `1050` centavos → `10.5` reais, que é o formato do `transaction_amount` do MP. */
export function centsToAmount(cents: number): number {
  return Math.round(cents) / 100;
}

/** Últimos 4 dígitos a partir do `last_four_digits` do MP, tolerando ausência. */
export function normalizeCardLastFour(value: string | number | undefined | null): string | null {
  if (value === null || value === undefined) return null;
  const digits = String(value).replace(/\D/g, '');
  return digits.length >= 4 ? digits.slice(-4) : null;
}
