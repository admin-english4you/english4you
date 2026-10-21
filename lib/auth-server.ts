import { cookies } from "next/headers";
import type { SessionUser } from "@/modules/user/user.session";
import { decodeSession, SESSION_COOKIE, type SessionData } from "@/lib/session";

export type { SessionData };

/**
 * Pega o usuário logado atualmente a partir dos cookies do servidor.
 * Retorna null se não houver sessão válida (ausente, adulterada ou expirada —
 * ver `decodeSession`).
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  return (await getServerSession())?.user ?? null;
}

/**
 * Pega os dados completos da sessão do usuário no servidor.
 */
export async function getServerSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  return decodeSession(cookieStore.get(SESSION_COOKIE)?.value);
}
