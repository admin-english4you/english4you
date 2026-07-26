import { z } from 'zod';
import { PlanSchema, PlanLessonSchema, PlanStatusEnum } from './plan.schema';

export type PlanStatus = z.infer<typeof PlanStatusEnum>;
export type Plan = z.infer<typeof PlanSchema>;
export type PlanLesson = z.infer<typeof PlanLessonSchema>;
