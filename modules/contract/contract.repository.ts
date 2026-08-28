import { db } from '@/lib/db';
import { contractsTable, contractTemplatesTable } from './contract.schema';
import { and, asc, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import {
  Contract,
  ContractGateFields,
  ContractStatus,
  ContractTargetRole,
  ContractTemplate,
  ContractTemplateKind,
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

  /**
   * O modelo ativo de um papel E tipo. O par é único no banco (ver o índice
   * parcial `contract_templates_active_target_uq`), então no máximo uma linha
   * pode voltar daqui.
   */
  async findActiveTemplate(
    targetRole: ContractTargetRole,
    kind: ContractTemplateKind
  ): Promise<ContractTemplate | undefined> {
    return await db.query.contractTemplatesTable.findFirst({
      where: and(
        eq(contractTemplatesTable.targetRole, targetRole),
        eq(contractTemplatesTable.kind, kind),
        eq(contractTemplatesTable.isActive, true)
      ),
    });
  },

  /** Atalho para o modelo padrão — o caso da esmagadora maioria das matrículas. */
  async findActiveTemplateByRole(targetRole: ContractTargetRole): Promise<ContractTemplate | undefined> {
    return await this.findActiveTemplate(targetRole, 'STANDARD');
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
  /**
   * Desativa o modelo ativo de um papel E TIPO.
   *
   * O `kind` no filtro é essencial: sem ele, ativar uma nova versão do contrato
   * padrão derrubaria junto o modelo de bolsista, e o próximo cadastro de
   * bolsista falharia por "nenhum modelo ativo". O índice único é por
   * (papel, tipo), então a desativação tem que ter exatamente o mesmo escopo.
   */
  deactivateTemplatesByRoleQuery(targetRole: ContractTargetRole, kind: ContractTemplateKind) {
    return db
      .update(contractTemplatesTable)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(contractTemplatesTable.targetRole, targetRole),
          eq(contractTemplatesTable.kind, kind),
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

  /** Contratos por status — card "Contratos pendentes" do dashboard. */
  async countByStatus(): Promise<{ status: ContractStatus; count: number }[]> {
    return await db
      .select({
        status: contractsTable.status,
        count: sql<number>`count(*)::int`,
      })
      .from(contractsTable)
      .groupBy(contractsTable.status);
  },

  /**
   * Contratos assinados mais recentemente — feed de atividades do dashboard.
   * Ordena por `signedAt` (e não `createdAt`): o que interessa é quando o
   * aluno assinou, não quando o admin emitiu.
   */
  async findRecentSignedContracts(limit: number): Promise<Contract[]> {
    return await db.query.contractsTable.findMany({
      where: isNotNull(contractsTable.signedAt),
      orderBy: [desc(contractsTable.signedAt)],
      limit,
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

  /**
   * O contrato vigente com as colunas que o PORTÃO DE ACESSO precisa — e só
   * elas.
   *
   * Existe separado de `findContractsByUserId` porque roda a cada navegação do
   * hub (ver `paymentService.getAccessState`): aquele faz `select *` de TODOS
   * os contratos do usuário, o que traria junto o `contentSnapshot` — o HTML
   * inteiro do contrato assinado — só para ler dois inteiros.
   */
  async findCurrentContractGateFieldsByUserId(userId: string): Promise<ContractGateFields | null> {
    const [row] = await db
      .select({
        id: contractsTable.id,
        status: contractsTable.status,
        packageId: contractsTable.packageId,
        scholarshipPercent: contractsTable.scholarshipPercent,
        billingMode: contractsTable.billingMode,
      })
      .from(contractsTable)
      .where(
        and(
          eq(contractsTable.userId, userId),
          inArray(contractsTable.status, ['ACTIVE', 'PENDING_SIGNATURE'])
        )
      )
      .orderBy(desc(contractsTable.createdAt))
      .limit(1);

    return row ?? null;
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
