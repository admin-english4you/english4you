"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  UpdateLessonSchema,
  UpdateLessonStatusSchema,
  ClearLessonMediaSchema,
  RehostContentImageSchema,
  DeleteContentImagesSchema,
} from "./lesson.schema";
import { lessonService } from "./lesson.service";
import { getCurrentUser } from "@/lib/auth-server";
import { createSafeAction, ActionResult } from "@/lib/safe-action";
import { AppError } from "@/lib/errors";
import { Lesson } from "./lesson.types";

const AUDIO_SIZE_LIMIT = 50 * 1024 * 1024; // 50MB
const VIDEO_SIZE_LIMIT = 200 * 1024 * 1024; // 200MB
const CONTENT_IMAGE_SIZE_LIMIT = 15 * 1024 * 1024; // 15MB
const ACCEPTED_AUDIO_EXTENSIONS = ["mp3", "wav", "m4a"];
const ACCEPTED_VIDEO_EXTENSIONS = ["mp4", "mov", "webm"];
const ACCEPTED_IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp"];

/**
 * Server Action para editar título/nível/conteúdo/transcrição de uma lição.
 */
export async function updateLessonAction(input: z.infer<typeof UpdateLessonSchema>) {
  const safeAction = createSafeAction(UpdateLessonSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    const { lessonId, ...rest } = data;
    const result = await lessonService.updateLesson(currentUser.role, lessonId, rest);
    revalidatePath("/admin/plans");
    return result;
  });

  return safeAction(input);
}

/**
 * Server Action para alternar o status de uma lição entre ACTIVE e DISABLED.
 */
export async function updateLessonStatusAction(input: z.infer<typeof UpdateLessonStatusSchema>) {
  const safeAction = createSafeAction(UpdateLessonStatusSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    const result = await lessonService.updateLessonStatus(currentUser.role, data.lessonId, data.status);
    revalidatePath("/admin/plans");
    return result;
  });

  return safeAction(input);
}

/**
 * Server Action para remover o áudio ou vídeo de uma lição.
 */
export async function clearLessonMediaAction(input: z.infer<typeof ClearLessonMediaSchema>) {
  const safeAction = createSafeAction(ClearLessonMediaSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    const result = await lessonService.clearMedia(currentUser.role, data.lessonId, data.kind);
    revalidatePath("/admin/plans");
    return result;
  });

  return safeAction(input);
}

/**
 * Server Action para fazer upload de áudio ou vídeo de uma lição.
 */
export async function updateLessonMediaAction(
  lessonId: string,
  kind: "audio" | "video",
  formData: FormData
): Promise<ActionResult<Lesson>> {
  try {
    const file = formData.get("media") as File | null;
    if (!file || file.size === 0) {
      throw new AppError("Nenhum arquivo enviado.");
    }

    const sizeLimit = kind === "audio" ? AUDIO_SIZE_LIMIT : VIDEO_SIZE_LIMIT;
    if (file.size > sizeLimit) {
      throw new AppError(`O arquivo deve ter no máximo ${sizeLimit / (1024 * 1024)}MB.`);
    }

    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    const acceptedExtensions = kind === "audio" ? ACCEPTED_AUDIO_EXTENSIONS : ACCEPTED_VIDEO_EXTENSIONS;
    if (!acceptedExtensions.includes(extension)) {
      throw new AppError(`Formato não suportado. Use: ${acceptedExtensions.join(", ")}.`);
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    const updatedLesson = await lessonService.updateMedia(currentUser.role, lessonId, file, kind);
    revalidatePath("/admin/plans");
    return { success: true, data: updatedLesson };
  } catch (err: unknown) {
    console.error("Action error:", err);
    if (err instanceof AppError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "Ocorreu um erro interno no servidor. Tente novamente." };
  }
}

/**
 * Server Action para subir uma imagem colada diretamente no conteúdo da lição
 * (arquivo de clipboard, ou base64 já convertido em Blob pelo client).
 */
export async function uploadLessonContentImageAction(
  lessonId: string,
  formData: FormData
): Promise<ActionResult<{ url: string }>> {
  try {
    const file = formData.get("image") as File | null;
    if (!file || file.size === 0) {
      throw new AppError("Nenhuma imagem enviada.");
    }

    if (file.size > CONTENT_IMAGE_SIZE_LIMIT) {
      throw new AppError(`A imagem deve ter no máximo ${CONTENT_IMAGE_SIZE_LIMIT / (1024 * 1024)}MB.`);
    }

    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (extension && !ACCEPTED_IMAGE_EXTENSIONS.includes(extension)) {
      throw new AppError(`Formato de imagem não suportado. Use: ${ACCEPTED_IMAGE_EXTENSIONS.join(", ")}.`);
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    const url = await lessonService.uploadContentImage(currentUser.role, lessonId, file);
    return { success: true, data: { url } };
  } catch (err: unknown) {
    console.error("Action error:", err);
    if (err instanceof AppError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "Ocorreu um erro interno no servidor. Tente novamente." };
  }
}

/**
 * Server Action para baixar (no servidor) uma imagem externa colada no editor
 * e reenviá-la para o nosso Storage, evitando depender de um host de terceiros.
 */
export async function rehostLessonContentImageAction(input: z.infer<typeof RehostContentImageSchema>) {
  const safeAction = createSafeAction(RehostContentImageSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    const url = await lessonService.rehostContentImage(currentUser.role, data.lessonId, data.sourceUrl);
    return { url };
  });

  return safeAction(input);
}

/**
 * Server Action para apagar do Storage as imagens de conteúdo que foram
 * removidas do editor (chamada ao salvar a lição).
 */
export async function deleteLessonContentImagesAction(input: z.infer<typeof DeleteContentImagesSchema>) {
  const safeAction = createSafeAction(DeleteContentImagesSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    await lessonService.deleteContentImages(currentUser.role, data.lessonId, data.imageUrls);
    return { deleted: data.imageUrls.length };
  });

  return safeAction(input);
}
