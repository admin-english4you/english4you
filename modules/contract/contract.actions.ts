"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  CancelContractSchema,
  CreateContractForUserSchema,
  CreateContractTemplateSchema,
  SetContractTemplateActiveSchema,
  SignContractSchema,
  SigningIdentitySchema,
  UpdateContractTemplateSchema,
} from "./contract.schema";
import { contractService } from "./contract.service";
import { getCurrentUser } from "@/lib/auth-server";
import { createSafeAction } from "@/lib/safe-action";
import { AppError } from "@/lib/errors";

// ---------------------------------------------------------------------------
// Modelos (admin)
// ---------------------------------------------------------------------------

export async function createContractTemplateAction(input: z.infer<typeof CreateContractTemplateSchema>) {
  const safeAction = createSafeAction(CreateContractTemplateSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    const result = await contractService.createTemplate(currentUser.role, data);
    revalidatePath("/admin/finance");
    return result;
  });

  return safeAction(input);
}

export async function updateContractTemplateAction(input: z.infer<typeof UpdateContractTemplateSchema>) {
  const safeAction = createSafeAction(UpdateContractTemplateSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    const { templateId, ...rest } = data;
    const result = await contractService.updateTemplate(currentUser.role, templateId, rest);
    revalidatePath("/admin/finance");
    revalidatePath(`/admin/finance/templates/${templateId}`);
    return result;
  });

  return safeAction(input);
}

export async function setContractTemplateActiveAction(input: z.infer<typeof SetContractTemplateActiveSchema>) {
  const safeAction = createSafeAction(SetContractTemplateActiveSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    const result = await contractService.setTemplateActive(currentUser.role, data.templateId);
    revalidatePath("/admin/finance");
    return result;
  });

  return safeAction(input);
}

// ---------------------------------------------------------------------------
// Contratos (admin)
// ---------------------------------------------------------------------------

/** Emite um contrato manualmente (professor, ou aluno que ficou sem). */
export async function createContractForUserAction(input: z.infer<typeof CreateContractForUserSchema>) {
  const safeAction = createSafeAction(CreateContractForUserSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    const result = await contractService.createContractForUser(
      currentUser.role,
      data.userId,
      data.packageId
    );
    revalidatePath("/admin/finance");
    return result;
  });

  return safeAction(input);
}

export async function cancelContractAction(input: z.infer<typeof CancelContractSchema>) {
  const safeAction = createSafeAction(CancelContractSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    const result = await contractService.cancelContract(currentUser.role, data.contractId);
    revalidatePath("/admin/finance");
    revalidatePath(`/admin/finance/contracts/${data.contractId}`);
    return result;
  });

  return safeAction(input);
}

// ---------------------------------------------------------------------------
// Área do usuário
// ---------------------------------------------------------------------------

/** Passo 1 da assinatura: o próprio usuário grava CPF e endereço. */
export async function saveSigningIdentityAction(input: z.infer<typeof SigningIdentitySchema>) {
  const safeAction = createSafeAction(SigningIdentitySchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    await contractService.saveSigningIdentity(currentUser.id, data);
    revalidatePath("/student/documents");
    return { ok: true };
  });

  return safeAction(input);
}

/**
 * Passo 3: assina o contrato.
 *
 * Esta é a única action que lê `headers()`: o IP é dado de request e o service
 * precisa continuar agnóstico de Next (ver tabela de camadas no AGENTS.md).
 * `x-forwarded-for` pode vir como uma lista de proxies — o primeiro item é o
 * cliente original.
 */
export async function signContractAction(input: z.infer<typeof SignContractSchema>) {
  const safeAction = createSafeAction(SignContractSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    const headerList = await headers();
    const forwardedFor = headerList.get("x-forwarded-for");
    const ip =
      forwardedFor?.split(",")[0]?.trim() || headerList.get("x-real-ip") || "unknown";

    const result = await contractService.signContract(currentUser.id, ip, data);
    revalidatePath("/student/documents");
    revalidatePath("/admin/finance");
    return result;
  });

  return safeAction(input);
}
