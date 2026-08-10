import { db } from '@/lib/db';
import { packagesTable } from './finance.schema';
import { eq, asc, desc, inArray } from 'drizzle-orm';
import { NewPackage, Package } from './finance.types';

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
};
