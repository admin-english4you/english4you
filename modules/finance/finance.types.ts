import { z } from 'zod';
import {
  CreatePackageSchema,
  PackageSchema,
  packagesTable,
} from './finance.schema';

export type Package = z.infer<typeof PackageSchema>;
export type NewPackage = typeof packagesTable.$inferInsert;
export type CreatePackageInput = z.infer<typeof CreatePackageSchema>;
