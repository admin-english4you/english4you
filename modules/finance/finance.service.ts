import { financeRepository } from './finance.repository';
import { CreatePackageInput, Package } from './finance.types';
import { Role } from '@/modules/user/user.types';
import { AppError } from '@/lib/errors';

function assertAdmin(actingRole: Role) {
  if (actingRole !== 'ADMIN') {
    throw new AppError('Apenas administradores podem gerenciar pacotes.');
  }
}

/**
 * Service do módulo Financeiro. Hoje cobre apenas Pacotes — a entidade
 * comercial que define duração, aulas por semana e valor da mensalidade, e da
 * qual o contrato do aluno é derivado. Parcelas/Mercado Pago são a próxima etapa.
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
};
