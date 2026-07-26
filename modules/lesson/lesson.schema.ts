import { z } from 'zod';

/**
 * LessonStatusEnum (Status da Lição / Aula)
 * Este é um dos Enums mais importantes do seu projeto, pois ele controla a lógica de progressão do aluno e o desbloqueio da prática.
 * 
 * DISABLED: A lição está bloqueada. O aluno não consegue acessá-la pois ainda não chegou nela.
 * IN_PROGRESS: A lição atual da turma. O professor vai abrir esta lição na próxima aula ao vivo.
 * ACTIVE: A lição já foi dada pelo professor. O aluno agora pode revisar a gravação, baixar o PDF e, principalmente, fazer a Prática.
 */
export const LessonStatusEnum = z.enum(['IN_PROGRESS', 'ACTIVE', 'DISABLED']);

export const LessonSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  level: z.string(), 
  content: z.string(), 
  audioUrl: z.url().optional(),
  videoUrl: z.url().optional(),
  status: LessonStatusEnum.default('DISABLED'),
  createdAt: z.date(),
});
