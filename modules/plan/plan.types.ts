import { z } from 'zod';
import { PlanSchema, PlanLessonSchema, PlanStatusEnum, CreatePlanSchema, plansTable } from './plan.schema';

export type PlanStatus = z.infer<typeof PlanStatusEnum>;
export type Plan = z.infer<typeof PlanSchema>;
export type PlanLesson = z.infer<typeof PlanLessonSchema>;
export type NewPlan = typeof plansTable.$inferInsert;
export type CreatePlanInput = z.infer<typeof CreatePlanSchema>;
