export type ReminderSlot = 'MORNING' | 'AFTERNOON' | 'EVENING';

export const REMINDER_SLOTS: ReminderSlot[] = ['MORNING', 'AFTERNOON', 'EVENING'];

interface ReminderCopy {
  title: string;
  body: string;
}

/**
 * Variações de texto por horário — sorteadas em `pickReminderCopy` pra não
 * repetir a mesma notificação todo dia. Sem tabela no banco de propósito:
 * não foi pedido um painel de edição, e mexer no texto aqui é uma linha de
 * código, não uma migração.
 */
const MORNING_VARIANTS: ReminderCopy[] = [
  { title: 'Bom dia! ☀️', body: 'Que tal começar o dia praticando seu inglês? 5 minutinhos já fazem diferença.' },
  { title: 'Hora de acordar o inglês 🧠', body: 'Seu cérebro está fresquinho — ótimo momento pra revisar o dia de hoje.' },
  { title: 'Vamos praticar?', body: 'Comece o dia com uma vitória rápida: complete a prática de hoje.' },
  { title: 'Bom dia, English4You aqui!', body: 'Antes da correria começar, que tal garantir seus pontos de hoje?' },
  { title: 'Café e inglês ☕', body: 'Enquanto o café esfria, aproveite pra treinar um pouco.' },
  { title: 'Comece bem o dia', body: 'Sua prática diária está esperando por você. Não deixe pra depois!' },
];

const AFTERNOON_VARIANTS: ReminderCopy[] = [
  { title: 'Pausa pro inglês? 📚', body: 'Que tal uma pausa na correria pra praticar um pouquinho?' },
  { title: 'Ainda dá tempo!', body: 'A tarde está passando — separe alguns minutos pra sua prática de hoje.' },
  { title: 'Respira e pratica', body: 'Um intervalo rápido de inglês pode ser o refresh que seu dia precisa.' },
  { title: 'Você ainda não praticou hoje', body: 'Não deixe o dia passar sem seus minutos de inglês.' },
  { title: 'English4You', body: 'Seu progresso está te esperando. Bora manter a sequência?' },
  { title: 'Meio da tarde, hora certa', body: 'Aproveite este momento pra revisar o que aprendeu.' },
];

const EVENING_VARIANTS: ReminderCopy[] = [
  { title: 'Antes de encerrar o dia 🌙', body: 'Complete sua prática de hoje e durma tranquilo(a).' },
  { title: 'Última chamada!', body: 'Ainda dá tempo de manter sua sequência de estudos hoje.' },
  { title: 'Boa noite (quase) 😴', body: 'Alguns minutos de inglês antes de descansar fazem toda diferença.' },
  { title: 'Não perca o dia', body: 'Falta pouco pra fechar o dia com sua prática concluída.' },
  { title: 'English4You', body: 'Que tal terminar o dia com uma vitória? Sua prática está esperando.' },
  { title: 'Hora de revisar', body: 'Feche o dia revisando o que você aprendeu hoje.' },
];

const VARIANTS_BY_SLOT: Record<ReminderSlot, ReminderCopy[]> = {
  MORNING: MORNING_VARIANTS,
  AFTERNOON: AFTERNOON_VARIANTS,
  EVENING: EVENING_VARIANTS,
};

/** Escolha aleatória simples — não precisa de distribuição uniforme garantida nem seed. */
export function pickReminderCopy(slot: ReminderSlot): ReminderCopy {
  const variants = VARIANTS_BY_SLOT[slot];
  return variants[Math.floor(Math.random() * variants.length)];
}

export function isReminderSlot(value: string | null): value is ReminderSlot {
  return value !== null && (REMINDER_SLOTS as string[]).includes(value);
}
