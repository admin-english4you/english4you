import { describe, expect, it } from 'vitest';
import { formatPhone, isValidPhone, normalizePhone } from '@/lib/br-document';
import { SigningIdentitySchema } from './user.schema';

/**
 * Telefone na assinatura do contrato.
 *
 * Coletado aqui porque o contrato cita `{{telefone}}` e o aluno que se matricula
 * sozinho não tinha onde informá-lo — todo contrato saía com um travessão.
 */

const IDENTIDADE_VALIDA = {
  document: '529.982.247-25',
  addressZipCode: '01310-100',
  addressStreet: 'Rua A',
  addressNumber: '10',
  addressDistrict: 'Centro',
  addressCity: 'São Paulo',
  addressState: 'sp',
};

describe('normalizePhone / formatPhone', () => {
  it('guarda só dígitos, aceitando qualquer máscara digitada', () => {
    expect(normalizePhone('(11) 99000-1234')).toBe('11990001234');
    expect(normalizePhone('11 9 9000 1234')).toBe('11990001234');
  });

  it('formata celular e fixo', () => {
    expect(formatPhone('11990001234')).toBe('(11) 99000-1234');
    expect(formatPhone('1130001234')).toBe('(11) 3000-1234');
  });

  it('não quebra com valor ausente', () => {
    expect(formatPhone(null)).toBe('');
    expect(formatPhone(undefined)).toBe('');
  });
});

describe('isValidPhone', () => {
  it('aceita fixo (10) e celular (11)', () => {
    expect(isValidPhone('1130001234')).toBe(true);
    expect(isValidPhone('11990001234')).toBe(true);
  });

  it('recusa número curto ou longo demais', () => {
    expect(isValidPhone('999001234')).toBe(false);
    expect(isValidPhone('119900012345')).toBe(false);
  });
});

describe('SigningIdentitySchema', () => {
  it('normaliza o telefone junto de CPF e CEP', () => {
    const r = SigningIdentitySchema.parse({ ...IDENTIDADE_VALIDA, phone: '(11) 99000-1234' });
    expect(r.phone).toBe('11990001234');
    expect(r.document).toBe('52998224725');
    expect(r.addressZipCode).toBe('01310100');
  });

  it('exige telefone — é o que impede o contrato de sair com travessão', () => {
    const r = SigningIdentitySchema.safeParse({ ...IDENTIDADE_VALIDA, phone: '' });
    expect(r.success).toBe(false);
  });

  it('recusa telefone sem DDD, com mensagem de campo', () => {
    const r = SigningIdentitySchema.safeParse({ ...IDENTIDADE_VALIDA, phone: '99000-1234' });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0].message).toMatch(/DDD/i);
    }
  });
});
