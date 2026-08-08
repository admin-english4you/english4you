import type { PracticeDayStatus, PracticeMode } from '@/modules/practice/practice.types';

/** Rótulos PT-BR dos modos, espelhando o padrão de class.utils.ts. */
export const PRACTICE_MODE_LABELS: Record<PracticeMode, string> = {
  flashcard_visual: 'Flashcards',
  gap_fill_listening: 'Complete a frase',
  sentence_unscramble: 'Monte a frase',
  flashcard_recall: 'Recordação',
  quiz_comprehensive: 'Quiz de compreensão',
  listening_choice: 'Compreensão auditiva',
  review_standard: 'Revisão',
};

/** Frase curta de apoio, exibida no card do dia. */
export const PRACTICE_MODE_HINTS: Record<PracticeMode, string> = {
  flashcard_visual: 'Veja a palavra e lembre o significado.',
  gap_fill_listening: 'Ouça a palavra que falta e digite.',
  sentence_unscramble: 'Coloque as palavras na ordem certa.',
  flashcard_recall: 'Veja o significado e lembre a palavra.',
  quiz_comprehensive: 'Responda sobre o conteúdo da aula.',
  listening_choice: 'Ouça o áudio e responda.',
  review_standard: 'Revise o que você errou.',
};

export const DAY_STATUS_LABELS: Record<PracticeDayStatus, string> = {
  LOCKED_FUTURE: 'Em breve',
  AVAILABLE: 'Disponível hoje',
  COMPLETED: 'Concluído',
  EXPIRED: 'Perdido',
  REPLAYABLE: 'Liberado para refazer',
  EMPTY: 'Sem conteúdo',
};

export const DAY_STATUS_STYLES: Record<PracticeDayStatus, string> = {
  LOCKED_FUTURE: 'bg-slate-100 text-slate-500 border-slate-200',
  AVAILABLE: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  EXPIRED: 'bg-amber-50 text-amber-700 border-amber-200',
  REPLAYABLE: 'bg-violet-50 text-violet-700 border-violet-200',
  EMPTY: 'bg-slate-50 text-slate-400 border-dashed border-slate-300',
};

export function formatXp(value: number): string {
  return `${value.toLocaleString('pt-BR')} XP`;
}
