import { LessonStatus } from './lesson.types';

export const LESSON_STATUS_LABELS: Record<LessonStatus, string> = {
  DISABLED: 'Rascunho',
  IN_PROGRESS: 'Em andamento',
  ACTIVE: 'Ativa',
};

export const LESSON_STATUS_STYLES: Record<LessonStatus, string> = {
  DISABLED: 'bg-slate-100 text-slate-500 border-slate-200',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-200',
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};
