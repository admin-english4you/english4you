"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  GenerateLearningItemsSchema,
  GenerateMoreContentSchema,
  ApproveLearningItemSchema,
  DeleteLearningItemSchema,
  UpdateLearningItemSchema,
  ApproveQuizQuestionSchema,
  DeleteQuizQuestionSchema,
  UpdateQuizQuestionSchema,
} from "./practice.schema";
import { practiceService } from "./practice.service";
import { getCurrentUser } from "@/lib/auth-server";
import { createSafeAction } from "@/lib/safe-action";
import { AppError } from "@/lib/errors";

/**
 * Server Action para gerar (ou regerar) os itens de prática de uma lição via IA.
 */
export async function generateLearningItemsAction(input: z.infer<typeof GenerateLearningItemsSchema>) {
  const safeAction = createSafeAction(GenerateLearningItemsSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    const result = await practiceService.generateLearningItems(currentUser.role, data.lessonId);
    revalidatePath(`/admin/plans/${data.planId}`);
    return result;
  });

  return safeAction(input);
}

/**
 * Server Action para gerar conteúdo ADICIONAL numa lição que já tem itens,
 * sem duplicar o que existe. O admin escolhe a quantidade por tipo.
 */
export async function generateMoreContentAction(input: z.infer<typeof GenerateMoreContentSchema>) {
  const safeAction = createSafeAction(GenerateMoreContentSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    const report = await practiceService.generateMoreContent(currentUser.role, {
      lessonId: data.lessonId,
      vocabCount: data.vocabCount,
      structureCount: data.structureCount,
      quizCount: data.quizCount,
      allowInvented: data.allowInvented,
    });
    revalidatePath(`/admin/plans/${data.planId}`);
    return report;
  });

  return safeAction(input);
}

/**
 * Server Action para aprovar um item de prática gerado pela IA.
 */
export async function approveLearningItemAction(input: z.infer<typeof ApproveLearningItemSchema>) {
  const safeAction = createSafeAction(ApproveLearningItemSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    const result = await practiceService.approveItem(currentUser.role, data.itemId);
    revalidatePath(`/admin/plans/${data.planId}`);
    return result;
  });

  return safeAction(input);
}

/**
 * Server Action para remover um item de prática (rejeitar sugestão da IA).
 */
export async function deleteLearningItemAction(input: z.infer<typeof DeleteLearningItemSchema>) {
  const safeAction = createSafeAction(DeleteLearningItemSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    await practiceService.deleteItem(currentUser.role, data.itemId);
    revalidatePath(`/admin/plans/${data.planId}`);
    return { itemId: data.itemId };
  });

  return safeAction(input);
}

/**
 * Server Action para o admin corrigir manualmente um item de prática.
 */
export async function updateLearningItemAction(input: z.infer<typeof UpdateLearningItemSchema>) {
  const safeAction = createSafeAction(UpdateLearningItemSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    const result = await practiceService.updateItem(currentUser.role, data.itemId, {
      lemma: data.lemma,
      metadata: data.metadata,
    });
    revalidatePath(`/admin/plans/${data.planId}`);
    return result;
  });

  return safeAction(input);
}

/**
 * Server Action para o admin corrigir manualmente uma pergunta de compreensão.
 */
export async function updateQuizQuestionAction(input: z.infer<typeof UpdateQuizQuestionSchema>) {
  const safeAction = createSafeAction(UpdateQuizQuestionSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    const result = await practiceService.updateQuizQuestion(currentUser.role, data.questionId, {
      question: data.question,
      options: data.options,
      correctIndex: data.correctIndex,
      explanation: data.explanation,
    });
    revalidatePath(`/admin/plans/${data.planId}`);
    return result;
  });

  return safeAction(input);
}

/**
 * Server Action para aprovar uma pergunta de compreensão gerada pela IA.
 */
export async function approveQuizQuestionAction(input: z.infer<typeof ApproveQuizQuestionSchema>) {
  const safeAction = createSafeAction(ApproveQuizQuestionSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    const result = await practiceService.approveQuizQuestion(currentUser.role, data.questionId);
    revalidatePath(`/admin/plans/${data.planId}`);
    return result;
  });

  return safeAction(input);
}

/**
 * Server Action para remover uma pergunta de compreensão (rejeitar sugestão da IA).
 */
export async function deleteQuizQuestionAction(input: z.infer<typeof DeleteQuizQuestionSchema>) {
  const safeAction = createSafeAction(DeleteQuizQuestionSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    await practiceService.deleteQuizQuestion(currentUser.role, data.questionId);
    revalidatePath(`/admin/plans/${data.planId}`);
    return { questionId: data.questionId };
  });

  return safeAction(input);
}
