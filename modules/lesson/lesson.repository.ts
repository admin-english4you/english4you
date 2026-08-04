import { db } from '@/lib/db';
import { lessonsTable } from './lesson.schema';
import { inArray } from 'drizzle-orm';
import { Lesson } from './lesson.types';

export const lessonRepository = {
  async findByIds(ids: string[]): Promise<Lesson[]> {
    if (ids.length === 0) return [];
    return await db.query.lessonsTable.findMany({
      where: inArray(lessonsTable.id, ids),
    });
  },
};
