import { db } from '@/lib/db';
import { contractsTable, contractTemplatesTable } from './contract.schema';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import {
  Contract,
  ContractStatus,
  ContractTargetRole,
  ContractTemplate,
  NewContract,
  NewContractTemplate,
} from './contract.types';

export const contractRepository = {
  // ---------------------------------------------------------------------------
  // Modelos
  // ---------------------------------------------------------------------------

  async findTemplates(): Promise<ContractTemplate[]> {
    return await db.query.contractTemplatesTable.findMany({
      orderBy: [asc(contractTemplatesTable.targetRole), desc(contractTemplatesTable.version)],
    });
  },

  async findTemplateById(id: string): Promise<ContractTemplate | undefined> {
    return await db.query.contractTemplatesTable.findFirst({
      where: eq(contractTemplatesTable.id, id),
    });
  },

  async findActiveTemplateByRole(targetRole: ContractTargetRole): Promise<ContractTemplate | undefined> {
    return await db.query.contractTemplatesTable.findFirst({
      where: and(
        eq(contractTemplatesTable.targetRole, targetRole),
        eq(contractTemplatesTable.isActive, true)
      ),
    });
  },

  /** Próxima versão para o papel — rótulo humano ("v3"), monotônico por targetRole. */
  async getNextTemplateVersion(targetRole: ContractTargetRole): Promise<number> {
    const [row] = await db
      .select({ maxVersion: sql<number | null>`max(${contractTemplatesTable.version})` })
      .from(contractTemplatesTable)
      .where(eq(contractTemplatesTable.targetRole, targetRole));
    return (row?.maxVersion ?? 0) + 1;
  },

  async createTemplate(data: NewContractTemplate): Promise<ContractTemplate> {
    const [template] = await db.insert(contractTemplatesTable).values(data).returning();
    return template;
  },

  async updateTemplate(
    id: string,
    data: Partial<Pick<ContractTemplate, 'name' | 'content' | 'isActive'>>
  ): Promise<ContractTemplate> {
    const [template] = await db
      .update(contractTemplatesTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(contractTemplatesTable.id, id))
      .returning();
    return template;
  },

  /**
   * Variante que devolve a query sem executar, para compor em `db.batch([...])`.
   * `neon-http` não suporta transação interativa (ver classRepository.updateStatusQuery).
   */
  deactivateTemplatesByRoleQuery(targetRole: ContractTargetRole) {
    return db
      .update(contractTemplatesTable)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(contractTemplatesTable.targetRole, targetRole),
          eq(contractTemplatesTable.isActive, true)
        )
      );
  },

  activateTemplateQuery(id: string) {
    return db
      .update(contractTemplatesTable)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(contractTemplatesTable.id, id));
  },

  createTemplateQuery(data: NewContractTemplate) {
    return db.insert(contractTemplatesTable).values(data);
  },

  /** Quantos contratos já apontam para este modelo — decide edição in-place vs nova versão. */
  async countContractsByTemplateId(templateId: string): Promise<number> {
    const [row] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(contractsTable)
      .where(eq(contractsTable.templateId, templateId));
    return row?.total ?? 0;
  },

  // ---------------------------------------------------------------------------
  // Contratos
  // ---------------------------------------------------------------------------

  async findContracts(filters?: { status?: ContractStatus }): Promise<Contract[]> {
    return await db.query.contractsTable.findMany({
      where: filters?.status ? eq(contractsTable.status, filters.status) : undefined,
      orderBy: [desc(contractsTable.createdAt)],
    });
  },

  async findContractById(id: string): Promise<Contract | undefined> {
    return await db.query.contractsTable.findFirst({
      where: eq(contractsTable.id, id),
    });
  },

  async findContractsByUserId(userId: string): Promise<Contract[]> {
    return await db.query.contractsTable.findMany({
      where: eq(contractsTable.userId, userId),
      orderBy: [desc(contractsTable.createdAt)],
    });
  },

  async create(data: NewContract): Promise<Contract> {
    const [contract] = await db.insert(contractsTable).values(data).returning();
    return contract;
  },

  async markSigned(
    id: string,
    data: { contentSnapshot: string; signedName: string; signedByIp: string; signedAt: Date }
  ): Promise<Contract> {
    const [contract] = await db
      .update(contractsTable)
      .set({ ...data, status: 'ACTIVE', updatedAt: new Date() })
      .where(eq(contractsTable.id, id))
      .returning();
    return contract;
  },

  async updateStatus(id: string, status: ContractStatus): Promise<Contract> {
    const [contract] = await db
      .update(contractsTable)
      .set({ status, updatedAt: new Date() })
      .where(eq(contractsTable.id, id))
      .returning();
    return contract;
  },
};
