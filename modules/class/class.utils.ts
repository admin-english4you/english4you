import { ScheduleSlot, WeekdayEnum, ClassStatusEnum } from './class.schema';

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
