import { z } from 'zod';
import { ContractSchema, ContractTemplateSchema, ContractStatusEnum } from './contract.schema';

export type ContractStatus = z.infer<typeof ContractStatusEnum>;

export type ContractTemplate = z.infer<typeof ContractTemplateSchema>;
export type Contract = z.infer<typeof ContractSchema>;
