import { z } from 'zod';

/**
 * ClassStatusEnum (Status da Turma)
 * Controla o ciclo de vida de uma turma de alunos.
 * 
 * ACTIVE: A turma está tendo aulas normalmente.
 * INACTIVE: Turma pausada temporariamente (ex: férias).
 * COMPLETED: O curso da turma terminou. O histórico fica salvo, mas eles não têm mais aulas novas.
 */
export const ClassStatusEnum = z.enum(['ACTIVE', 'INACTIVE', 'COMPLETED']);

export const ClassGroupSchema = z.object({
  id: z.uuid(),
  name: z.string().min(2, 'O nome da turma é obrigatório'),
  level: z.string(),
  schedule: z.string(),
  maxStudents: z.number().max(12, 'O limite é de 12 alunos').default(12),
  teacherId: z.uuid(),
  planId: z.uuid().optional(),
  status: ClassStatusEnum.default('ACTIVE'),
  createdAt: z.date(),
});

export const ClassRecordSchema = z.object({
  id: z.uuid(),
  classGroupId: z.uuid(), 
  lessonId: z.uuid(), 
  teacherId: z.uuid(), 
  date: z.date(), 
  streamVideoUrl: z.url().optional(), 
  boardContent: z.string().optional(), 
  completed: z.boolean().default(false), 
  attendance: z.array(z.uuid()), 
});
