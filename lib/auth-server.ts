import { cookies } from "next/headers";
import { User } from "@/modules/user/user.types";

export interface SessionData {
  user: User;
  token: string;
  expiresAt: string;
}

/**
 * Pega o usuário logado atualmente a partir dos cookies do servidor.
 * Retorna null se não houver cookie de sessão ativo.
 */
export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("e4y_session");

  if (!sessionCookie || !sessionCookie.value) {
    return null;
  }

  try {
    const sessionData: SessionData = JSON.parse(sessionCookie.value);
    return sessionData.user;
  } catch {
    // Se o cookie estiver corrompido
    return null;
  }
}

/**
 * Pega os dados completos da sessão do usuário no servidor.
 */
export async function getServerSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("e4y_session");

  if (!sessionCookie || !sessionCookie.value) {
    return null;
  }

  try {
    return JSON.parse(sessionCookie.value);
  } catch {
    return null;
  }
}
