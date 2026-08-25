/**
 * Utilitários puros de "dia de calendário".
 *
 * POR QUE ISTO EXISTE: `class_records.date` é um `timestamp` SEM timezone,
 * gerado por `combineDateAndTime` (class.service.ts) com a hora local do
 * servidor — que na Vercel é UTC. Uma aula às 21:00 em São Paulo é gravada
 * como `2026-08-07T21:00`, mas `new Date()` no servidor naquele instante já
 * está em 08/08 (UTC). Sem uma fronteira de dia explícita, todo ciclo de
 * prática de aula noturna nasce deslocado em um dia.
 *
 * REGRA: o motor de prática opera SOMENTE com strings 'YYYY-MM-DD'
 * (chamadas aqui de `dayKey`). Objetos `Date` cruzam a fronteira uma única
 * vez, no `progressService`, via `toDayKey`.
 */

export const APP_TIMEZONE = 'America/Sao_Paulo';

const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Rótulos curtos dos dias da semana, alinhados com WEEKDAY_LABELS de class.utils.ts. */
const WEEKDAY_SHORT_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;

function assertDayKey(dayKey: string): void {
  if (!DAY_KEY_PATTERN.test(dayKey)) {
    throw new Error(`dayKey inválido: "${dayKey}" (esperado 'YYYY-MM-DD')`);
  }
}

/**
 * Converte um instante para o dia de calendário correspondente no fuso da
 * aplicação. `en-CA` é o locale que formata nativamente como 'YYYY-MM-DD'.
 */
