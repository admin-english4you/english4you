import { z } from 'zod';

/**
 * PlanStatusEnum (Status do Plano de Ensino)
 * Controla a visibilidade dos pacotes inteiros de ensino (ex: "Inglês Básico 1").
 * 
 * DRAFT: O coordenador ainda está montando o plano. Não aparece para os professores.
 * ACTIVE: O plano está pronto e pode ser atrelado a turmas.
 * ARCHIVED: O plano é antigo e não é mais vendido, mas mantido no histórico.
 */
export const PlanStatusEnum = z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']);

export const PlanSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string().optional(),
  status: PlanStatusEnum.default('DRAFT'),
  createdAt: z.date(),
});

export const PlanLessonSchema = z.object({
  planId: z.uuid(),
  lessonId: z.uuid(),
  order: z.number().int().positive(),
});
