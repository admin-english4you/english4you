"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ChangeStudentPackageSchema } from "./payment.schema";
import { paymentService } from "./payment.service";
import { getCurrentUser } from "@/lib/auth-server";
import { createSafeAction } from "@/lib/safe-action";
import { AppError } from "@/lib/errors";
import type { AccessState } from "./payment.types";

/**
 * Actions do módulo de pagamento.
 *
 * As de checkout devolvem uma `initPoint` para o client redirecionar
 * (`window.location.href`) — o redirect NÃO acontece aqui: o `redirect()` do
 * Next lança uma exceção de controle que o `createSafeAction` capturaria e
 * mascararia como erro interno.
 */

/** Ações sem payload ainda precisam de um schema — este aceita e descarta. */
const EmptySchema = z.object({}).loose();

/** Ações do admin sobre a conta de um aluno específico. */
const StudentIdSchema = z.object({ userId: z.uuid() });

export async function startSubscriptionCheckoutAction() {
  const safeAction = createSafeAction(EmptySchema, async () => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    return await paymentService.startSubscriptionCheckout(currentUser.id);
  });

  return safeAction({});
}

export async function replaceCardAction() {
  const safeAction = createSafeAction(EmptySchema, async () => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    return await paymentService.replaceCard(currentUser.id);
  });

  return safeAction({});
}

/**
 * Consultada em polling pela tela de retorno do checkout: o webhook do Mercado
 * Pago costuma chegar depois do redirect do aluno, então a tela espera o estado
 * virar `OK` antes de mandá-lo para o hub.
 */
export async function getMyAccessStateAction() {
  const safeAction = createSafeAction(EmptySchema, async (): Promise<{ state: AccessState }> => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    const { state } = await paymentService.getAccessState(currentUser.id);
    return { state };
  });

  return safeAction({});
}

export async function changeStudentPackageAction(
  input: z.infer<typeof ChangeStudentPackageSchema>
) {
  const safeAction = createSafeAction(ChangeStudentPackageSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    const contract = await paymentService.changeStudentPackage(
      currentUser.role,
      data.userId,
      data.packageId
    );

    revalidatePath("/admin/finance");
    revalidatePath("/admin/users");
    return contract;
  });

  return safeAction(input);
}

/**
 * Desativa o aluno: conta inativa, assinatura cancelada no Mercado Pago e
 * cobranças agendadas canceladas. Revalida a ficha, a lista de usuários e o
 * financeiro — os três mostram o status ou o valor em aberto.
 */
export async function deactivateStudentAction(input: z.infer<typeof StudentIdSchema>) {
  const safeAction = createSafeAction(StudentIdSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    const result = await paymentService.deactivateStudent(currentUser.role, data.userId);

    revalidatePath(`/admin/users/${data.userId}`);
    revalidatePath("/admin/users");
    revalidatePath("/admin/finance");
    revalidatePath("/admin");
    return result;
  });

  return safeAction(input);
}

/** Reativa a conta. NÃO recria a assinatura — ver `paymentService.reactivateStudent`. */
export async function reactivateStudentAction(input: z.infer<typeof StudentIdSchema>) {
  const safeAction = createSafeAction(StudentIdSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    await paymentService.reactivateStudent(currentUser.role, data.userId);

    revalidatePath(`/admin/users/${data.userId}`);
    revalidatePath("/admin/users");
    revalidatePath("/admin");
    return { success: true };
  });

  return safeAction(input);
}
