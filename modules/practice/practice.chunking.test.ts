import { describe, expect, it } from 'vitest';
import { splitRangeByChunkSize, splitCountByChunkSize } from './practice.chunking';

/**
 * Cobre a divisão em lotes que resolveu o 504 real em produção: uma lição de
 * 9.372 chars pedindo os 10-15 STRUCTURE numa chamada só levou 117s sozinha,
 * bem acima do teto de 60s do plano Hobby da Vercel.
 */
describe('splitRangeByChunkSize', () => {
  it('não divide quando o alvo já cabe no teto de uma chamada', () => {
    expect(splitRangeByChunkSize([2, 5], 5)).toEqual([[2, 5]]);
  });

  it('divide SOLO_STRUCTURE (10-15) em pedaços de até 5 — o caso real do 504', () => {
    const chunks = splitRangeByChunkSize([10, 15], 5);
    expect(chunks).toHaveLength(3);
    for (const [, max] of chunks) {
      expect(max).toBeLessThanOrEqual(5);
    }
  });

  it('divide SOLO_VOCAB (20-40) em pedaços de até 14', () => {
    const chunks = splitRangeByChunkSize([20, 40], 14);
    expect(chunks).toHaveLength(3);
    for (const [, max] of chunks) {
      expect(max).toBeLessThanOrEqual(14);
    }
  });

  it('devolve vazio quando o alvo é zero (tipo não pedido nesta chamada)', () => {
    expect(splitRangeByChunkSize([0, 0], 5)).toEqual([]);
  });

  it('todo pedaço tem min ≥ 1 (nunca pede "gere entre 0 e N")', () => {
    const chunks = splitRangeByChunkSize([1, 3], 5);
    for (const [min] of chunks) {
      expect(min).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('splitCountByChunkSize', () => {
  it('não divide quando a contagem já cabe no teto', () => {
    expect(splitCountByChunkSize(3, 5)).toEqual([3]);
  });

  it('divide o teto da tela de "gerar mais" (20) em pedaços de até 5', () => {
    const chunks = splitCountByChunkSize(20, 5);
    expect(chunks.reduce((a, b) => a + b, 0)).toBe(20);
    for (const n of chunks) {
      expect(n).toBeLessThanOrEqual(5);
    }
  });

  it('a soma dos pedaços bate exatamente com o pedido original', () => {
    // Garantia importante: dividir em lotes não pode mudar QUANTO foi pedido,
    // só COMO foi pedido — senão o relatório "X de Y" da tela mentiria.
    for (const count of [1, 4, 5, 7, 13, 20]) {
      const chunks = splitCountByChunkSize(count, 5);
      expect(chunks.reduce((a, b) => a + b, 0)).toBe(count);
    }
  });

  it('devolve vazio quando a contagem é zero', () => {
    expect(splitCountByChunkSize(0, 5)).toEqual([]);
  });

  it('nunca devolve um pedaço zerado', () => {
    for (const count of [1, 2, 3, 6, 11]) {
      const chunks = splitCountByChunkSize(count, 5);
      expect(chunks.every((n) => n > 0)).toBe(true);
    }
  });
});
