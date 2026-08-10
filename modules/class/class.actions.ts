"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  CreateClassGroupSchema,
  UpdateClassBasicSchema,
  AssignTeacherSchema,
  AssignPlanSchema,
  AddStudentSchema,
  RemoveStudentSchema,
  TransferStudentSchema,
  DeactivateClassSchema,
  ReactivateClassSchema,
  ArchiveClassSchema,
  AssignSubstituteTeacherSchema,
  StartCallSchema,
  StartCallRecordingSchema,
  EndCallSchema,
  SaveBoardContentSchema,
  ActivateLessonSchema,
  MarkAttendanceSchema,
  GetTeacherStudentDetailSchema,
  GetStudentCallAccessSchema,
  GetBoardAuthTokenSchema,
  RehostBoardContentImageSchema,
  DeleteBoardContentImagesSchema,
} from "./class.schema";
import { classService } from "./class.service";
import { getCurrentUser } from "@/lib/auth-server";
import { createSafeAction, ActionResult } from "@/lib/safe-action";
import { AppError } from "@/lib/errors";

const CONTENT_IMAGE_SIZE_LIMIT = 15 * 1024 * 1024; // 15MB
const ACCEPTED_IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp"];

/**
 * Server Action para criar uma nova turma (nome, nível e horário).
 */
export async function createClassAction(input: z.infer<typeof CreateClassGroupSchema>) {
  const safeAction = createSafeAction(CreateClassGroupSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    const result = await classService.createClass(currentUser.role, data);
    revalidatePath("/admin/classes");
    return result;
  });

  return safeAction(input);
}

/**
 * Server Action para editar nome, nível e/ou horário de uma turma.
 */
export async function updateClassBasicInfoAction(input: z.infer<typeof UpdateClassBasicSchema>) {
  const safeAction = createSafeAction(UpdateClassBasicSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    const { classGroupId, ...rest } = data;
    const result = await classService.updateBasicInfo(currentUser.role, classGroupId, rest);
    revalidatePath("/admin/classes");
    revalidatePath(`/admin/classes/${classGroupId}`);
    return result;
  });

  return safeAction(input);
}

/**
 * Server Action para atribuir/trocar o professor titular de uma turma.
 */
export async function assignTeacherAction(input: z.infer<typeof AssignTeacherSchema>) {
  const safeAction = createSafeAction(AssignTeacherSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    const result = await classService.assignTeacher(currentUser.role, data.classGroupId, data.teacherId);
    revalidatePath(`/admin/classes/${data.classGroupId}`);
    return result;
  });

  return safeAction(input);
}

/**
 * Server Action para atribuir/trocar o plano de ensino de uma turma
 * (regera as aulas não concluídas a partir de hoje).
 */
export async function assignPlanAction(input: z.infer<typeof AssignPlanSchema>) {
  const safeAction = createSafeAction(AssignPlanSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    const result = await classService.assignPlan(currentUser.role, data.classGroupId, data.planId);
    revalidatePath(`/admin/classes/${data.classGroupId}`);
    return result;
  });

  return safeAction(input);
}

/**
 * Server Action para adicionar um aluno à turma.
 */
export async function addStudentAction(input: z.infer<typeof AddStudentSchema>) {
  const safeAction = createSafeAction(AddStudentSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    await classService.addStudent(currentUser.role, data.classGroupId, data.studentId);
    revalidatePath(`/admin/classes/${data.classGroupId}`);
    return { classGroupId: data.classGroupId, studentId: data.studentId };
  });

  return safeAction(input);
}

/**
 * Server Action para remover um aluno da turma.
 */
export async function removeStudentAction(input: z.infer<typeof RemoveStudentSchema>) {
  const safeAction = createSafeAction(RemoveStudentSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    await classService.removeStudent(currentUser.role, data.classGroupId, data.studentId);
    revalidatePath(`/admin/classes/${data.classGroupId}`);
    return { classGroupId: data.classGroupId, studentId: data.studentId };
  });

  return safeAction(input);
}

/**
 * Server Action para transferir um aluno de uma turma para outra.
 */
