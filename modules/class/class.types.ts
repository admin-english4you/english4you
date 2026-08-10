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

/** Dados de um colega de turma exibíveis para outro aluno (sem e-mail/telefone). */
export type ClassmateSummary = Pick<User, 'id' | 'name' | 'avatarUrl'>;

/** Visão da turma sob a ótica do aluno: professor titular, plano e a grade dividida. */
export type StudentClassOverview = {
  classGroup: ClassGroup;
  teacher: User | null;
  plan: Plan | null;
  /** Aulas já ocorridas, da mais recente para a mais antiga. */
  pastRecords: ClassRecordDetail[];
  /** Aulas futuras, da mais próxima para a mais distante. */
  upcomingRecords: ClassRecordDetail[];
  nextRecord: ClassRecordDetail | null;
  totalLessons: number;
  completedLessons: number;
};

/** Uma aula específica aberta pelo aluno, com o professor efetivo já resolvido. */
export type StudentClassRecordDetail = ClassRecordDetail & {
  classGroup: ClassGroup;
  /** `record.teacherId` (substituto) com fallback para o titular da turma. */
  effectiveTeacher: User | null;
  classmates: ClassmateSummary[];
};

/** Aula já ministrada cuja lição está publicada — fonte dos ciclos de prática. */
export type StudentTaughtRecord = {
  record: ClassRecord;
  lesson: Lesson;
};

/** Stats + próximas aulas do professor — card do dashboard e do perfil. */
export type TeacherOverview = {
  classCount: number;
  studentCount: number;
  upcomingRecords: ClassRecordDetail[];
};

/** Turma sob a ótica do professor: roster completo + grade de aulas. Só titular. */
export type TeacherClassGroupDetail = {
  classGroup: ClassGroup;
  plan: Plan | null;
  students: ClassmateSummary[];
  records: ClassRecordDetail[];
};

/** Dados de um aluno específico exibidos no modal do roster — buscado sob demanda. */
export type TeacherStudentDetail = Pick<User, 'id' | 'name' | 'email' | 'phone' | 'avatarUrl'>;

/** Uma aula aberta pelo professor (titular OU substituto), pronta pra sala de aula. */
export type TeacherClassRecordDetail = ClassRecordDetail & {
  classGroup: ClassGroup;
  effectiveTeacher: User | null;
  students: ClassmateSummary[];
};
