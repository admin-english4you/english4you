"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  ArchivePackageSchema,
  CreatePackageSchema,
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
