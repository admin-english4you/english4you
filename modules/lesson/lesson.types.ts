import { z } from 'zod';
import { LessonSchema, LessonStatusEnum } from './lesson.schema';

export type LessonStatus = z.infer<typeof LessonStatusEnum>;
export type Lesson = z.infer<typeof LessonSchema>;
