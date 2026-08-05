"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  CreatePlanSchema,
  UpdatePlanSchema,
  AddLessonToPlanSchema,
  RemoveLessonFromPlanSchema,
  ReorderPlanLessonsSchema,
} from "./plan.schema";
import { planService } from "./plan.service";
import { getCurrentUser } from "@/lib/auth-server";
import { createSafeAction } from "@/lib/safe-action";
import { AppError } from "@/lib/errors";

/**
 * Server Action para criar um novo plano de ensino.
 */
export async function createPlanAction(input: z.infer<typeof CreatePlanSchema>) {
  const safeAction = createSafeAction(CreatePlanSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    const result = await planService.createPlan(currentUser.role, data);
    revalidatePath("/admin/plans");
    return result;
  });

  return safeAction(input);
}

/**
 * Server Action para editar nome/descrição/status de um plano de ensino.
 */
export async function updatePlanAction(input: z.infer<typeof UpdatePlanSchema>) {
  const safeAction = createSafeAction(UpdatePlanSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    const { planId, ...rest } = data;
    const result = await planService.updatePlan(currentUser.role, planId, rest);
    revalidatePath("/admin/plans");
    revalidatePath(`/admin/plans/${planId}`);
    return result;
  });

  return safeAction(input);
}

/**
 * Server Action para criar uma lição já dentro de um plano (anexada ao final da ordem).
 */
export async function addLessonToPlanAction(input: z.infer<typeof AddLessonToPlanSchema>) {
  const safeAction = createSafeAction(AddLessonToPlanSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    const { planId, ...lessonData } = data;
    const result = await planService.addLessonToPlan(currentUser.role, planId, lessonData);
    revalidatePath(`/admin/plans/${planId}`);
    return result;
  });

  return safeAction(input);
}

/**
 * Server Action para remover uma lição de um plano (não apaga a lição em si).
 */
export async function removeLessonFromPlanAction(input: z.infer<typeof RemoveLessonFromPlanSchema>) {
  const safeAction = createSafeAction(RemoveLessonFromPlanSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    await planService.removeLessonFromPlan(currentUser.role, data.planId, data.lessonId);
    revalidatePath(`/admin/plans/${data.planId}`);
    return { planId: data.planId, lessonId: data.lessonId };
  });

  return safeAction(input);
}

/**
 * Server Action para reordenar as lições de um plano.
 */
export async function reorderPlanLessonsAction(input: z.infer<typeof ReorderPlanLessonsSchema>) {
  const safeAction = createSafeAction(ReorderPlanLessonsSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    await planService.reorderPlanLessons(currentUser.role, data.planId, data.orderedLessonIds);
    revalidatePath(`/admin/plans/${data.planId}`);
    return { planId: data.planId };
  });

  return safeAction(input);
}
