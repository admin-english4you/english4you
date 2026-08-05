import { db } from '@/lib/db';
import { lessonsTable, LessonStatusEnum } from './lesson.schema';
import { eq, inArray } from 'drizzle-orm';
import { Lesson, NewLesson } from './lesson.types';
import { z } from 'zod';

export const lessonRepository = {
  async findByIds(ids: string[]): Promise<Lesson[]> {
    if (ids.length === 0) return [];
    return await db.query.lessonsTable.findMany({
      where: inArray(lessonsTable.id, ids),
    });
  },

  async findById(id: string): Promise<Lesson | undefined> {
    return await db.query.lessonsTable.findFirst({
      where: eq(lessonsTable.id, id),
    });
  },

  async create(data: NewLesson): Promise<Lesson> {
    const [lesson] = await db.insert(lessonsTable).values(data).returning();
    return lesson;
  },

  async update(id: string, data: Partial<Pick<Lesson, 'title' | 'level' | 'content' | 'transcript'>>): Promise<Lesson> {
    const [lesson] = await db
      .update(lessonsTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(lessonsTable.id, id))
      .returning();
    return lesson;
  },

  async updateMedia(id: string, data: { audioUrl?: string | null; videoUrl?: string | null }): Promise<Lesson> {
    const [lesson] = await db
      .update(lessonsTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(lessonsTable.id, id))
      .returning();
    return lesson;
  },

  async updateStatus(id: string, status: z.infer<typeof LessonStatusEnum>): Promise<Lesson> {
    const [lesson] = await db
      .update(lessonsTable)
      .set({ status, updatedAt: new Date() })
      .where(eq(lessonsTable.id, id))
      .returning();
    return lesson;
  },
};
