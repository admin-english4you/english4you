"use server";

import { z } from "zod";
import { getCurrentUser } from "@/lib/auth-server";
import { createSafeAction } from "@/lib/safe-action";
import { AppError } from "@/lib/errors";
import { notificationService } from "./notification.service";
import { MarkNotificationReadSchema } from "./notification.schema";

const EmptySchema = z.object({});

export async function getMyNotificationsAction() {
  const safeAction = createSafeAction(EmptySchema, async () => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }
    return await notificationService.getMyNotifications(currentUser.id);
  });

  return safeAction({});
}

export async function markNotificationReadAction(input: z.infer<typeof MarkNotificationReadSchema>) {
  const safeAction = createSafeAction(MarkNotificationReadSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }
    await notificationService.markRead(currentUser.id, data.notificationId);
    return { notificationId: data.notificationId };
  });

  return safeAction(input);
}

export async function markAllNotificationsReadAction() {
  const safeAction = createSafeAction(EmptySchema, async () => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }
    await notificationService.markAllRead(currentUser.id);
    return { success: true };
  });

  return safeAction({});
}
