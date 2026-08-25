import { describe, expect, it } from 'vitest';
import { REMINDER_SLOTS, isReminderSlot, pickReminderCopy } from './push-notification.copy';

describe('pickReminderCopy', () => {
  it('sempre devolve um título e corpo não vazios, para os três horários', () => {
    for (const slot of REMINDER_SLOTS) {
      const copy = pickReminderCopy(slot);
      expect(copy.title.length).toBeGreaterThan(0);
      expect(copy.body.length).toBeGreaterThan(0);
    }
  });

  it('sorteia mais de uma variante ao longo de várias chamadas (não é sempre o mesmo texto)', () => {
    const titles = new Set(Array.from({ length: 50 }, () => pickReminderCopy('MORNING').title));
    expect(titles.size).toBeGreaterThan(1);
  });
});

describe('isReminderSlot', () => {
  it('aceita os três horários válidos', () => {
    expect(isReminderSlot('MORNING')).toBe(true);
    expect(isReminderSlot('AFTERNOON')).toBe(true);
    expect(isReminderSlot('EVENING')).toBe(true);
  });

  it('rejeita valores inválidos ou nulos', () => {
    expect(isReminderSlot('NIGHT')).toBe(false);
    expect(isReminderSlot('')).toBe(false);
    expect(isReminderSlot(null)).toBe(false);
  });
});
