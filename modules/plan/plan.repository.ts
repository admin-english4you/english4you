import { db } from '@/lib/db';
import { plansTable, planLessonsTable } from './plan.schema';
import { eq, and, asc, desc, sql } from 'drizzle-orm';
import { Plan, NewPlan } from './plan.types';

export const planRepository = {
  async findAll(): Promise<Plan[]> {
    return await db.query.plansTable.findMany({
      orderBy: [desc(plansTable.createdAt)],
    });
  },

  async findActivePlans(): Promise<Plan[]> {
    return await db.query.plansTable.findMany({
      where: eq(plansTable.status, 'ACTIVE'),
      orderBy: [asc(plansTable.name)],
    });
  },

  async findById(id: string): Promise<Plan | undefined> {
    return await db.query.plansTable.findFirst({
      where: eq(plansTable.id, id),
    });
  },

  async create(data: NewPlan): Promise<Plan> {
    const [plan] = await db.insert(plansTable).values(data).returning();
    return plan;
  },

  async update(id: string, data: Partial<Pick<Plan, 'name' | 'description' | 'status'>>): Promise<Plan> {
    const [plan] = await db
      .update(plansTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(plansTable.id, id))
      .returning();
    return plan;
  },

  async getOrderedLessonIds(planId: string): Promise<{ lessonId: string; order: number }[]> {
    const rows = await db.query.planLessonsTable.findMany({
      where: eq(planLessonsTable.planId, planId),
      orderBy: [asc(planLessonsTable.order)],
    });
    return rows.map((row) => ({ lessonId: row.lessonId, order: row.order }));
  },

  async getNextOrder(planId: string): Promise<number> {
    const [row] = await db
      .select({ maxOrder: sql<number | null>`max(${planLessonsTable.order})` })
      .from(planLessonsTable)
      .where(eq(planLessonsTable.planId, planId));
    return (row?.maxOrder ?? 0) + 1;
  },

  async addLessonToPlan(planId: string, lessonId: string, order: number): Promise<void> {
    await db.insert(planLessonsTable).values({ planId, lessonId, order });
  },

  async removeLessonFromPlan(planId: string, lessonId: string): Promise<void> {
    await db
      .delete(planLessonsTable)
      .where(and(eq(planLessonsTable.planId, planId), eq(planLessonsTable.lessonId, lessonId)));
  },

  async updateLessonOrder(planId: string, lessonId: string, order: number): Promise<void> {
    await db
      .update(planLessonsTable)
      .set({ order })
      .where(and(eq(planLessonsTable.planId, planId), eq(planLessonsTable.lessonId, lessonId)));
  },
};