export async function transferStudentAction(input: z.infer<typeof TransferStudentSchema>) {
  const safeAction = createSafeAction(TransferStudentSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    await classService.transferStudent(currentUser.role, data.studentId, data.targetClassGroupId);
    revalidatePath(`/admin/classes/${data.sourceClassGroupId}`);
    revalidatePath(`/admin/classes/${data.targetClassGroupId}`);
    return { studentId: data.studentId, targetClassGroupId: data.targetClassGroupId };
  });

  return safeAction(input);
}

/**
 * Server Action para desativar uma turma (libera todos os alunos dela).
 */
export async function deactivateClassAction(input: z.infer<typeof DeactivateClassSchema>) {
  const safeAction = createSafeAction(DeactivateClassSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    await classService.deactivateClass(currentUser.role, data.classGroupId);
    revalidatePath("/admin/classes");
    revalidatePath(`/admin/classes/${data.classGroupId}`);
    return { classGroupId: data.classGroupId };
  });

  return safeAction(input);
}

/**
 * Server Action para reativar uma turma desativada (volta para ACTIVE).
 */
export async function reactivateClassAction(input: z.infer<typeof ReactivateClassSchema>) {
  const safeAction = createSafeAction(ReactivateClassSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    const result = await classService.reactivateClass(currentUser.role, data.classGroupId);
    revalidatePath("/admin/classes");
    revalidatePath(`/admin/classes/${data.classGroupId}`);
    return result;
  });

  return safeAction(input);
}

/**
 * Server Action para arquivar uma turma permanentemente (não pode ser desfeito).
 */
export async function archiveClassAction(input: z.infer<typeof ArchiveClassSchema>) {
  const safeAction = createSafeAction(ArchiveClassSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    await classService.archiveClass(currentUser.role, data.classGroupId);
    revalidatePath("/admin/classes");
    revalidatePath(`/admin/classes/${data.classGroupId}`);
    return { classGroupId: data.classGroupId };
  });

  return safeAction(input);
}

/**
 * Server Action para definir um professor substituto em uma aula (ClassRecord) específica.
 */
export async function assignSubstituteTeacherAction(input: z.infer<typeof AssignSubstituteTeacherSchema>) {
  const safeAction = createSafeAction(AssignSubstituteTeacherSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    const result = await classService.assignSubstituteTeacher(currentUser.role, data.classRecordId, data.teacherId);
    revalidatePath(`/admin/classes/${result.classGroupId}`);
    return result;
  });

  return safeAction(input);
}

// ---------------------------------------------------------------------------
// Sala de aula do professor
// ---------------------------------------------------------------------------

/** Inicia a chamada: liga a gravação e carimba callStartedAt. Idempotente. */
export async function startCallAction(input: z.infer<typeof StartCallSchema>) {
  const safeAction = createSafeAction(StartCallSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    const result = await classService.startCall(currentUser.id, data.recordId);
    revalidatePath(`/teacher/live/${data.recordId}`);
    return result;
  });

  return safeAction(input);
}

/** Liga a gravação — chamado pelo client assim que o professor entra de fato na call. */
export async function startCallRecordingAction(input: z.infer<typeof StartCallRecordingSchema>) {
  const safeAction = createSafeAction(StartCallRecordingSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    await classService.startCallRecordingForRecord(currentUser.id, data.recordId);
    return { recordId: data.recordId };
  });

  return safeAction(input);
}

/** Encerra a aula: desliga gravação/chamada no Stream e marca concluída. */
export async function endCallAction(input: z.infer<typeof EndCallSchema>) {
  const safeAction = createSafeAction(EndCallSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    const result = await classService.endCall(currentUser.id, data.recordId);
    revalidatePath(`/teacher/live/${data.recordId}`);
    return result;
  });

  return safeAction(input);
}

/** Salva as anotações desta ocorrência da aula (class_records.boardContent). */
export async function saveBoardContentAction(input: z.infer<typeof SaveBoardContentSchema>) {
  const safeAction = createSafeAction(SaveBoardContentSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    const result = await classService.updateRecordBoard(currentUser.id, data.recordId, data.boardContent);
    return result;
  });

  return safeAction(input);
}

