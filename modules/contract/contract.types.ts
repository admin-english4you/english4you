import { z } from 'zod';
import type { Package } from '@/modules/finance/finance.types';
import {
  ContractBillingModeEnum,
  ContractSchema,
  ContractStatusEnum,
  ContractTargetRoleEnum,
  ContractTemplateKindEnum,
  ContractTemplateSchema,
  ScholarshipTermsSchema,
  SignContractSchema,
  SigningIdentitySchema,
  contractsTable,
  contractTemplatesTable,
} from './contract.schema';

export type ContractStatus = z.infer<typeof ContractStatusEnum>;
export type ContractTargetRole = z.infer<typeof ContractTargetRoleEnum>;
export type ContractBillingMode = z.infer<typeof ContractBillingModeEnum>;
export type ContractTemplateKind = z.infer<typeof ContractTemplateKindEnum>;
export type ScholarshipTerms = z.infer<typeof ScholarshipTermsSchema>;

export type ContractTemplate = z.infer<typeof ContractTemplateSchema>;
export type Contract = z.infer<typeof ContractSchema>;

export type NewContract = typeof contractsTable.$inferInsert;
export type NewContractTemplate = typeof contractTemplatesTable.$inferInsert;

export type SigningIdentityInput = z.infer<typeof SigningIdentitySchema>;
export type SignContractInput = z.infer<typeof SignContractSchema>;

/**
 * Fatia mínima do contrato lida pelo portão de acesso a cada navegação do hub.
 * Deliberadamente sem `contentSnapshot` — ver
 * `contractRepository.findCurrentContractGateFieldsByUserId`.
 */
export type ContractGateFields = Pick<
  Contract,
  'id' | 'status' | 'packageId' | 'scholarshipPercent' | 'billingMode'
>;

/** Linha da lista de contratos do admin, já com os nomes resolvidos. */
export type ContractListItem = Contract & {
  userName: string;
  userEmail: string;
  packageName: string | null;
};

/** Contrato como o aluno vê em /student/documents. */
export type StudentContractView = Contract & {
  packageName: string | null;
  /** Snapshot quando assinado; prévia renderizada no servidor quando pendente. */
  html: string;
  /** `true` quando ainda faltam CPF/endereço para poder assinar. */
  needsIdentity: boolean;
};

/** Detalhe de contrato no painel do admin. */
export type ContractDetail = Contract & {
  userName: string;
  userEmail: string;
  templateName: string;
  pkg: Package | null;
  html: string;
};
