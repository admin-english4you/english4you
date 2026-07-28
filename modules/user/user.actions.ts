"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { LoginSchema, CreateUserByAdminSchema } from "./user.schema";
import { userService } from "./user.service";
import { getCurrentUser } from "@/lib/auth-server";
import { getHomeRouteForRole } from "@/lib/rbac";
import { createSafeAction } from "@/lib/safe-action";
import { z } from "zod";

/**
 * Server Action para realizar login por email e senha.
 */
export async function loginAction(input: z.infer<typeof LoginSchema>) {
  const safeAction = createSafeAction(LoginSchema, async (data) => {
    const user = await userService.authenticateUser(data);

    // Gravar cookie de sessão HTTP-only
    const cookieStore = await cookies();
    const sessionData = {
      user,
      token: `token_${user.id}`,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    cookieStore.set("e4y_session", JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 dias
    });

    const redirectUrl = getHomeRouteForRole(user.role);
    return { user, redirectUrl };
  });

  return safeAction(input);
}

/**
 * Server Action para administradores convidarem um novo usuário (nome, email, role).
 */
export async function createUserByAdminAction(input: z.infer<typeof CreateUserByAdminSchema>) {
  const safeAction = createSafeAction(CreateUserByAdminSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      throw new Error("Acesso negado. Apenas administradores podem executar esta ação.");
    }

    const result = await userService.createUserByAdmin(currentUser.role, data);
    revalidatePath("/admin/users");
    return result.user;
  });

  return safeAction(input);
}

/**
 * Server Action para encerrar a sessão.
 */
export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("e4y_session");
  redirect("/login");
}

/**
 * Recupera o usuário atual a partir da sessão e do banco de dados (útil para Client Components)
 */
export async function getMeAction() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return null;
  const user = await userService.getUserById(currentUser.id);
  return user || null;
}
