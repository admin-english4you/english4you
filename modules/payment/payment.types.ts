import { z } from 'zod';
import {
  AccessStateEnum,
  CancelReasonEnum,
  ChangeStudentPackageSchema,
  MercadoPagoWebhookSchema,
  PaymentSchema,
  PaymentStatusEnum,
  StudentSubscriptionSchema,
  SubscriptionStatusEnum,
  paymentsTable,
  studentSubscriptionsTable,
} from './payment.schema';
import type { Package } from '@/modules/finance/finance.types';
import type { StudentContractView } from '@/modules/contract/contract.types';

export type SubscriptionStatus = z.infer<typeof SubscriptionStatusEnum>;
export type PaymentStatus = z.infer<typeof PaymentStatusEnum>;
export type CancelReason = z.infer<typeof CancelReasonEnum>;
export type AccessState = z.infer<typeof AccessStateEnum>;

export type StudentSubscription = z.infer<typeof StudentSubscriptionSchema>;
export type NewStudentSubscription = typeof studentSubscriptionsTable.$inferInsert;
export type Payment = z.infer<typeof PaymentSchema>;
export type NewPayment = typeof paymentsTable.$inferInsert;

export type ChangeStudentPackageInput = z.infer<typeof ChangeStudentPackageSchema>;
export type MercadoPagoWebhookPayload = z.infer<typeof MercadoPagoWebhookSchema>;

/**
 * Resposta do portão de acesso consumido pelos layouts. `lastFailure` só vem
 * preenchido quando `state === 'BLOCKED'` — é o que a tela /fix-payment mostra.
 */
export interface AccessCheck {
  state: AccessState;
  subscription: StudentSubscription | null;
  lastFailure: Payment | null;
}

/** O que o wizard de /onboarding precisa saber para decidir em que passo abrir. */
export interface OnboardingState {
  contract: StudentContractView | null;
  pkg: Package | null;
  needsContract: boolean;
  needsPayment: boolean;
  /** Assinatura já criada mas ainda não autorizada — permite retomar o checkout. */
  pendingSubscription: StudentSubscription | null;
}

/** Visão da aba de pagamentos do aluno. */
export interface BillingView {
  subscription: StudentSubscription | null;
  pkg: Package | null;
  payments: Payment[];
}
