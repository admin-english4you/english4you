import crypto from "crypto";
import type { SessionUser } from "@/modules/user/user.session";

/**
 * Cookie de sessão ASSINADO (HMAC-SHA256).
 *
 * Antes o cookie era o JSON do usuário em texto puro, e o servidor confiava
 * nele: qualquer pessoa logada podia editar o próprio cookie no DevTools e
 * trocar `id`/`role` — virar ADMIN ou se passar por outro aluno. `httpOnly`
 * impede o JavaScript da página de ler o cookie, mas não impede o dono do
 * navegador de reescrevê-lo.
 *
 * Formato: `<payload base64url>.<assinatura base64url>`. O conteúdo continua
 * legível (não é criptografado), por isso `toSessionUser` segue tirando
 * CPF/endereço; o que a assinatura garante é que ninguém altera nada sem o
 * `SESSION_SECRET`, que só existe no servidor. Cookies no formato antigo (JSON
 * puro) não passam na verificação — o usuário só precisa logar de novo.
 *
 * Usa `node:crypto` porque tanto as Server Actions quanto o `proxy.ts` rodam
 * em Node (o Proxy do Next 16 usa o runtime Node por padrão).
 */

export const SESSION_COOKIE = "e4y_session";
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export interface SessionData {
  user: SessionUser;
  token: string;
  expiresAt: string;
}

/** Mínimo para um segredo HMAC aleatório (`openssl rand -base64 48` dá 64). */
const MIN_SECRET_LENGTH = 32;

function getSecret(): string | null {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < MIN_SECRET_LENGTH) return null;
  return secret;
}

function sign(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

/**
 * Monta o valor do cookie. Lança se o segredo faltar: logar sem conseguir
 * assinar deixaria o usuário preso num laço de login, e um erro explícito diz
 * qual variável de ambiente configurar.
 */
export function encodeSession(data: SessionData): string {
  const secret = getSecret();
  if (!secret) {
    throw new Error(
      `SESSION_SECRET ausente ou com menos de ${MIN_SECRET_LENGTH} caracteres — não é possível criar sessões.`
    );
  }
  const payload = Buffer.from(JSON.stringify(data), "utf8").toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

/**
 * Lê e VERIFICA o cookie. Devolve `null` para qualquer coisa que não seja uma
 * sessão íntegra e dentro da validade: assinatura errada, formato antigo,
 * JSON quebrado, expirada ou segredo não configurado.
 */
export function decodeSession(value: string | undefined | null): SessionData | null {
  if (!value) return null;

  const secret = getSecret();
  if (!secret) {
    console.error("[session] SESSION_SECRET ausente — toda sessão é tratada como inválida.");
    return null;
  }

  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = value.slice(0, dot);
  const received = Buffer.from(value.slice(dot + 1), "base64url");
  const expected = Buffer.from(sign(payload, secret), "base64url");
  // `timingSafeEqual` lança com tamanhos diferentes.
  if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) {
    return null;
  }

  let data: SessionData;
  try {
    data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  // O `maxAge` do cookie é só uma instrução ao navegador; quem garante que uma
  // sessão vazada não vale para sempre é esta checagem no servidor.
  const expiresAt = Date.parse(data?.expiresAt);
  if (!data?.user?.id || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    return null;
  }

  return data;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}