/**
 * Server Action para subir uma imagem colada/arrastada diretamente no board
 * da aula ao vivo (arquivo de clipboard, ou blob já convertido pelo client).
 * Mesmo padrão de `uploadLessonContentImageAction`.
 */
export async function uploadBoardContentImageAction(
  recordId: string,
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

    const url = await classService.uploadBoardContentImage(currentUser.id, recordId, file);
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
 * Server Action para baixar (no servidor) uma imagem externa colada no board
 * e reenviá-la para o nosso Storage, evitando depender de um host de terceiros.
 */
export async function rehostBoardContentImageAction(input: z.infer<typeof RehostBoardContentImageSchema>) {
  const safeAction = createSafeAction(RehostBoardContentImageSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    const url = await classService.rehostBoardContentImage(currentUser.id, data.recordId, data.sourceUrl);
    return { url };
  });

  return safeAction(input);
}

/**
 * Server Action para apagar do Storage as imagens do board que foram
 * removidas do editor (chamada ao salvar as anotações da aula).
 */
export async function deleteBoardContentImagesAction(input: z.infer<typeof DeleteBoardContentImagesSchema>) {
  const safeAction = createSafeAction(DeleteBoardContentImagesSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    await classService.deleteBoardContentImages(currentUser.id, data.recordId, data.imageUrls);
    return { deleted: data.imageUrls.length };
  });

  return safeAction(input);
}

/** Ativa manualmente a lição desta aula, a pedido do professor. */
export async function activateLessonAction(input: z.infer<typeof ActivateLessonSchema>) {
  const safeAction = createSafeAction(ActivateLessonSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    const result = await classService.activateLessonForRecord(currentUser.id, data.recordId);
    revalidatePath(`/teacher/live/${data.recordId}`);
    return result;
  });

  return safeAction(input);
}

/** Marca presença automática do aluno ao entrar de fato na chamada. */
export async function markAttendanceAction(input: z.infer<typeof MarkAttendanceSchema>) {
  const safeAction = createSafeAction(MarkAttendanceSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    await classService.markStudentAttendance(currentUser.id, data.recordId);
    return { recordId: data.recordId };
  });

  return safeAction(input);
}

/**
 * Poll leve do aluno pra saber se o professor já iniciou a chamada — sem
 * isso, quem já estava com a página aberta quando a aula começou não teria
 * como descobrir sem dar F5 (não há infra de realtime neste projeto).
 * Devolve `data: null` (sucesso, sem erro) enquanto a chamada não começou.
 */
export async function getStudentCallAccessAction(input: z.infer<typeof GetStudentCallAccessSchema>) {
  const safeAction = createSafeAction(GetStudentCallAccessSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    return await classService.getStudentCallAccess(currentUser.id, data.recordId);
  });

  return safeAction(input);
}

/**
 * Custom token do Firebase pro board ao vivo desta aula — quem chama troca
 * este token pela sessão do Firebase antes de assinar/publicar o canal RTDB
 * (ver lib/realtime-board.ts). `data.token` vem `null` se o RTDB não estiver
 * configurado ou o usuário ainda não for membro sincronizado deste board.
 */
export async function getBoardAuthTokenAction(input: z.infer<typeof GetBoardAuthTokenSchema>) {
  const safeAction = createSafeAction(GetBoardAuthTokenSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    const token = await classService.getBoardAuthToken(currentUser.id, data.recordId);
    return { token };
  });

  return safeAction(input);
}

/**
 * PII de um aluno do roster, buscada sob demanda ao abrir o modal — nunca
 * pré-carregada na lista (ver comentário no plano: props de um RSC vão
 * inteiras no payload enviado ao browser, renderizadas ou não).
 */
export async function getTeacherStudentDetailAction(input: z.infer<typeof GetTeacherStudentDetailSchema>) {
  const safeAction = createSafeAction(GetTeacherStudentDetailSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    const result = await classService.getTeacherClassStudentDetail(
      currentUser.id,
      data.classGroupId,
      data.studentId
    );
    if (!result) {
      throw new AppError("Aluno não encontrado.");
    }
    return result;
  });

  return safeAction(input);
}
