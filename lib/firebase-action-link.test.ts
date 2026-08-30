import { describe, expect, it } from 'vitest';
import { toAppPasswordSetupLink } from './firebase-action-link';

const FIREBASE_LINK =
  'https://projeto.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=ABC-123_xyz&apiKey=KEY&lang=pt';

describe('toAppPasswordSetupLink', () => {
  it('leva o oobCode para a nossa página', () => {
    expect(toAppPasswordSetupLink(FIREBASE_LINK, 'https://escola.com.br')).toBe(
      'https://escola.com.br/definir-senha?oobCode=ABC-123_xyz'
    );
  });

  it('não duplica a barra final da URL do app', () => {
    expect(toAppPasswordSetupLink(FIREBASE_LINK, 'https://escola.com.br/')).toBe(
      'https://escola.com.br/definir-senha?oobCode=ABC-123_xyz'
    );
  });

  it('escapa caracteres especiais do código', () => {
    const link = 'https://x.firebaseapp.com/__/auth/action?oobCode=a%2Bb%2Fc';
    expect(toAppPasswordSetupLink(link, 'https://escola.com.br')).toContain('oobCode=a%2Bb%2Fc');
  });

  /**
   * Nos dois casos abaixo devolver o link original é melhor do que mandar o
   * aluno para uma página nossa que não teria como validar nada.
   */
  it('devolve o original quando não há oobCode', () => {
    const semCodigo = 'https://x.firebaseapp.com/__/auth/action?mode=resetPassword';
    expect(toAppPasswordSetupLink(semCodigo, 'https://escola.com.br')).toBe(semCodigo);
  });

  it('devolve o original quando não é uma URL válida', () => {
    expect(toAppPasswordSetupLink('nao-e-url', 'https://escola.com.br')).toBe('nao-e-url');
  });
});
