import { z } from 'zod';

/**
 * PaymentStatusEnum (Status do Pagamento)
 * Crucial para a integração com os Webhooks do Mercado Pago.
 * 
 * PENDING: O pagamento foi gerado, mas ainda não foi pago.
 * PAID: O webhook do Mercado Pago confirmou o pagamento. O acesso está liberado.
 * FAILED: O cartão foi recusado (ex: sem limite).
 * OVERDUE: A data de vencimento passou e o aluno não pagou (inadimplente). O sistema pode bloquear o acesso.
 */
export const PaymentStatusEnum = z.enum(['PENDING', 'PAID', 'FAILED', 'OVERDUE']);

// Esse que define a duração de um contrato e o valor das mensalidades, é associado a um aluno na hora de criar o cadastro dele. 
export const PackageSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  durationInMonths: z.number().int().positive(), 
  installmentValue: z.number().positive(),
});

export const PaymentSchema = z.object({
  id: z.uuid(),
  studentId: z.uuid(), 
  contractId: z.uuid(),
  amount: z.number().positive(), 
  installmentNumber: z.number().int().positive(), 
  totalInstallments: z.number().int().positive(), 
  dueDate: z.date(), 
  paidAt: z.date().nullable().optional(), 
  status: PaymentStatusEnum.default('PENDING'),
  mercadoPagoPaymentId: z.string().optional(), 
  mercadoPagoPreferenceId: z.string().optional(), 
  invoiceUrl: z.url().optional(), 
  createdAt: z.date(),
});
