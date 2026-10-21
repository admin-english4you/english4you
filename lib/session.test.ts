import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { decodeSession, encodeSession, type SessionData } from './session';

/**
 * A sessão é a única prova de identidade do app: todo `getCurrentUser()`
 * confia nela. Estes testes garantem que nenhuma alteração feita no navegador
 * sobrevive à verificação.
 */

const SECRET = 'segredo-de-teste-com-mais-de-32-caracteres!!';

function session(overrides: Partial<SessionData> = {}): SessionData {
  return {
    user: { id: 'user-1', name: 'Aluno', email: 'aluno@teste.invalid', role: 'STUDENT' } as SessionData['user'],
    token: 'token_user-1',
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    ...overrides,
  };
}

/** Reescreve o payload como faria alguém editando o cookie no DevTools. */
function tamper(cookie: string, mutate: (data: SessionData) => void): string {
  const [payload, signature] = cookie.split('.');
  const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  mutate(data);
  return `${Buffer.from(JSON.stringify(data), 'utf8').toString('base64url')}.${signature}`;
}

beforeEach(() => {
  vi.stubEnv('SESSION_SECRET', SECRET);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('sessão assinada', () => {
  it('aceita a sessão que ela mesma assinou', () => {
    const cookie = encodeSession(session());
    expect(decodeSession(cookie)?.user).toMatchObject({ id: 'user-1', role: 'STUDENT' });
  });

  it('rejeita troca de role (aluno tentando virar ADMIN)', () => {
    const cookie = tamper(encodeSession(session()), (d) => { d.user.role = 'ADMIN'; });
    expect(decodeSession(cookie)).toBeNull();
  });

  it('rejeita troca de id (se passar por outro usuário)', () => {
    const cookie = tamper(encodeSession(session()), (d) => { d.user.id = 'outro-user'; });
    expect(decodeSession(cookie)).toBeNull();
  });

  it('rejeita esticar a validade', () => {
    const cookie = tamper(encodeSession(session()), (d) => { d.expiresAt = '2099-01-01T00:00:00Z'; });
    expect(decodeSession(cookie)).toBeNull();
  });

  it('rejeita o cookie antigo em JSON puro', () => {
    expect(decodeSession(JSON.stringify(session()))).toBeNull();
  });

  it('rejeita assinatura feita com outro segredo', () => {
    const cookie = encodeSession(session());
    vi.stubEnv('SESSION_SECRET', 'outro-segredo-tambem-com-mais-de-32-chars');
    expect(decodeSession(cookie)).toBeNull();
  });

  it('rejeita sessão expirada', () => {
    const cookie = encodeSession(session({ expiresAt: new Date(Date.now() - 1000).toISOString() }));
    expect(decodeSession(cookie)).toBeNull();
  });

  it('rejeita lixo sem quebrar', () => {
    for (const value of ['', '.', 'abc', 'abc.', '.abc', 'a.b.c', '%%%.%%%', undefined, null]) {
      expect(decodeSession(value)).toBeNull();
    }
  });

  it('sem SESSION_SECRET: não cria sessão e trata toda sessão como inválida', () => {
    const cookie = encodeSession(session());
    vi.stubEnv('SESSION_SECRET', '');
    expect(() => encodeSession(session())).toThrow(/SESSION_SECRET/);
    expect(decodeSession(cookie)).toBeNull();
  });

  it('recusa segredo curto demais', () => {
    vi.stubEnv('SESSION_SECRET', 'curto');
    expect(() => encodeSession(session())).toThrow(/SESSION_SECRET/);
  });
});
