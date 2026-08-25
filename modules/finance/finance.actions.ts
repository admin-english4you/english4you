"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  ArchivePackageSchema,
  CreateFinancialEntrySchema,
  CreatePackageSchema,
  DeleteFinancialEntrySchema,
  SettleFinancialEntrySchema,
  UpdateFinancialEntrySchema,
  UpdatePackageSchema,
} from "./finance.schema";
import { financeService } from "./finance.service";
import { getCurrentUser } from "@/lib/auth-server";
import { createSafeAction } from "@/lib/safe-action";
import { AppError } from "@/lib/errors";

/**
 * Toda mutação de pacote revalida também /admin/users: é de lá que sai o
 * seletor de pacote no cadastro de aluno.
 */
function revalidatePackagePaths() {
  revalidatePath("/admin/finance");
  revalidatePath("/admin/users");
}

export async function createPackageAction(input: z.infer<typeof CreatePackageSchema>) {
  const safeAction = createSafeAction(CreatePackageSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    const result = await financeService.createPackage(currentUser.role, data);
    revalidatePackagePaths();
    return result;
  });

  return safeAction(input);
}

export async function updatePackageAction(input: z.infer<typeof UpdatePackageSchema>) {
  const safeAction = createSafeAction(UpdatePackageSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    const { packageId, ...rest } = data;
    const result = await financeService.updatePackage(currentUser.role, packageId, rest);
    revalidatePackagePaths();
    return result;
  });

  return safeAction(input);
}

/** Alterna arquivado/ativo — pacote nunca é deletado (pode ter contrato vinculado). */
export async function archivePackageAction(input: z.infer<typeof ArchivePackageSchema>) {
  const safeAction = createSafeAction(ArchivePackageSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    const result = await financeService.archivePackage(currentUser.role, data.packageId);
    revalidatePackagePaths();
    return result;
  });

  return safeAction(input);
}

// ---------------------------------------------------------------------------
// Livro-caixa
// ---------------------------------------------------------------------------

/**
 * Lançamento entra na receita do mês, que o dashboard também mostra — por isso
 * as duas rotas são revalidadas juntas.
 */
function revalidateEntryPaths() {
  revalidatePath("/admin/finance");
  revalidatePath("/admin");
}

export async function createFinancialEntryAction(
  input: z.infer<typeof CreateFinancialEntrySchema>
) {
  const safeAction = createSafeAction(CreateFinancialEntrySchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    const result = await financeService.createEntry(currentUser.role, currentUser.id, data);
    revalidateEntryPaths();
    return result;
  });

  return safeAction(input);
}

export async function updateFinancialEntryAction(
  input: z.infer<typeof UpdateFinancialEntrySchema>
) {
  const safeAction = createSafeAction(UpdateFinancialEntrySchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    const { entryId, ...rest } = data;
    const result = await financeService.updateEntry(currentUser.role, entryId, rest);
    revalidateEntryPaths();
    return result;
  });

  return safeAction(input);
}

/** Marca como liquidado (`paidAt` preenchido) ou reabre (`paidAt` nulo). */
export async function settleFinancialEntryAction(
  input: z.infer<typeof SettleFinancialEntrySchema>
) {
  const safeAction = createSafeAction(SettleFinancialEntrySchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    const result = await financeService.settleEntry(currentUser.role, data.entryId, data.paidAt);
    revalidateEntryPaths();
    return result;
  });

  return safeAction(input);
}

export async function deleteFinancialEntryAction(
  input: z.infer<typeof DeleteFinancialEntrySchema>
) {
  const safeAction = createSafeAction(DeleteFinancialEntrySchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    await financeService.deleteEntry(currentUser.role, data.entryId);
    revalidateEntryPaths();
    return { success: true };
  });

  return safeAction(input);
}
