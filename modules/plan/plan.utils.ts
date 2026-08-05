import { PlanStatus } from './plan.types';

export const PLAN_STATUS_LABELS: Record<PlanStatus, string> = {
  DRAFT: 'Rascunho',
  ACTIVE: 'Ativo',
  ARCHIVED: 'Arquivado',
};

export const PLAN_STATUS_STYLES: Record<PlanStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-500 border-slate-200',
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  ARCHIVED: 'bg-amber-50 text-amber-700 border-amber-200',
};
