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
} from "./class.schema";
import { classService } from "./class.service";
import { getCurrentUser } from "@/lib/auth-server";
import { createSafeAction } from "@/lib/safe-action";
import { AppError } from "@/lib/errors";

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
