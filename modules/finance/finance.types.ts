import { z } from 'zod';
import { PackageSchema, PaymentSchema, PaymentStatusEnum } from './finance.schema';

export type PaymentStatus = z.infer<typeof PaymentStatusEnum>;

export type Package = z.infer<typeof PackageSchema>;
export type Payment = z.infer<typeof PaymentSchema>;

export type CreatePaymentDTO = Omit<Payment, 'id' | 'createdAt' | 'paidAt' | 'mercadoPagoPaymentId'>;
