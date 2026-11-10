import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, decodeSession } from "@/lib/session";
import { userService } from "@/modules/user/user.service";
import { getHomeRouteForRole } from "@/lib/rbac";

/**
 * Limpa uma sessão órfã: o cookie `e4y_session` aponta para um `userId` que
 * não existe mais no banco (conta apagada/recriada com outro id). Layouts e
 * páginas do servidor não podem mutar cookies durante o próprio render —
 * por isso redirecionam para cá em vez de chamar `logoutAction` direto.
 *
 * Sem isto, o middleware (`proxy.ts`) vê o cookie antigo, considera a sessão
 * válida e nunca deixa o usuário chegar em `/login` para autenticar de novo
 * com a conta nova.
 *
 * Só apaga o cookie se a sessão for MESMO órfã. É um GET (os layouts chegam
 * aqui por `redirect()`), então sem essa checagem qualquer página externa
 * poderia deslogar um usuário com um `<img src="/api/session/invalidate">`.
 */
export async function GET(request: Request) {
  const cookieStore = await cookies();
  const session = decodeSession(cookieStore.get(SESSION_COOKIE)?.value);

  if (session) {
    const user = await userService.getUserById(session.user.id);
    if (user) {
      // Sessão saudável: não há o que invalidar. Devolve o usuário ao início.
      return NextResponse.redirect(new URL(getHomeRouteForRole(user.role), request.url));
    }
  }

  cookieStore.delete(SESSION_COOKIE);
  return NextResponse.redirect(new URL("/login", request.url));
}
