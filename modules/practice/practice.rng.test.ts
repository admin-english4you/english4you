import { describe, expect, it } from 'vitest';
import {
  createRng,
  hashString,
  mulberry32,
  seededPick,
  seededShuffle,
  seededShuffleDistinct,
} from './practice.rng';

describe('hashString', () => {
  it('é determinístico', () => {
    expect(hashString('abc')).toBe(hashString('abc'));
  });

  it('separa entradas diferentes', () => {
    expect(hashString('lesson:1')).not.toBe(hashString('lesson:2'));
  });

  it('devolve inteiro sem sinal de 32 bits', () => {
    for (const input of ['', 'a', 'lição de casa', '🎧']) {
      const hash = hashString(input);
      expect(Number.isInteger(hash)).toBe(true);
      expect(hash).toBeGreaterThanOrEqual(0);
      expect(hash).toBeLessThanOrEqual(0xffffffff);
    }
  });
});

describe('mulberry32', () => {
  it('produz a mesma sequência para a mesma semente', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = Array.from({ length: 20 }, a);
    const seqB = Array.from({ length: 20 }, b);
    expect(seqA).toEqual(seqB);
  });

  it('produz valores em [0, 1)', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 500; i += 1) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('seededPick', () => {
  it('mesma semente escolhe sempre o mesmo elemento', () => {
    const items = ['a', 'b', 'c', 'd', 'e'];
    const first = seededPick(items, createRng('estavel'));
    for (let i = 0; i < 100; i += 1) {
      expect(seededPick(items, createRng('estavel'))).toBe(first);
    }
  });

  it('lança em array vazio', () => {
    expect(() => seededPick([], createRng('x'))).toThrow();
  });
});

describe('seededShuffle', () => {
  it('mesma semente produz a mesma ordem', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(seededShuffle(items, createRng('s'))).toEqual(seededShuffle(items, createRng('s')));
  });

  it('preserva todos os elementos', () => {
    const items = ['I', 'drink', 'coffee', 'every', 'morning'];
    const shuffled = seededShuffle(items, createRng('s'));
    expect([...shuffled].sort()).toEqual([...items].sort());
  });

  it('não muta a entrada', () => {
    const items = [1, 2, 3];
    seededShuffle(items, createRng('s'));
    expect(items).toEqual([1, 2, 3]);
  });
});

describe('seededShuffleDistinct', () => {
  it('nunca devolve a ordem original quando há alternativa', () => {
    const items = ['I', 'usually', 'drink', 'coffee', 'in', 'the', 'morning'];
    // Varre muitas sementes: nenhuma pode entregar a frase já montada.
    for (let i = 0; i < 300; i += 1) {
      const shuffled = seededShuffleDistinct(items, createRng(`seed-${i}`));
      expect(shuffled.join(' ')).not.toBe(items.join(' '));
      expect([...shuffled].sort()).toEqual([...items].sort());
    }
  });

  it('lida com dois elementos', () => {
    for (let i = 0; i < 50; i += 1) {
      expect(seededShuffleDistinct(['a', 'b'], createRng(`s${i}`)).join(' ')).toBe('b a');
    }
  });

  it('devolve a entrada quando não há ordem diferente possível', () => {
    expect(seededShuffleDistinct(['só'], createRng('s'))).toEqual(['só']);
    expect(seededShuffleDistinct(['a', 'a', 'a'], createRng('s'))).toEqual(['a', 'a', 'a']);
    expect(seededShuffleDistinct([], createRng('s'))).toEqual([]);
  });
});
