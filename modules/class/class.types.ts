import { z } from 'zod';
import {
  ClassGroupSchema,
  ClassRecordSchema,
  ClassStatusEnum,
  CreateClassGroupSchema,
  classGroupsTable,
  classRecordsTable,
} from './class.schema';
import { User } from '@/modules/user/user.types';
import { Plan } from '@/modules/plan/plan.types';
import { Lesson } from '@/modules/lesson/lesson.types';

export type ClassStatus = z.infer<typeof ClassStatusEnum>;
export type ClassGroup = z.infer<typeof ClassGroupSchema>;
export type ClassRecord = z.infer<typeof ClassRecordSchema>;
export type NewClassGroup = typeof classGroupsTable.$inferInsert;
export type NewClassRecord = typeof classRecordsTable.$inferInsert;

/** Tipo usado pelo formulário (React Hook Form) de criação de turma. */
export type CreateClassGroupInput = z.input<typeof CreateClassGroupSchema>;

/** Turma com contagem de alunos matriculados e professor resolvido, usada na listagem. */
export type ClassGroupListItem = ClassGroup & { enrolledCount: number; teacher: User | null };

/** Uma aula (ClassRecord) já resolvida com a lição e o professor substituto (se houver). */
export type ClassRecordDetail = ClassRecord & {
  lesson: Lesson | undefined;
  teacher: User | null;
};

/** View completa de uma turma para a página de detalhes. */
export type ClassGroupDetail = ClassGroup & {
  teacher: User | null;
  plan: Plan | null;
  students: User[];
  records: ClassRecordDetail[];
};
