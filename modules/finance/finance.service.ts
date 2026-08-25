import { financeRepository } from './finance.repository';
import {
  CreateFinancialEntryInput,
  CreatePackageInput,
  FinancialEntry,
  Package,
} from './finance.types';
import { Role } from '@/modules/user/user.types';
import { AppError } from '@/lib/errors';
import { dayKeyToDate } from '@/lib/date';

function assertAdmin(actingRole: Role) {
  if (actingRole !== 'ADMIN') {
    throw new AppError('Apenas administradores podem gerenciar o financeiro.');
  }
}

/**
 * Converte os dayKeys do formulário nos `Date` que a tabela guarda.
 *
 * Meio-dia UTC (via `dayKeyToDate`) e não meia-noite: é o que impede um
 * lançamento de 1º de setembro aparecer em agosto — ou vice-versa — quando o
 * Postgres e o navegador do admin estão em fusos diferentes.
 */
function toEntryColumns(data: CreateFinancialEntryInput) {
  return {
    type: data.type,
    category: data.category,
    description: data.description,
    counterparty: data.counterparty,
    amountCents: data.amountCents,
    dueDate: dayKeyToDate(data.dueDate),
    paidAt: data.paidAt ? dayKeyToDate(data.paidAt) : null,
    method: data.method,
    notes: data.notes,
  };
}

/**
 * Service do módulo Financeiro: pacotes comerciais e o livro-caixa manual.
 *
 * É uma FOLHA da árvore de imports — `contractService` e `paymentService`
 * dependem dele (para ler pacotes), então ele não pode depender de nenhum dos
 * dois sob pena de ciclo. A visão consolidada que mistura livro-caixa com as
 * cobranças do Mercado Pago mora, por isso, em `finance.overview.service.ts`.
 */
export const financeService = {
  async getAllPackages(actingRole: Role): Promise<Package[]> {
    assertAdmin(actingRole);
    return await financeRepository.findAllPackages();
  },

  /**
   * Sem assert de papel, espelhando `planService.getActivePlansForSelect`:
   * é consumido pelo formulário de cadastro de aluno (já protegido por
   * /admin) e pelo contractService ao montar um contrato.
   */
  async getActivePackagesForSelect(): Promise<Package[]> {
    return await financeRepository.findActivePackages();
  },

  async getPackageById(id: string): Promise<Package | undefined> {
    return await financeRepository.findPackageById(id);
  },

  async getPackagesByIds(ids: string[]): Promise<Package[]> {
    return await financeRepository.findPackagesByIds(ids);
  },

  async createPackage(actingRole: Role, data: CreatePackageInput): Promise<Package> {
    assertAdmin(actingRole);
    return await financeRepository.createPackage({ ...data, isActive: true });
  },

  async updatePackage(
    actingRole: Role,
    packageId: string,
    data: CreatePackageInput
  ): Promise<Package> {
    assertAdmin(actingRole);

    const existing = await financeRepository.findPackageById(packageId);
    if (!existing) {
      throw new AppError('Pacote não encontrado.');
    }

    return await financeRepository.updatePackage(packageId, data);
  },

  /**
   * Arquiva em vez de deletar: o pacote pode estar referenciado por contratos
   * (FK `restrict`), e o histórico precisa continuar legível. Arquivado só
   * some do seletor de novo aluno.
   */
  async archivePackage(actingRole: Role, packageId: string): Promise<Package> {
    assertAdmin(actingRole);

    const existing = await financeRepository.findPackageById(packageId);
    if (!existing) {
      throw new AppError('Pacote não encontrado.');
    }

    return await financeRepository.updatePackage(packageId, { isActive: !existing.isActive });
  },

  // -------------------------------------------------------------------------
  // Livro-caixa (lançamentos manuais)
  // -------------------------------------------------------------------------

  async createEntry(
    actingRole: Role,
    createdById: string,
    data: CreateFinancialEntryInput
  ): Promise<FinancialEntry> {
    assertAdmin(actingRole);
    return await financeRepository.createEntry({ ...toEntryColumns(data), createdById });
  },

  async updateEntry(
    actingRole: Role,
    entryId: string,
    data: CreateFinancialEntryInput
  ): Promise<FinancialEntry> {
    assertAdmin(actingRole);

    const existing = await financeRepository.findEntryById(entryId);
    if (!existing) {
      throw new AppError('Lançamento não encontrado.');
    }

    return await financeRepository.updateEntry(entryId, toEntryColumns(data));
  },

  /**
   * Marca como liquidado (ou reabre, com `paidAt` nulo) sem passar pelo
   * formulário inteiro — é a ação do dia a dia: "essa conta eu já paguei".
   */
  async settleEntry(
    actingRole: Role,
    entryId: string,
    paidAtDayKey: string | null
  ): Promise<FinancialEntry> {
    assertAdmin(actingRole);

    const existing = await financeRepository.findEntryById(entryId);
    if (!existing) {
      throw new AppError('Lançamento não encontrado.');
    }

    return await financeRepository.updateEntry(entryId, {
      paidAt: paidAtDayKey ? dayKeyToDate(paidAtDayKey) : null,
    });
  },

  async deleteEntry(actingRole: Role, entryId: string): Promise<void> {
    assertAdmin(actingRole);

    const existing = await financeRepository.findEntryById(entryId);
    if (!existing) {
      throw new AppError('Lançamento não encontrado.');
    }

    await financeRepository.deleteEntry(entryId);
  },
};
