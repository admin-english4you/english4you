import { z } from 'zod';
import { LessonSchema, LessonStatusEnum, lessonsTable } from './lesson.schema';

export type LessonStatus = z.infer<typeof LessonStatusEnum>;
export type Lesson = z.infer<typeof LessonSchema>;
export type NewLesson = typeof lessonsTable.$inferInsert;
