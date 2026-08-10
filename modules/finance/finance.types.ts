import { z } from 'zod';
import {
  CreatePackageSchema,
  PackageSchema,
  PaymentSchema,
  PaymentStatusEnum,
  packagesTable,
} from './finance.schema';

export type PaymentStatus = z.infer<typeof PaymentStatusEnum>;

export type Package = z.infer<typeof PackageSchema>;
export type NewPackage = typeof packagesTable.$inferInsert;
export type CreatePackageInput = z.infer<typeof CreatePackageSchema>;

export type Payment = z.infer<typeof PaymentSchema>;
export type CreatePaymentDTO = Omit<Payment, 'id' | 'createdAt' | 'paidAt' | 'mercadoPagoPaymentId'>;
