import { describe, expect, it } from 'vitest';
import {
  amountToCents,
  centsToAmount,
  describeRejection,
  mapMpPaymentStatus,
  mapMpPreapprovalStatus,
  normalizeCardLastFour,
} from './payment.utils';

describe('mapMpPreapprovalStatus', () => {
  it('traduz os status conhecidos do Mercado Pago', () => {
    expect(mapMpPreapprovalStatus('pending')).toBe('PENDING');
    expect(mapMpPreapprovalStatus('authorized')).toBe('AUTHORIZED');
    expect(mapMpPreapprovalStatus('paused')).toBe('PAUSED');
    expect(mapMpPreapprovalStatus('cancelled')).toBe('CANCELLED');
  });

  it('devolve null para status desconhecido ou ausente, em vez de chutar', () => {
    expect(mapMpPreapprovalStatus('algo_novo')).toBeNull();
    expect(mapMpPreapprovalStatus(undefined)).toBeNull();
  });
});

describe('mapMpPaymentStatus', () => {
  it('o status do pagamento manda sobre o da invoice', () => {
    // `processed` diz apenas que o MP tentou cobrar.
    expect(mapMpPaymentStatus('processed', 'approved')).toBe('PAID');
    expect(mapMpPaymentStatus('processed', 'rejected')).toBe('FAILED');
  });

  it('trata estorno e chargeback como REFUNDED', () => {
    expect(mapMpPaymentStatus('processed', 'refunded')).toBe('REFUNDED');
    expect(mapMpPaymentStatus('processed', 'charged_back')).toBe('REFUNDED');
  });

  it('recycling sem pagamento já conta como falha (o MP está retentando após recusa)', () => {
    expect(mapMpPaymentStatus('recycling', undefined)).toBe('FAILED');
  });

  it('cobrança apenas agendada fica PENDING', () => {
    expect(mapMpPaymentStatus('scheduled', undefined)).toBe('PENDING');
    expect(mapMpPaymentStatus(undefined, undefined)).toBe('PENDING');
  });
});

describe('conversão de valores', () => {
  it('converte reais do MP para centavos sem erro de float', () => {
    expect(amountToCents(150)).toBe(15000);
    expect(amountToCents(150.1)).toBe(15010);
    // 0.1 + 0.2 clássico: 19.99 * 100 dá 1998.9999... em ponto flutuante.
    expect(amountToCents(19.99)).toBe(1999);
  });

  it('trata valor ausente ou inválido como zero em vez de NaN', () => {
    expect(amountToCents(undefined)).toBe(0);
    expect(amountToCents(Number.NaN)).toBe(0);
  });

  it('volta de centavos para o formato de reais que o MP espera', () => {
    expect(centsToAmount(15000)).toBe(150);
    expect(centsToAmount(1999)).toBe(19.99);
  });
});

describe('normalizeCardLastFour', () => {
  it('extrai os 4 últimos dígitos', () => {
    expect(normalizeCardLastFour('1234')).toBe('1234');
    expect(normalizeCardLastFour(4321)).toBe('4321');
    expect(normalizeCardLastFour('**** 5678')).toBe('5678');
  });

  it('devolve null quando não há dígitos suficientes', () => {
    expect(normalizeCardLastFour(null)).toBeNull();
    expect(normalizeCardLastFour(undefined)).toBeNull();
    expect(normalizeCardLastFour('12')).toBeNull();
  });
});

describe('describeRejection', () => {
  it('traduz o motivo conhecido', () => {
    expect(describeRejection('cc_rejected_insufficient_amount')).toContain('limite ou saldo');
  });

  it('usa texto genérico para código desconhecido ou ausente', () => {
    expect(describeRejection('cc_rejected_algo_novo')).toBe('A cobrança foi recusada pelo banco.');
    expect(describeRejection(null)).toBe('A cobrança foi recusada pelo banco.');
  });
});
