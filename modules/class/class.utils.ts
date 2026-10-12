import { ScheduleSlot, WeekdayEnum, ClassStatusEnum } from './class.schema';
import { addDaysToKey, weekdayIndex, zonedWallClockToUtc } from '@/lib/date';

type ClassStatus = ReturnType<typeof ClassStatusEnum.parse>;

export const STATUS_LABELS: Record<ClassStatus, string> = {
  ACTIVE: 'Ativa',
  INACTIVE: 'Inativa',
  COMPLETED: 'Arquivada',
};

export const STATUS_STYLES: Record<ClassStatus, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  INACTIVE: 'bg-amber-50 text-amber-700 border-amber-200',
  COMPLETED: 'bg-slate-100 text-slate-500 border-slate-200',
};

export const WEEKDAY_LABELS: Record<ScheduleSlot['weekday'], string> = {
  MON: 'Seg',
  TUE: 'Ter',
  WED: 'Qua',
  THU: 'Qui',
  FRI: 'Sex',
  SAT: 'Sáb',
  SUN: 'Dom',
};

const WEEKDAY_ORDER = WeekdayEnum.options;

export function sortScheduleSlots(schedule: ScheduleSlot[]): ScheduleSlot[] {
  return [...schedule].sort((a, b) => {
    const weekdayDiff = WEEKDAY_ORDER.indexOf(a.weekday) - WEEKDAY_ORDER.indexOf(b.weekday);
    return weekdayDiff !== 0 ? weekdayDiff : a.time.localeCompare(b.time);
  });
}

export function jsDayToWeekday(jsDay: number): ScheduleSlot['weekday'] {
  // getDay(): 0 = domingo ... 6 = sábado
  const map: ScheduleSlot['weekday'][] = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  return map[jsDay];
}

/**
 * Gera `count` instantes de aula, em ordem, distribuídos pelos dias/horários
 * recorrentes do `schedule`, a partir de `startDayKey` (inclusive). Percorre o
 * calendário em dias do fuso da aplicação ('YYYY-MM-DD'), não em Date, para que
 * a virada de dia não dependa do fuso do processo.
 */
export function generateSlotDates(schedule: ScheduleSlot[], count: number, startDayKey: string): Date[] {
  const sortedSlots = sortScheduleSlots(schedule);
  const dates: Date[] = [];
  let cursor = startDayKey;

  const maxIterations = 7 * count + 14; // margem de segurança, nunca deveria ser atingido
  let iterations = 0;

  while (dates.length < count && iterations < maxIterations) {
    const currentWeekday = jsDayToWeekday(weekdayIndex(cursor));
    for (const slot of sortedSlots.filter((s) => s.weekday === currentWeekday)) {
      if (dates.length >= count) break;
      dates.push(zonedWallClockToUtc(cursor, slot.time));
    }

    cursor = addDaysToKey(cursor, 1);
    iterations += 1;
  }

  return dates;
}

/** Formata o horário da turma para exibição, ex: "Seg, Qua • 09:00" ou "Seg 09:00, Sex 14:00". */
export function formatScheduleSummary(schedule: ScheduleSlot[]): string {
  if (schedule.length === 0) return "Sem horário definido";

  const sorted = sortScheduleSlots(schedule);
  const allSameTime = sorted.every((slot) => slot.time === sorted[0].time);

  if (allSameTime) {
    const days = sorted.map((slot) => WEEKDAY_LABELS[slot.weekday]).join(", ");
    return `${days} • ${sorted[0].time}`;
  }

  return sorted.map((slot) => `${WEEKDAY_LABELS[slot.weekday]} ${slot.time}`).join(", ");
}