export function toDayKey(date: Date, tz: string = APP_TIMEZONE): string {
  if (Number.isNaN(date.getTime())) {
    throw new Error('toDayKey recebeu uma Date inválida');
  }
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** O dia de calendário de agora, no fuso da aplicação. */
export function todayKey(tz: string = APP_TIMEZONE): string {
  return toDayKey(new Date(), tz);
}

/**
 * Aritmética de dias imune a DST: a conta acontece em UTC ao meio-dia, longe
 * de qualquer fronteira de horário de verão, e só depois volta para string.
 */
export function addDaysToKey(dayKey: string, days: number): string {
  assertDayKey(dayKey);
  const [year, month, day] = dayKey.split('-').map(Number);
  const noonUtc = Date.UTC(year, month - 1, day, 12, 0, 0);
  const shifted = new Date(noonUtc + days * MS_PER_DAY);
  return [
    String(shifted.getUTCFullYear()).padStart(4, '0'),
    String(shifted.getUTCMonth() + 1).padStart(2, '0'),
    String(shifted.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

/** Negativo se `a` vem antes de `b`, zero se iguais, positivo se depois. */
export function compareDayKeys(a: string, b: string): number {
  assertDayKey(a);
  assertDayKey(b);
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Quantidade de dias inteiros de `from` até `to` (negativa se `to` é anterior). */
export function diffInDays(from: string, to: string): number {
  assertDayKey(from);
  assertDayKey(to);
  return Math.round((dayKeyToUtcNoon(to) - dayKeyToUtcNoon(from)) / MS_PER_DAY);
}

/** O maior (mais recente) entre os dayKeys informados; ignora nulos. */
export function maxDayKey(...keys: (string | null | undefined)[]): string {
  const valid = keys.filter((k): k is string => Boolean(k));
  if (valid.length === 0) {
    throw new Error('maxDayKey precisa de ao menos um dayKey válido');
  }
  return valid.reduce((acc, key) => (compareDayKeys(key, acc) > 0 ? key : acc));
}

/** Segunda-feira da semana do `dayKey`. Usado para o XP semanal. */
export function startOfWeekKey(dayKey: string): string {
  assertDayKey(dayKey);
  const jsDay = new Date(dayKeyToUtcNoon(dayKey)).getUTCDay(); // 0 = domingo
  const daysSinceMonday = (jsDay + 6) % 7;
  return addDaysToKey(dayKey, -daysSinceMonday);
}

/** Índice do dia da semana: 0 = domingo … 6 = sábado. */
export function weekdayIndex(dayKey: string): number {
  assertDayKey(dayKey);
  return new Date(dayKeyToUtcNoon(dayKey)).getUTCDay();
}

/** Formata para exibição: '07/08 (Sex)'. */
export function formatDayKeyPtBr(dayKey: string): string {
  assertDayKey(dayKey);
  const [, month, day] = dayKey.split('-');
  return `${day}/${month} (${WEEKDAY_SHORT_PT[weekdayIndex(dayKey)]})`;
}

/**
 * Rótulo relativo amigável para cards de aula: 'Hoje', 'Amanhã', 'Ontem' ou
 * a data formatada.
 */
export function formatRelativeDayKey(dayKey: string, referenceKey: string): string {
  const delta = diffInDays(referenceKey, dayKey);
  if (delta === 0) return 'Hoje';
  if (delta === 1) return 'Amanhã';
  if (delta === -1) return 'Ontem';
  return formatDayKeyPtBr(dayKey);
}

/**
 * Instante que representa o meio-dia UTC do `dayKey`. Serve para comparar
 * dayKeys com colunas `timestamp` sem esbarrar em fronteiras de fuso.
 */
export function dayKeyToUtcNoon(dayKey: string): number {
  assertDayKey(dayKey);
  const [year, month, day] = dayKey.split('-').map(Number);
  return Date.UTC(year, month - 1, day, 12, 0, 0);
}

/** `Date` no meio-dia UTC do `dayKey` — útil como limite em queries. */
export function dayKeyToDate(dayKey: string): Date {
  return new Date(dayKeyToUtcNoon(dayKey));
}

/**
 * Offset do fuso (em ms) vigente no instante informado. Positivo a leste de
 * Greenwich. Calculado lendo o relógio de parede do fuso e comparando com o
 * instante original — é a forma portátil de obter o offset com DST aplicado.
 */
function timeZoneOffsetMs(date: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value ?? '0');
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - date.getTime();
}

/**
 * Converte um relógio de parede ("07/08/2026 às 19:00 em São Paulo") no
 * instante absoluto correspondente.
 *
 * É o inverso de `toDayKey` e existe porque a geração da grade de aulas
 * precisa gravar o horário que o admin digitou, e não o horário local do
 * processo Node — que é UTC na Vercel e BRT na máquina do dev.
 */
export function zonedWallClockToUtc(dayKey: string, time: string, tz: string = APP_TIMEZONE): Date {
  assertDayKey(dayKey);
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!match) {
    throw new Error(`Horário inválido: "${time}" (esperado 'HH:MM')`);
  }

  const [year, month, day] = dayKey.split('-').map(Number);
  const [, hours, minutes] = match;
  const naiveUtc = Date.UTC(year, month - 1, day, Number(hours), Number(minutes), 0, 0);

  // Duas passadas: a primeira usa o offset aproximado, a segunda corrige o
  // caso raro em que a aproximação cai do outro lado de uma virada de DST.
  let instant = new Date(naiveUtc - timeZoneOffsetMs(new Date(naiveUtc), tz));
  instant = new Date(naiveUtc - timeZoneOffsetMs(instant, tz));
  return instant;
}

/** Hora de parede ('19:00') de um instante, no fuso da aplicação. */
export function formatTimeInZone(date: Date, tz: string = APP_TIMEZONE): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

/**
 * "Agora mesmo", "Há 15 min", "Há 3 horas", "Ontem", "Há 4 dias", "12/08/2026".
 *
 * `now` é injetado, e não lido de `Date.now()` aqui dentro, para que a string
 * seja calculada UMA vez no servidor e chegue pronta ao cliente: se o
 * componente recalculasse na hidratação, o relógio do navegador daria um valor
 * diferente do render do servidor e o React acusaria mismatch.
 */
export function formatRelativeTime(date: Date, now: Date): string {
  const diffMs = now.getTime() - date.getTime();

  // Datas no futuro (fuso do usuário adiantado, relógio do servidor atrás)
  // não devem virar "Há -3 min".
  if (diffMs < 60_000) return 'Agora mesmo';

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `Há ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Há ${hours} ${hours === 1 ? 'hora' : 'horas'}`;

  const days = Math.floor(hours / 24);
  if (days === 1) return 'Ontem';
  if (days < 7) return `Há ${days} dias`;

  return new Intl.DateTimeFormat('pt-BR', { timeZone: APP_TIMEZONE }).format(date);
}
