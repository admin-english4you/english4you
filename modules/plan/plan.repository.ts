import { db } from '@/lib/db';
import { plansTable, planLessonsTable } from './plan.schema';
import { eq, asc } from 'drizzle-orm';
import { Plan } from './plan.types';

export const planRepository = {
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

  async getOrderedLessonIds(planId: string): Promise<{ lessonId: string; order: number }[]> {
    const rows = await db.query.planLessonsTable.findMany({
      where: eq(planLessonsTable.planId, planId),
      orderBy: [asc(planLessonsTable.order)],
    });
    return rows.map((row) => ({ lessonId: row.lessonId, order: row.order }));
  },
};
