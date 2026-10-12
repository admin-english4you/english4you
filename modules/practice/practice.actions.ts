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
  CreateAiClipSchema,
  UpdateClipTranscriptSchema,
  DeleteClipSchema,
} from "./practice.schema";
import { practiceService } from "./practice.service";
import { getCurrentUser } from "@/lib/auth-server";
import { createSafeAction, ActionResult } from "@/lib/safe-action";
import { AppError } from "@/lib/errors";
import type { ListeningClip } from "./practice.types";

/** Limite da transcrição da OpenAI — acima disso o áudio não pode ser transcrito. */
const CLIP_SIZE_LIMIT = 25 * 1024 * 1024;
const CLIP_MIME_BY_EXTENSION: Record<string, string> = { mp3: "audio/mpeg", wav: "audio/wav", m4a: "audio/mp4" };

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

// ---------------------------------------------------------------------------
// Áudios curtos da prática de listening
// ---------------------------------------------------------------------------

/**
 * Gera UM áudio curto com IA (roteiro + voz + perguntas). O lote é o cliente
 * chamando esta action várias vezes, uma por áudio.
 */
export async function createAiClipAction(input: z.input<typeof CreateAiClipSchema>) {
  const safeAction = createSafeAction(CreateAiClipSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    const result = await practiceService.createAiClip(currentUser.role, data.lessonId, {
      targetSeconds: data.targetSeconds,
      questionCount: data.questionCount,
      voice: data.voice,
    });
    revalidatePath(`/admin/plans/${data.planId}`);
    return result;
  });

  return safeAction(input);
}

/**
 * Envia um áudio do admin. Campos do FormData: `audio` (arquivo),
 * `transcript` (opcional — vazio = IA transcreve) e `questionCount` (1-3).
 */
export async function createUploadedClipAction(
  lessonId: string,
  planId: string,
  formData: FormData
): Promise<ActionResult<ListeningClip>> {
  try {
    const file = formData.get("audio") as File | null;
    if (!file || file.size === 0) {
      throw new AppError("Nenhum arquivo enviado.");
    }
    if (file.size > CLIP_SIZE_LIMIT) {
      throw new AppError("O áudio deve ter no máximo 25MB.");
    }

    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    const contentType = CLIP_MIME_BY_EXTENSION[extension];
    if (!contentType) {
      throw new AppError(`Formato não suportado. Use: ${Object.keys(CLIP_MIME_BY_EXTENSION).join(", ")}.`);
    }

    const questionCount = Number(formData.get("questionCount") ?? 1);
    if (!Number.isInteger(questionCount) || questionCount < 1 || questionCount > 3) {
      throw new AppError("Escolha de 1 a 3 perguntas por áudio.");
    }
    const transcript = String(formData.get("transcript") ?? "").trim();

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    const clip = await practiceService.createUploadedClip(
      currentUser.role,
      lessonId,
      { buffer: Buffer.from(await file.arrayBuffer()), contentType, extension },
      { transcript: transcript || undefined, questionCount }
    );
    revalidatePath(`/admin/plans/${planId}`);
    return { success: true, data: clip };
  } catch (err: unknown) {
    console.error("Action error:", err);
    if (err instanceof AppError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "Ocorreu um erro interno no servidor. Tente novamente." };
  }
}

export async function updateClipTranscriptAction(input: z.infer<typeof UpdateClipTranscriptSchema>) {
  const safeAction = createSafeAction(UpdateClipTranscriptSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    const result = await practiceService.updateClipTranscript(currentUser.role, data.clipId, data.transcript);
    revalidatePath(`/admin/plans/${data.planId}`);
    return result;
  });

  return safeAction(input);
}

export async function deleteClipAction(input: z.infer<typeof DeleteClipSchema>) {
  const safeAction = createSafeAction(DeleteClipSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    await practiceService.deleteClip(currentUser.role, data.clipId);
    revalidatePath(`/admin/plans/${data.planId}`);
    return { clipId: data.clipId };
  });

  return safeAction(input);
}
