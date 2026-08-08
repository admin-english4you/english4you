"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSafeAction } from "@/lib/safe-action";
import { getCurrentUser } from "@/lib/auth-server";
import { AppError } from "@/lib/errors";
import { progressService } from "./progress.service";
import { CompletePracticeDaySchema, PurchasePracticeDaySchema } from "./progress.schema";

/**
 * O cliente envia APENAS { lessonId, dayIndex } — nunca XP, nunca score, nunca
 * contagem de acertos. O service rederiva o aluno, a turma, as aulas dadas, o
 * ciclo e o status do dia, e calcula o XP a partir da constante do motor.
 */
export async function completePracticeDayAction(
  input: z.infer<typeof CompletePracticeDaySchema>
) {
  const safeAction = createSafeAction(CompletePracticeDaySchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new AppError("Usuário não autenticado.");

    const result = await progressService.completePracticeDay(
      currentUser.id,
      data.lessonId,
      data.dayIndex
    );

    revalidatePath("/student/practice");
    revalidatePath("/student");
    return result;
  });

  return safeAction(input);
}

export async function purchasePracticeDayAction(
  input: z.infer<typeof PurchasePracticeDaySchema>
) {
  const safeAction = createSafeAction(PurchasePracticeDaySchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new AppError("Usuário não autenticado.");

    const result = await progressService.purchasePracticeDay(
      currentUser.id,
      data.lessonId,
      data.dayIndex
    );

    revalidatePath("/student/practice");
    revalidatePath("/student");
    return result;
  });

  return safeAction(input);
}
