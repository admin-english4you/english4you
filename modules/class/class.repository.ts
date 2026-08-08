import { db } from '@/lib/db';
import { classGroupsTable, classRecordsTable } from './class.schema';
import { eq, desc, asc, and, ne, lt, gte } from 'drizzle-orm';
import { ClassGroup, ClassRecord, NewClassGroup, NewClassRecord } from './class.types';

export const classRepository = {
  async create(data: NewClassGroup): Promise<ClassGroup> {
    const [classGroup] = await db.insert(classGroupsTable).values(data).returning();
    return classGroup;
  },

  async findAll(): Promise<ClassGroup[]> {
    return await db.query.classGroupsTable.findMany({
      orderBy: [desc(classGroupsTable.createdAt)],
    });
  },

  async findById(id: string): Promise<ClassGroup | undefined> {
    return await db.query.classGroupsTable.findFirst({
      where: eq(classGroupsTable.id, id),
    });
  },

  async findOtherActive(excludeClassGroupId: string): Promise<ClassGroup[]> {
    return await db.query.classGroupsTable.findMany({
      where: and(eq(classGroupsTable.status, 'ACTIVE'), ne(classGroupsTable.id, excludeClassGroupId)),
      orderBy: [asc(classGroupsTable.name)],
    });
  },

  async updateBasic(id: string, data: Partial<Pick<ClassGroup, 'name' | 'level' | 'schedule'>>): Promise<ClassGroup> {
    const [classGroup] = await db
      .update(classGroupsTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(classGroupsTable.id, id))
      .returning();
    return classGroup;
  },

  async updateTeacher(id: string, teacherId: string): Promise<ClassGroup> {
    const [classGroup] = await db
      .update(classGroupsTable)
      .set({ teacherId, updatedAt: new Date() })
      .where(eq(classGroupsTable.id, id))
      .returning();
    return classGroup;
  },

  async updatePlan(id: string, planId: string): Promise<ClassGroup> {
    const [classGroup] = await db
      .update(classGroupsTable)
      .set({ planId, updatedAt: new Date() })
      .where(eq(classGroupsTable.id, id))
      .returning();
    return classGroup;
  },

  async updateStatus(id: string, status: ClassGroup['status']): Promise<ClassGroup> {
    const [classGroup] = await db
      .update(classGroupsTable)
      .set({ status, updatedAt: new Date() })
      .where(eq(classGroupsTable.id, id))
      .returning();
    return classGroup;
  },

  updateStatusQuery(id: string, status: ClassGroup['status']) {
    return db
      .update(classGroupsTable)
      .set({ status, updatedAt: new Date() })
      .where(eq(classGroupsTable.id, id));
  },

  async createRecords(records: NewClassRecord[]): Promise<ClassRecord[]> {
    if (records.length === 0) return [];
    return await db.insert(classRecordsTable).values(records).returning();
  },

  async deleteNonCompletedRecords(classGroupId: string): Promise<void> {
    await db
      .delete(classRecordsTable)
      .where(and(eq(classRecordsTable.classGroupId, classGroupId), eq(classRecordsTable.completed, false)));
  },

  async findRecordsByClassGroupId(classGroupId: string): Promise<ClassRecord[]> {
    return await db.query.classRecordsTable.findMany({
      where: eq(classRecordsTable.classGroupId, classGroupId),
      orderBy: [asc(classRecordsTable.date)],
    });
  },

  /** Aulas já ocorridas, da mais recente para a mais antiga. */
  async findRecordsByClassGroupIdBefore(
    classGroupId: string,
    before: Date,
    limit?: number
  ): Promise<ClassRecord[]> {
    return await db.query.classRecordsTable.findMany({
      where: and(eq(classRecordsTable.classGroupId, classGroupId), lt(classRecordsTable.date, before)),
      orderBy: [desc(classRecordsTable.date)],
      limit,
    });
  },

  /** Aulas a partir de um instante, da mais próxima para a mais distante. */
  async findRecordsByClassGroupIdFrom(
    classGroupId: string,
    from: Date,
    limit?: number
  ): Promise<ClassRecord[]> {
    return await db.query.classRecordsTable.findMany({
      where: and(eq(classRecordsTable.classGroupId, classGroupId), gte(classRecordsTable.date, from)),
      orderBy: [asc(classRecordsTable.date)],
      limit,
    });
  },

  async findNextRecordByClassGroupId(classGroupId: string, from: Date): Promise<ClassRecord | undefined> {
    return await db.query.classRecordsTable.findFirst({
      where: and(eq(classRecordsTable.classGroupId, classGroupId), gte(classRecordsTable.date, from)),
      orderBy: [asc(classRecordsTable.date)],
    });
  },

  async findRecordById(id: string): Promise<ClassRecord | undefined> {
    return await db.query.classRecordsTable.findFirst({
      where: eq(classRecordsTable.id, id),
    });
  },

  async updateRecordTeacher(recordId: string, teacherId: string): Promise<ClassRecord> {
    const [record] = await db
      .update(classRecordsTable)
      .set({ teacherId })
      .where(eq(classRecordsTable.id, recordId))
      .returning();
    return record;
  },
};
