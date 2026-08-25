"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { SubscribePushSchema, UnsubscribePushSchema } from "./push-notification.schema";
import { pushNotificationService } from "./push-notification.service";
import { getCurrentUser } from "@/lib/auth-server";
import { createSafeAction } from "@/lib/safe-action";
import { AppError } from "@/lib/errors";

export async function subscribePushAction(input: z.infer<typeof SubscribePushSchema>) {
  const safeAction = createSafeAction(SubscribePushSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    const userAgent = (await headers()).get("user-agent") ?? undefined;
    await pushNotificationService.subscribe(currentUser.id, currentUser.role, data, userAgent);
    return { success: true };
  });

  return safeAction(input);
}

export async function unsubscribePushAction(input: z.infer<typeof UnsubscribePushSchema>) {
  const safeAction = createSafeAction(UnsubscribePushSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    await pushNotificationService.unsubscribe(currentUser.id, data.endpoint);
    return { success: true };
  });

  return safeAction(input);
}
