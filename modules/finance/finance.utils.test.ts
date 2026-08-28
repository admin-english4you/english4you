import { describe, expect, it } from 'vitest';
import { applyScholarshipDiscount, MIN_CHARGEABLE_CENTS } from './finance.utils';

describe('applyScholarshipDiscount', () => {
  const PACKAGE = 15000; // R$ 150,00

  it('sem bolsa, devolve o valor cheio', () => {
    expect(applyScholarshipDiscount(PACKAGE, 0)).toBe(PACKAGE);
  });

  it('bolsa integral zera a mensalidade', () => {
    expect(applyScholarshipDiscount(PACKAGE, 100)).toBe(0);
  });

  it('aplica um percentual exato', () => {
    expect(applyScholarshipDiscount(PACKAGE, 50)).toBe(7500);
    expect(applyScholarshipDiscount(PACKAGE, 25)).toBe(11250);
  });

  /**
   * Com `Math.floor` este caso daria 10049 — um centavo a menos por mês, para
   * sempre, sem explicação possível ao aluno.
   */
  it('arredonda para o centavo mais próximo, não para baixo', () => {
    expect(applyScholarshipDiscount(PACKAGE, 33)).toBe(10050);
  });

  it('trata percentuais fora da faixa sem produzir valor negativo', () => {
    expect(applyScholarshipDiscount(PACKAGE, -10)).toBe(PACKAGE);
    expect(applyScholarshipDiscount(PACKAGE, 150)).toBe(0);
  });

  /**
   * O arredondamento acontece UMA vez, no valor mensal. A soma das parcelas
   * pode divergir do "total com desconto" no máximo por um centavo por mês —
   * nunca por um erro que cresce.
   */
  it('não acumula deriva ao longo do contrato', () => {
    for (const percent of [7, 13, 33, 41, 66, 99]) {
      const monthly = applyScholarshipDiscount(PACKAGE, percent);
      const twelveMonths = monthly * 12;
      const nominal = (PACKAGE * (100 - percent) * 12) / 100;
      expect(Math.abs(twelveMonths - nominal)).toBeLessThanOrEqual(12);
    }
  });

  it('detecta o residual pequeno demais para uma cobrança automática', () => {
    // Pacote de R$ 50,00 com 99% de bolsa = R$ 0,50.
    const residual = applyScholarshipDiscount(5000, 99);
    expect(residual).toBe(50);
    expect(residual).toBeGreaterThan(0);
    expect(residual).toBeLessThan(MIN_CHARGEABLE_CENTS);
  });
});
