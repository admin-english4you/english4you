import { describe, expect, it } from 'vitest';
import {
  formatCep,
  formatCpf,
  isValidCep,
  isValidCpf,
  normalizeCep,
  normalizeCpf,
  onlyDigits,
} from './br-document';

describe('normalizeCpf', () => {
  it('remove máscara', () => {
    expect(normalizeCpf('529.982.247-25')).toBe('52998224725');
  });

  it('trunca em 11 dígitos', () => {
    expect(normalizeCpf('529982247259999')).toBe('52998224725');
  });
});

describe('isValidCpf', () => {
  it('aceita CPFs válidos, com ou sem máscara', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(isValidCpf('52998224725')).toBe(true);
    // Caso com dígito verificador 0 (resto 10 -> 0), o ramo que mais escapa.
    expect(isValidCpf('111.444.777-35')).toBe(true);
  });

  it('rejeita dígito verificador errado', () => {
    expect(isValidCpf('529.982.247-24')).toBe(false);
  });

  it('rejeita comprimento inválido', () => {
    expect(isValidCpf('5299822472')).toBe(false);
    expect(isValidCpf('')).toBe(false);
  });

  it('rejeita dígitos repetidos, que passariam no módulo 11', () => {
    expect(isValidCpf('111.111.111-11')).toBe(false);
    expect(isValidCpf('00000000000')).toBe(false);
  });
});

describe('formatCpf', () => {
  it('aplica a máscara', () => {
    expect(formatCpf('52998224725')).toBe('529.982.247-25');
  });

  it('devolve string vazia para null/undefined', () => {
    expect(formatCpf(null)).toBe('');
    expect(formatCpf(undefined)).toBe('');
  });

  it('não mascara valor incompleto', () => {
    expect(formatCpf('123')).toBe('123');
  });
});

describe('CEP', () => {
  it('normaliza e valida', () => {
    expect(normalizeCep('01310-100')).toBe('01310100');
    expect(isValidCep('01310-100')).toBe(true);
    expect(isValidCep('0131010')).toBe(false);
  });

  it('formata', () => {
    expect(formatCep('01310100')).toBe('01310-100');
    expect(formatCep(null)).toBe('');
  });
});

describe('onlyDigits', () => {
  it('descarta qualquer coisa que não seja dígito', () => {
    expect(onlyDigits('a1b2-c3')).toBe('123');
  });
});
