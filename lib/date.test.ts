import { describe, expect, it } from 'vitest';
import {
  APP_TIMEZONE,
  addDaysToKey,
  compareDayKeys,
  dayKeyToUtcNoon,
  diffInDays,
  formatDayKeyPtBr,
  formatRelativeDayKey,
  formatTimeInZone,
  maxDayKey,
  startOfWeekKey,
  toDayKey,
  weekdayIndex,
  zonedWallClockToUtc,
} from './date';

describe('toDayKey', () => {
  it('formata como YYYY-MM-DD', () => {
    expect(toDayKey(new Date('2026-08-07T12:00:00Z'), 'UTC')).toBe('2026-08-07');
  });

  it('resolve a aula noturna para o dia correto em São Paulo (o bug do off-by-one)', () => {
    // 07/08 às 21:00 em SP = 08/08 às 00:00 em UTC.
    const instant = new Date('2026-08-08T00:00:00Z');
    expect(toDayKey(instant, 'UTC')).toBe('2026-08-08');
    expect(toDayKey(instant, APP_TIMEZONE)).toBe('2026-08-07');
  });

  it('rejeita Date inválida', () => {
    expect(() => toDayKey(new Date('nao-e-data'))).toThrow();
  });
});

describe('addDaysToKey', () => {
  it('avança um dia', () => {
    expect(addDaysToKey('2026-08-07', 1)).toBe('2026-08-08');
  });

  it('atravessa a virada de mês', () => {
    expect(addDaysToKey('2026-08-31', 1)).toBe('2026-09-01');
  });

  it('atravessa a virada de ano', () => {
    expect(addDaysToKey('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('lida com ano bissexto', () => {
    expect(addDaysToKey('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDaysToKey('2027-02-28', 1)).toBe('2027-03-01');
  });

  it('aceita deslocamento negativo', () => {
    expect(addDaysToKey('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('é imune a DST: 6 saltos de 1 dia == 1 salto de 6 dias, em qualquer época do ano', () => {
    for (const start of ['2026-02-12', '2026-10-15', '2026-03-05', '2026-11-01']) {
      let stepwise = start;
      for (let i = 0; i < 6; i += 1) stepwise = addDaysToKey(stepwise, 1);
      expect(stepwise).toBe(addDaysToKey(start, 6));
    }
  });

  it('rejeita dayKey malformado', () => {
    expect(() => addDaysToKey('07/08/2026', 1)).toThrow();
  });
});

describe('compareDayKeys / diffInDays / maxDayKey', () => {
  it('ordena cronologicamente', () => {
    expect(compareDayKeys('2026-08-07', '2026-08-08')).toBeLessThan(0);
    expect(compareDayKeys('2026-08-08', '2026-08-07')).toBeGreaterThan(0);
    expect(compareDayKeys('2026-08-07', '2026-08-07')).toBe(0);
  });

  it('conta dias inteiros entre chaves', () => {
    expect(diffInDays('2026-08-07', '2026-08-13')).toBe(6);
    expect(diffInDays('2026-08-13', '2026-08-07')).toBe(-6);
    expect(diffInDays('2026-02-26', '2026-03-05')).toBe(7);
  });

  it('maxDayKey devolve a mais recente e ignora nulos', () => {
    expect(maxDayKey('2026-08-07', null, '2026-08-10', undefined)).toBe('2026-08-10');
    expect(maxDayKey(null, '2026-08-07')).toBe('2026-08-07');
    expect(() => maxDayKey(null, undefined)).toThrow();
  });
});

describe('startOfWeekKey / weekdayIndex', () => {
  it('2026-08-07 é uma sexta-feira', () => {
    expect(weekdayIndex('2026-08-07')).toBe(5);
  });

  it('devolve a segunda-feira da semana', () => {
    expect(startOfWeekKey('2026-08-07')).toBe('2026-08-03'); // sexta -> segunda
    expect(startOfWeekKey('2026-08-03')).toBe('2026-08-03'); // segunda -> ela mesma
    expect(startOfWeekKey('2026-08-09')).toBe('2026-08-03'); // domingo -> segunda anterior
  });
});

describe('formatação', () => {
  it('formatDayKeyPtBr usa DD/MM (Dia)', () => {
    expect(formatDayKeyPtBr('2026-08-07')).toBe('07/08 (Sex)');
    expect(formatDayKeyPtBr('2026-08-08')).toBe('08/08 (Sáb)');
  });

  it('formatRelativeDayKey resolve hoje/amanhã/ontem', () => {
    expect(formatRelativeDayKey('2026-08-07', '2026-08-07')).toBe('Hoje');
    expect(formatRelativeDayKey('2026-08-08', '2026-08-07')).toBe('Amanhã');
    expect(formatRelativeDayKey('2026-08-06', '2026-08-07')).toBe('Ontem');
    expect(formatRelativeDayKey('2026-08-20', '2026-08-07')).toBe('20/08 (Qui)');
  });
});

describe('dayKeyToUtcNoon', () => {
  it('fica no meio-dia UTC, longe de fronteiras de fuso', () => {
    expect(new Date(dayKeyToUtcNoon('2026-08-07')).toISOString()).toBe('2026-08-07T12:00:00.000Z');
  });
});

describe('zonedWallClockToUtc / formatTimeInZone', () => {
  it('19:00 em São Paulo é 22:00 UTC (offset -03:00)', () => {
    expect(zonedWallClockToUtc('2026-08-07', '19:00').toISOString()).toBe('2026-08-07T22:00:00.000Z');
  });

  it('faz round-trip com toDayKey e formatTimeInZone', () => {
    for (const time of ['00:00', '08:30', '19:00', '23:59']) {
      const instant = zonedWallClockToUtc('2026-08-07', time);
      expect(toDayKey(instant)).toBe('2026-08-07');
      expect(formatTimeInZone(instant)).toBe(time);
    }
  });

  it('preserva o dia mesmo em horários de madrugada e fim de noite', () => {
    expect(toDayKey(zonedWallClockToUtc('2026-08-07', '23:30'))).toBe('2026-08-07');
    expect(toDayKey(zonedWallClockToUtc('2026-08-07', '00:15'))).toBe('2026-08-07');
  });

  it('independe do fuso do processo — o resultado é um instante absoluto', () => {
    const instant = zonedWallClockToUtc('2026-01-15', '19:00');
    expect(instant.toISOString()).toBe('2026-01-15T22:00:00.000Z');
  });

  it('rejeita horário malformado', () => {
    expect(() => zonedWallClockToUtc('2026-08-07', '25:00')).toThrow();
    expect(() => zonedWallClockToUtc('2026-08-07', '9:00')).toThrow();
  });
});
