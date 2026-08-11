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
