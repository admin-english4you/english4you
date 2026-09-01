import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Limpa uma sessão órfã: o cookie `e4y_session` aponta para um `userId` que
 * não existe mais no banco (conta apagada/recriada com outro id). Layouts e
 * páginas do servidor não podem mutar cookies durante o próprio render —
 * por isso redirecionam para cá em vez de chamar `logoutAction` direto.
 *
 * Sem isto, o middleware (`proxy.ts`) vê o cookie antigo, considera a sessão
 * válida e nunca deixa o usuário chegar em `/login` para autenticar de novo
 * com a conta nova.
 */
export async function GET(request: Request) {
  const cookieStore = await cookies();
  cookieStore.delete("e4y_session");
  return NextResponse.redirect(new URL("/login", request.url));
}
