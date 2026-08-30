"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { LoginSchema, CreateUserByAdminSchema, RevealIdentitySchema, RequestPasswordResetSchema, ResendInviteSchema } from "./user.schema";
import { userService } from "./user.service";
import { contractService } from "@/modules/contract/contract.service";
import { getCurrentUser } from "@/lib/auth-server";
import { getHomeRouteForRole } from "@/lib/rbac";
import { createSafeAction, ActionResult } from "@/lib/safe-action";
import { AppError } from "@/lib/errors";
import { dayKeyToDate } from "@/lib/date";
import { User } from "./user.types";
import { toSessionUser } from "./user.session";
import { z } from "zod";

/**
 * Server Action para realizar login por email e senha.
 */
export async function loginAction(input: z.infer<typeof LoginSchema>) {
  const safeAction = createSafeAction(LoginSchema, async (data) => {
    const user = await userService.authenticateUser(data);

    // Gravar cookie de sessão HTTP-only.
    // `toSessionUser` remove CPF/endereço: o cookie é httpOnly mas NÃO é
    // assinado nem criptografado, e não há motivo para dado pessoal
    // regulado trafegar nele — nada que lê a sessão usa esses campos.
    const cookieStore = await cookies();
    const sessionData = {
      user: toSessionUser(user),
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
 * Server Action pública (sem sessão) do "esqueci minha senha".
 *
 * Sempre devolve sucesso, exista ou não o e-mail — `userService.requestPasswordReset`
 * é quem decide silenciosamente se manda alguma coisa. Revelar a diferença
 * aqui (erro vs sucesso) transformaria esta rota num oráculo pra descobrir
 * e-mails cadastrados.
 */
export async function requestPasswordResetAction(input: z.infer<typeof RequestPasswordResetSchema>) {
  const safeAction = createSafeAction(RequestPasswordResetSchema, async (data) => {
    await userService.requestPasswordReset(data.email);
    return { success: true };
  });

  return safeAction(input);
}

/**
 * Server Action para administradores convidarem um novo usuário (nome, email, role).
 *
 * Delega ao `contractService`, e não ao `userService`, porque cadastrar um
 * ALUNO é "criar usuário + emitir contrato do pacote escolhido" — uma
 * operação só. A orquestração vive lá para manter o módulo `user` como folha
 * na árvore de dependências (ver docblock de `registerUserWithContract`).
 */
export async function createUserByAdminAction(input: z.infer<typeof CreateUserByAdminSchema>) {
  const safeAction = createSafeAction(CreateUserByAdminSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      throw new AppError("Acesso negado. Apenas administradores podem executar esta ação.");
    }

    const result = await contractService.registerUserWithContract(currentUser.role, {
      ...data,
      // O formulário manda `YYYY-MM-DD`; o contrato guarda Date. `dayKeyToDate`
      // ancora ao meio-dia UTC, que é como o resto do projeto evita que uma
      // data escolhida caia no dia anterior por fuso horário.
      firstChargeAt: data.firstChargeDay ? dayKeyToDate(data.firstChargeDay) : null,
    });
    revalidatePath("/admin/users");
    revalidatePath("/admin/finance");
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

/**
 * Server Action para atualizar o avatar do usuário logado.
 */
export async function updateAvatarAction(formData: FormData): Promise<ActionResult<User>> {
  try {
    const file = formData.get("avatar") as File | null;
    if (!file || file.size === 0) {
      throw new AppError("Nenhum arquivo enviado.");
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new AppError("A imagem deve ter no máximo 5MB.");
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    const updatedUser = await userService.updateAvatar(currentUser.id, file);

    // Atualizar o cookie de sessão para manter os dados sincronizados
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("e4y_session");
    if (sessionCookie && sessionCookie.value) {
      try {
        const sessionData = JSON.parse(sessionCookie.value);
        // Mesma regra do login: identidade (CPF/endereço) não entra no cookie.
        sessionData.user = toSessionUser(updatedUser);
        cookieStore.set("e4y_session", JSON.stringify(sessionData), {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 7 * 24 * 60 * 60, // 7 dias
        });
      } catch (err) {
        console.error("Erro ao atualizar cookie de sessão:", err);
      }
    }

    revalidatePath("/", "layout"); // Revalida toda a aplicação para atualizar o header e a página
    return { success: true, data: updatedUser };
  } catch (err: unknown) {
    console.error("Action error:", err);
    if (err instanceof AppError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "Ocorreu um erro interno no servidor. Tente novamente." };
  }
}

/**
 * Revela CPF/endereço/telefone de um usuário para o admin.
 *
 * `idToken` vem de uma reautenticação no Firebase feita NO CLIENTE com a senha
 * do próprio admin — a senha não passa por aqui. O Service confere assinatura,
 * dono e frescor do token (ver `assertAdminReauth`).
 */
export async function revealUserIdentityAction(
  input: z.infer<typeof RevealIdentitySchema>
) {
  const safeAction = createSafeAction(RevealIdentitySchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    return await userService.getUserIdentityForAdmin(
      currentUser.role,
      currentUser.id,
      data.idToken,
      data.userId
    );
  });

  return safeAction(input);
}

/**
 * Reenvia o e-mail de definição de senha.
 *
 * Os links do Firebase expiram, e aluno que demora para abrir o convite fica
 * travado; sem isto, a única saída era ele mesmo lembrar do "esqueci minha
 * senha". Idempotente — cada chamada gera um link novo e invalida o anterior.
 */
export async function resendInviteAction(input: z.infer<typeof ResendInviteSchema>) {
  const safeAction = createSafeAction(ResendInviteSchema, async (data) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AppError("Usuário não autenticado.");
    }

    await userService.sendInviteForUser(currentUser.role, data.userId);
    return { success: true };
  });

  return safeAction(input);
}
