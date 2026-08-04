import { db } from '@/lib/db';
import { usersTable } from './user.schema';
import { eq, desc, and, or, isNull, inArray, sql } from 'drizzle-orm';
import { CreateUserDTO, User } from './user.types';

export const userRepository = {
  async getAllUsers(): Promise<User[]> {
    return await db.query.usersTable.findMany({
      orderBy: [desc(usersTable.createdAt)],
    });
  },

  async findByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) return [];
    return await db.query.usersTable.findMany({
      where: inArray(usersTable.id, ids),
    });
  },

  async findTeachers(): Promise<User[]> {
    return await db.query.usersTable.findMany({
      where: eq(usersTable.role, 'TEACHER'),
      orderBy: [usersTable.name],
    });
  },

  async findAvailableStudents(classGroupId?: string): Promise<User[]> {
    const classFilter = classGroupId
      ? or(isNull(usersTable.classGroupId), eq(usersTable.classGroupId, classGroupId))
      : isNull(usersTable.classGroupId);

    return await db.query.usersTable.findMany({
      where: and(eq(usersTable.role, 'STUDENT'), classFilter),
      orderBy: [usersTable.name],
    });
  },

  async findStudentsByClassGroupId(classGroupId: string): Promise<User[]> {
    return await db.query.usersTable.findMany({
      where: and(eq(usersTable.role, 'STUDENT'), eq(usersTable.classGroupId, classGroupId)),
      orderBy: [usersTable.name],
    });
  },

  async countStudentsInClassGroup(classGroupId: string): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(usersTable)
      .where(and(eq(usersTable.role, 'STUDENT'), eq(usersTable.classGroupId, classGroupId)));
    return Number(row?.count ?? 0);
  },

  async countStudentsByClassGroupIds(classGroupIds: string[]): Promise<Record<string, number>> {
    if (classGroupIds.length === 0) return {};
    const rows = await db
      .select({ classGroupId: usersTable.classGroupId, count: sql<number>`count(*)` })
      .from(usersTable)
      .where(and(eq(usersTable.role, 'STUDENT'), inArray(usersTable.classGroupId, classGroupIds)))
      .groupBy(usersTable.classGroupId);

    return rows.reduce<Record<string, number>>((acc, row) => {
      if (row.classGroupId) acc[row.classGroupId] = Number(row.count);
      return acc;
    }, {});
  },

  async setClassGroupId(userId: string, classGroupId: string | null): Promise<User> {
    const [user] = await db
      .update(usersTable)
      .set({ classGroupId, updatedAt: new Date() })
      .where(eq(usersTable.id, userId))
      .returning();
    return user;
  },

  bulkClearClassGroupIdQuery(userIds: string[]) {
    return db
      .update(usersTable)
      .set({ classGroupId: null, updatedAt: new Date() })
      .where(inArray(usersTable.id, userIds));
  },

  async createUser(data: CreateUserDTO): Promise<User> {
    const [user] = await db.insert(usersTable).values(data).returning();
    return user;
  },

  async findByEmail(email: string): Promise<User | undefined> {
    return await db.query.usersTable.findFirst({
      where: eq(usersTable.email, email),
    });
  },

  async findById(id: string): Promise<User | undefined> {
    return await db.query.usersTable.findFirst({
      where: eq(usersTable.id, id),
    });
  },

  async updateUser(id: string, data: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User> {
    const [user] = await db.update(usersTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(usersTable.id, id))
      .returning();
    return user;
  },
};
