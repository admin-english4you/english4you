import { z } from 'zod';
import { LessonSchema, LessonStatusEnum, CreateLessonSchema, lessonsTable } from './lesson.schema';

export type LessonStatus = z.infer<typeof LessonStatusEnum>;
export type Lesson = z.infer<typeof LessonSchema>;
export type NewLesson = typeof lessonsTable.$inferInsert;
export type CreateLessonInput = z.infer<typeof CreateLessonSchema>;
