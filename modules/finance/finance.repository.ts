import { db } from '@/lib/db';
import { financialEntriesTable, packagesTable } from './finance.schema';
import { eq, asc, desc, inArray, and, gte, lt, isNull, isNotNull, sql } from 'drizzle-orm';
import {
  FinancialEntry,
  FinancialEntryType,
  NewFinancialEntry,
  NewPackage,
  Package,
} from './finance.types';

/** Uma linha por tipo — quem chama transforma em `{ INCOME, EXPENSE }`. */
interface TypeTotalRow {
  type: FinancialEntryType;
  totalCents: number;
  count: number;
}

interface OpenTypeTotalRow extends TypeTotalRow {
  overdueCents: number;
  overdueCount: number;
}

export const financeRepository = {
  async findAllPackages(): Promise<Package[]> {
    return await db.query.packagesTable.findMany({
      orderBy: [desc(packagesTable.isActive), asc(packagesTable.name)],
    });
  },

  async findActivePackages(): Promise<Package[]> {
    return await db.query.packagesTable.findMany({
      where: eq(packagesTable.isActive, true),
      orderBy: [asc(packagesTable.name)],
    });
  },

  async findPackageById(id: string): Promise<Package | undefined> {
    return await db.query.packagesTable.findFirst({
      where: eq(packagesTable.id, id),
    });
  },

  async findPackagesByIds(ids: string[]): Promise<Package[]> {
    if (ids.length === 0) return [];
    return await db.query.packagesTable.findMany({
      where: inArray(packagesTable.id, ids),
    });
  },

  async createPackage(data: NewPackage): Promise<Package> {
    const [pkg] = await db.insert(packagesTable).values(data).returning();
    return pkg;
  },

  async updatePackage(
    id: string,
    data: Partial<Pick<Package, 'name' | 'durationInMonths' | 'classesPerWeek' | 'installmentValueCents' | 'isActive'>>
  ): Promise<Package> {
    const [pkg] = await db
      .update(packagesTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(packagesTable.id, id))
      .returning();
    return pkg;
  },

  // -------------------------------------------------------------------------
  // Lançamentos manuais
  // -------------------------------------------------------------------------

  /**
   * Extrato mais recente primeiro. `limit` existe porque o livro-caixa cresce
   * sem teto e a visão geral só mostra o topo — o extrato completo é paginado
   * por período (ver `findEntriesInRange`).
   */
  async findRecentEntries(limit: number): Promise<FinancialEntry[]> {
    return await db.query.financialEntriesTable.findMany({
      orderBy: [desc(financialEntriesTable.dueDate), desc(financialEntriesTable.createdAt)],
      limit,
    });
  },

  async findEntriesInRange(from: Date, to: Date): Promise<FinancialEntry[]> {
    return await db.query.financialEntriesTable.findMany({
      where: and(gte(financialEntriesTable.dueDate, from), lt(financialEntriesTable.dueDate, to)),
      orderBy: [desc(financialEntriesTable.dueDate), desc(financialEntriesTable.createdAt)],
    });
  },

  /** Em aberto (`paidAt` nulo), independente de período — inclui vencidos. */
  async findOpenEntries(): Promise<FinancialEntry[]> {
    return await db.query.financialEntriesTable.findMany({
      where: isNull(financialEntriesTable.paidAt),
      orderBy: [asc(financialEntriesTable.dueDate)],
    });
  },

  async findEntryById(id: string): Promise<FinancialEntry | undefined> {
    return await db.query.financialEntriesTable.findFirst({
      where: eq(financialEntriesTable.id, id),
    });
  },

  /**
   * Soma o que foi LIQUIDADO na janela, agrupado por tipo.
   *
   * O filtro é por `paidAt`, não por `dueDate`: "receita do mês" é o dinheiro
   * que entrou no caixa neste mês, mesmo que a cobrança tenha vencido no mês
   * passado. Somar por vencimento contaria como receita algo ainda não recebido.
   */
  async sumSettledByTypeInRange(from: Date, to: Date): Promise<TypeTotalRow[]> {
    return await db
      .select({
        type: financialEntriesTable.type,
        totalCents: sql<number>`coalesce(sum(${financialEntriesTable.amountCents}), 0)::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(financialEntriesTable)
      .where(
        and(
          isNotNull(financialEntriesTable.paidAt),
          gte(financialEntriesTable.paidAt, from),
          lt(financialEntriesTable.paidAt, to)
        )
      )
      .groupBy(financialEntriesTable.type);
  },

  /**
   * Posição do que está em aberto, por tipo, já separando o que passou do
   * vencimento. Uma query só em vez de quatro: os totais "a receber",
   * "a pagar" e as duas fatias vencidas saem todos dos mesmos registros.
   */
  async sumOpenByType(now: Date): Promise<OpenTypeTotalRow[]> {
    return await db
      .select({
        type: financialEntriesTable.type,
        totalCents: sql<number>`coalesce(sum(${financialEntriesTable.amountCents}), 0)::int`,
        count: sql<number>`count(*)::int`,
        overdueCents: sql<number>`coalesce(sum(${financialEntriesTable.amountCents}) filter (where ${financialEntriesTable.dueDate} < ${now}), 0)::int`,
        overdueCount: sql<number>`(count(*) filter (where ${financialEntriesTable.dueDate} < ${now}))::int`,
      })
      .from(financialEntriesTable)
      .where(isNull(financialEntriesTable.paidAt))
      .groupBy(financialEntriesTable.type);
  },

  async createEntry(data: NewFinancialEntry): Promise<FinancialEntry> {
    const [entry] = await db.insert(financialEntriesTable).values(data).returning();
    return entry;
  },

  async updateEntry(
    id: string,
    data: Partial<
      Pick<
        FinancialEntry,
        | 'type'
        | 'category'
        | 'description'
        | 'counterparty'
        | 'amountCents'
        | 'dueDate'
        | 'paidAt'
        | 'method'
        | 'notes'
      >
    >
  ): Promise<FinancialEntry> {
    const [entry] = await db
      .update(financialEntriesTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(financialEntriesTable.id, id))
      .returning();
    return entry;
  },

  /**
   * Lançamento manual é deletado de verdade (ao contrário de pacote, que é
   * arquivado): nada referencia esta tabela, e um lançamento digitado errado
   * é ruído no caixa — não histórico que valha preservar.
   */
  async deleteEntry(id: string): Promise<void> {
    await db.delete(financialEntriesTable).where(eq(financialEntriesTable.id, id));
  },
};
