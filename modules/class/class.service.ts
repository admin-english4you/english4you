import { db } from '@/lib/db';
import { classRepository } from './class.repository';
import { userService } from '@/modules/user/user.service';
import { planService } from '@/modules/plan/plan.service';
import { lessonService } from '@/modules/lesson/lesson.service';
import { AppError } from '@/lib/errors';
import { Role } from '@/modules/user/user.types';
import { Lesson } from '@/modules/lesson/lesson.types';
import {
  ClassGroup,
  ClassGroupDetail,
  ClassGroupListItem,
  ClassRecord,
  ClassRecordDetail,
  CreateClassGroupInput,
  NewClassRecord,
  StudentClassOverview,
  StudentClassRecordDetail,
  StudentTaughtRecord,
} from './class.types';
import { ScheduleSlot, WeekdayEnum } from './class.schema';
import { addDaysToKey, todayKey, weekdayIndex, zonedWallClockToUtc } from '@/lib/date';

const WEEKDAY_ORDER = WeekdayEnum.options;

function jsDayToWeekday(jsDay: number): ScheduleSlot['weekday'] {
  // getDay(): 0 = domingo ... 6 = sábado
  const map: ScheduleSlot['weekday'][] = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  return map[jsDay];
}

/**
 * Monta o instante da aula a partir do dia e do horário do `schedule`.
 *
 * Usa o fuso da aplicação explicitamente, e não `setHours` (que usa o fuso do
 * processo Node): o Drizzle grava `timestamp` como `toISOString()` e relê como
 * UTC, então "19:00" digitado pelo admin viraria 19:00 UTC na Vercel e 19:00
 * BRT na máquina do dev — três horas de diferença, o bastante para deslocar em
 * um dia toda aula noturna e, com ela, o ciclo de prática do aluno.
 */
function combineDayKeyAndTime(dayKey: string, time: string): Date {
  return zonedWallClockToUtc(dayKey, time);
}

/**
 * Distribui as lições de um plano, em ordem, pelos dias/horários recorrentes
 * do `schedule` da turma, começando de hoje. Ver plano de implementação
 * (seção "Algoritmo de geração de ClassRecord") para a explicação completa.
 */
function buildScheduleRecords(classGroupId: string, schedule: ScheduleSlot[], lessons: Lesson[]): NewClassRecord[] {
  const sortedSlots = [...schedule].sort((a, b) => {
    const weekdayDiff = WEEKDAY_ORDER.indexOf(a.weekday) - WEEKDAY_ORDER.indexOf(b.weekday);
    return weekdayDiff !== 0 ? weekdayDiff : a.time.localeCompare(b.time);
  });

  const records: NewClassRecord[] = [];
  // O calendário é percorrido em dias do fuso da aplicação ('YYYY-MM-DD'), não
  // em Date, para que a virada de dia não dependa do fuso do processo.
  let cursor = todayKey();
  let lessonIndex = 0;

  const maxIterations = 7 * lessons.length + 14; // margem de segurança, nunca deveria ser atingido
  let iterations = 0;

  while (lessonIndex < lessons.length && iterations < maxIterations) {
    const currentWeekday = jsDayToWeekday(weekdayIndex(cursor));
    const matchingSlots = sortedSlots.filter((slot) => slot.weekday === currentWeekday);

    for (const slot of matchingSlots) {
      if (lessonIndex >= lessons.length) break;
      const lesson = lessons[lessonIndex];
      records.push({
        classGroupId,
        lessonId: lesson.id,
        teacherId: null,
        date: combineDayKeyAndTime(cursor, slot.time),
        completed: false,
        attendance: [],
      });
      lessonIndex += 1;
    }

    cursor = addDaysToKey(cursor, 1);
    iterations += 1;
  }

  return records;
}

async function generateClassRecords(classGroupId: string): Promise<void> {
  const classGroup = await classRepository.findById(classGroupId);
  if (!classGroup || !classGroup.planId) return;

  const lessons = await planService.getOrderedLessonsForPlan(classGroup.planId);
  if (lessons.length === 0) return;

  const records = buildScheduleRecords(classGroupId, classGroup.schedule, lessons);
  await classRepository.createRecords(records);
}

function assertAdmin(actingRole: Role) {
  if (actingRole !== 'ADMIN') {
    throw new AppError('Apenas administradores podem gerenciar turmas.');
  }
}

/** Somente turmas ACTIVE podem ser editadas — INACTIVE/COMPLETED são somente-leitura. */
function assertClassIsMutable(classGroup: ClassGroup) {
  if (classGroup.status !== 'ACTIVE') {
    throw new AppError('Esta turma está desativada ou arquivada e não pode ser modificada.');
  }
}

/** Libera (classGroupId = null) todos os alunos atualmente matriculados na turma, atomicamente com a troca de status. */
async function freeAllStudentsAndSetStatus(
  actingRole: Role,
  classGroupId: string,
  status: 'INACTIVE' | 'COMPLETED'
): Promise<void> {
  const students = await userService.getStudentsByClassGroupId(actingRole, classGroupId);
  const studentIds = students.map((s) => s.id);

  if (studentIds.length === 0) {
    await classRepository.updateStatus(classGroupId, status);
    return;
  }

  // neon-http não suporta db.transaction() (sessões interativas); db.batch()
  // executa as duas escritas atomicamente em uma única requisição HTTP.
  await db.batch([
    classRepository.updateStatusQuery(classGroupId, status),
    userService.bulkClearClassGroupQuery(studentIds),
  ]);
}

/**
 * Hidrata ClassRecords crus com a lição e o professor substituto.
 * As lições vêm dos ids presentes nos próprios records (não do plano atual da
 * turma), porque uma aula pode ter sido gerada por um plano que depois mudou.
 */
async function hydrateRecords(records: ClassRecord[]): Promise<ClassRecordDetail[]> {
  if (records.length === 0) return [];

  const lessonIds = Array.from(new Set(records.map((r) => r.lessonId)));
  const substituteTeacherIds = Array.from(
    new Set(records.map((r) => r.teacherId).filter((v): v is string => Boolean(v)))
  );

  const [lessons, substituteTeachers] = await Promise.all([
    lessonService.getLessonsByIds(lessonIds),
    userService.getUsersByIds(substituteTeacherIds),
  ]);

  const lessonsById = new Map(lessons.map((l) => [l.id, l]));
  const teachersById = new Map(substituteTeachers.map((t) => [t.id, t]));

  return records.map((r) => ({
    ...r,
    lesson: lessonsById.get(r.lessonId),
    teacher: r.teacherId ? teachersById.get(r.teacherId) ?? null : null,
  }));
}

/**
 * Service do módulo de Turmas (Regras de Negócio e RBAC).
 */
export const classService = {
  // ---------------------------------------------------------------------------
  // Leituras do ALUNO
  //
  // Contrato destes métodos: recebem `studentUserId`, nunca `actingRole`. Eles
  // releem o aluno do banco (via userService.getStudentById) e derivam a turma
  // dessa linha fresca — a sessão em cookie é um snapshot e pode estar obsoleta.
  // Todo id vindo da URL é validado contra a turma assim obtida.
  // ---------------------------------------------------------------------------

  /** Turma do aluno com professor, plano e a grade separada em passadas/futuras. */
  async getStudentClassOverview(studentUserId: string): Promise<StudentClassOverview | null> {
    const student = await userService.getStudentById(studentUserId);
    if (!student.classGroupId) return null;

    const classGroup = await classRepository.findById(student.classGroupId);
    if (!classGroup) return null;

    const now = new Date();
    const [teacher, plan, pastRaw, upcomingRaw] = await Promise.all([
      classGroup.teacherId ? userService.getUserById(classGroup.teacherId) : Promise.resolve(undefined),
      classGroup.planId ? planService.getPlanById(classGroup.planId) : Promise.resolve(undefined),
      classRepository.findRecordsByClassGroupIdBefore(classGroup.id, now),
      classRepository.findRecordsByClassGroupIdFrom(classGroup.id, now),
    ]);

    const [pastRecords, upcomingRecords] = await Promise.all([
      hydrateRecords(pastRaw),
      hydrateRecords(upcomingRaw),
    ]);

    return {
      classGroup,
      teacher: teacher ?? null,
      plan: plan ?? null,
      pastRecords,
      upcomingRecords,
      nextRecord: upcomingRecords[0] ?? null,
      totalLessons: pastRecords.length + upcomingRecords.length,
      completedLessons: pastRecords.length,
    };
  },

  /** Próxima aula agendada do aluno (card do perfil e do dashboard). */
  async getStudentNextClass(studentUserId: string): Promise<ClassRecordDetail | null> {
    const student = await userService.getStudentById(studentUserId);
    if (!student.classGroupId) return null;

    const record = await classRepository.findNextRecordByClassGroupId(student.classGroupId, new Date());
    if (!record) return null;

    const [hydrated] = await hydrateRecords([record]);
    return hydrated ?? null;
  },

  /**
   * Uma aula específica, validando que ela pertence à turma do aluno.
   * Devolve `null` (e não lança) para a página responder com notFound().
   */
  async getStudentClassRecord(
    studentUserId: string,
    recordId: string
  ): Promise<StudentClassRecordDetail | null> {
    const student = await userService.getStudentById(studentUserId);
    if (!student.classGroupId) return null;

    const record = await classRepository.findRecordById(recordId);
    if (!record || record.classGroupId !== student.classGroupId) return null;

    const classGroup = await classRepository.findById(record.classGroupId);
    if (!classGroup) return null;

    const [[hydrated], classmates, headTeacher] = await Promise.all([
      hydrateRecords([record]),
      userService.getClassmatesForStudent(studentUserId),
      classGroup.teacherId ? userService.getUserById(classGroup.teacherId) : Promise.resolve(undefined),
    ]);

    return {
      ...hydrated,
      classGroup,
      // Substituto tem precedência; sem ele, o titular da turma.
      effectiveTeacher: hydrated.teacher ?? headTeacher ?? null,
      classmates,
    };
  },

  /**
   * Aulas já ministradas cuja lição está publicada — é a partir daqui que os
   * ciclos de prática são construídos.
   *
   * ATENÇÃO: o filtro é `date < agora` + `lesson.status === 'ACTIVE'`, e NÃO
   * `record.completed`. A coluna `completed` nunca é marcada como true em lugar
   * nenhum do código: não existe fluxo de "encerrar aula" do professor. Quando
   * esse fluxo existir, este filtro deve ser revisto para usá-la.
   */
  async getStudentTaughtRecords(studentUserId: string): Promise<StudentTaughtRecord[]> {
    const student = await userService.getStudentById(studentUserId);
    if (!student.classGroupId) return [];

    const records = await classRepository.findRecordsByClassGroupIdBefore(student.classGroupId, new Date());
    if (records.length === 0) return [];

    const lessons = await lessonService.getLessonsByIds(
      Array.from(new Set(records.map((r) => r.lessonId)))
    );
    const lessonsById = new Map(lessons.map((l) => [l.id, l]));

    return records
      .map((record) => ({ record, lesson: lessonsById.get(record.lessonId) }))
      .filter((entry): entry is StudentTaughtRecord => entry.lesson?.status === 'ACTIVE');
  },

  async createClass(actingRole: Role, data: CreateClassGroupInput): Promise<ClassGroup> {
    assertAdmin(actingRole);
    return await classRepository.create({
      name: data.name,
      level: data.level,
      schedule: data.schedule,
      teacherId: null,
      planId: null,
      status: 'ACTIVE',
    });
  },

  async getAllClasses(actingRole: Role): Promise<ClassGroupListItem[]> {
    assertAdmin(actingRole);
    const classes = await classRepository.findAll();
    const teacherIds = Array.from(new Set(classes.map((c) => c.teacherId).filter((v): v is string => Boolean(v))));

    const [counts, teachers] = await Promise.all([
      userService.countStudentsByClassGroupIds(actingRole, classes.map((c) => c.id)),
      userService.getUsersByIds(teacherIds),
    ]);
    const teachersById = new Map(teachers.map((t) => [t.id, t]));

    return classes.map((c) => ({
      ...c,
      enrolledCount: counts[c.id] ?? 0,
      teacher: c.teacherId ? teachersById.get(c.teacherId) ?? null : null,
    }));
  },

  async getClassById(actingRole: Role, id: string): Promise<ClassGroupDetail | undefined> {
    assertAdmin(actingRole);
    const classGroup = await classRepository.findById(id);
    if (!classGroup) return undefined;

    const [teacher, plan, students, records] = await Promise.all([
      classGroup.teacherId ? userService.getUserById(classGroup.teacherId) : Promise.resolve(undefined),
      classGroup.planId ? planService.getPlanById(classGroup.planId) : Promise.resolve(undefined),
      userService.getStudentsByClassGroupId(actingRole, id),
      classRepository.findRecordsByClassGroupId(id),
    ]);

    return {
      ...classGroup,
      teacher: teacher ?? null,
      plan: plan ?? null,
      students,
      records: await hydrateRecords(records),
    };
  },

  async getOtherActiveClasses(actingRole: Role, excludeClassGroupId: string): Promise<ClassGroup[]> {
    assertAdmin(actingRole);
    return await classRepository.findOtherActive(excludeClassGroupId);
  },

  async updateBasicInfo(
    actingRole: Role,
    classGroupId: string,
    data: Partial<Pick<ClassGroup, 'name' | 'level' | 'schedule'>>
  ): Promise<ClassGroup> {
    assertAdmin(actingRole);

    const classGroup = await classRepository.findById(classGroupId);
    if (!classGroup) {
      throw new AppError('Turma não encontrada.');
    }
    assertClassIsMutable(classGroup);

    if (data.schedule) {
      const existingRecords = await classRepository.findRecordsByClassGroupId(classGroupId);
      if (existingRecords.some((r) => !r.completed)) {
        throw new AppError(
          'Não é possível alterar o horário: existem aulas ainda não concluídas. Reatribua o plano de ensino depois de ajustar o horário para regerar a grade.'
        );
      }
    }

    return await classRepository.updateBasic(classGroupId, data);
  },

  async assignTeacher(actingRole: Role, classGroupId: string, teacherId: string): Promise<ClassGroup> {
    assertAdmin(actingRole);

    const classGroup = await classRepository.findById(classGroupId);
    if (!classGroup) {
      throw new AppError('Turma não encontrada.');
    }
    assertClassIsMutable(classGroup);

    const teacher = await userService.getUserById(teacherId);
    if (!teacher || teacher.role !== 'TEACHER') {
      throw new AppError('Selecione um professor válido.');
    }
    return await classRepository.updateTeacher(classGroupId, teacherId);
  },

  async assignPlan(actingRole: Role, classGroupId: string, planId: string): Promise<ClassGroup> {
    assertAdmin(actingRole);

    const classGroup = await classRepository.findById(classGroupId);
    if (!classGroup) {
      throw new AppError('Turma não encontrada.');
    }
    assertClassIsMutable(classGroup);

    const plan = await planService.getPlanById(planId);
    if (!plan || plan.status !== 'ACTIVE') {
      throw new AppError('Selecione um plano de ensino ativo.');
    }

    const existingRecords = await classRepository.findRecordsByClassGroupId(classGroupId);
    if (existingRecords.some((r) => r.completed)) {
      throw new AppError('Não é possível trocar o plano: já existem aulas concluídas registradas nesta turma.');
    }

    await classRepository.deleteNonCompletedRecords(classGroupId);
    const updated = await classRepository.updatePlan(classGroupId, planId);
    await generateClassRecords(classGroupId);
    return updated;
  },

  async addStudent(actingRole: Role, classGroupId: string, studentId: string): Promise<void> {
    assertAdmin(actingRole);

    const classGroup = await classRepository.findById(classGroupId);
    if (!classGroup) {
      throw new AppError('Turma não encontrada.');
    }
    assertClassIsMutable(classGroup);

    const student = await userService.getUserById(studentId);
    if (!student || student.role !== 'STUDENT') {
      throw new AppError('Selecione um aluno válido.');
    }

    if (student.classGroupId && student.classGroupId !== classGroupId) {
      throw new AppError('Este aluno já pertence a outra turma. Use a opção Transferir.');
    }

    const currentCount = await userService.countStudentsInClassGroup(actingRole, classGroupId);
    if (currentCount >= classGroup.maxStudents) {
      throw new AppError('Turma já atingiu o limite de alunos.');
    }

    await userService.assignClassGroup(actingRole, studentId, classGroupId);
  },

  async removeStudent(actingRole: Role, classGroupId: string, studentId: string): Promise<void> {
    assertAdmin(actingRole);

    const classGroup = await classRepository.findById(classGroupId);
    if (!classGroup) {
      throw new AppError('Turma não encontrada.');
    }
    assertClassIsMutable(classGroup);

    const student = await userService.getUserById(studentId);
    if (!student || student.classGroupId !== classGroupId) {
      throw new AppError('Este aluno não pertence a esta turma.');
    }

    await userService.clearClassGroup(actingRole, studentId);
  },

  async transferStudent(actingRole: Role, studentId: string, targetClassGroupId: string): Promise<void> {
    assertAdmin(actingRole);

    const student = await userService.getUserById(studentId);
    if (!student || student.role !== 'STUDENT') {
      throw new AppError('Aluno inválido.');
    }

    const targetClass = await classRepository.findById(targetClassGroupId);
    if (!targetClass || targetClass.status !== 'ACTIVE') {
      throw new AppError('Turma de destino inválida ou inativa.');
    }

    const currentCount = await userService.countStudentsInClassGroup(actingRole, targetClassGroupId);
    if (currentCount >= targetClass.maxStudents) {
      throw new AppError('Turma de destino está com o limite de alunos atingido.');
    }

    // Sobrescrever o classGroupId é o único passo necessário: toda leitura de
    // aulas/material do aluno passa a refletir a nova turma automaticamente.
    await userService.assignClassGroup(actingRole, studentId, targetClassGroupId);
  },

  async deactivateClass(actingRole: Role, classGroupId: string): Promise<void> {
    assertAdmin(actingRole);

    const classGroup = await classRepository.findById(classGroupId);
    if (!classGroup) {
      throw new AppError('Turma não encontrada.');
    }
    if (classGroup.status !== 'ACTIVE') {
      throw new AppError('Apenas turmas ativas podem ser desativadas.');
    }

    await freeAllStudentsAndSetStatus(actingRole, classGroupId, 'INACTIVE');
  },

  /**
   * Reverte uma desativação: volta a turma para ACTIVE. Não restaura os alunos
   * que foram desvinculados ao desativar — eles precisam ser readicionados manualmente.
   */
  async reactivateClass(actingRole: Role, classGroupId: string): Promise<ClassGroup> {
    assertAdmin(actingRole);

    const classGroup = await classRepository.findById(classGroupId);
    if (!classGroup) {
      throw new AppError('Turma não encontrada.');
    }
    if (classGroup.status !== 'INACTIVE') {
      throw new AppError('Apenas turmas desativadas podem ser reativadas.');
    }

    return await classRepository.updateStatus(classGroupId, 'ACTIVE');
  },

  /**
   * Arquiva a turma permanentemente (status COMPLETED). Turmas não são deletadas
   * para preservar o histórico; uma turma arquivada é somente-leitura e não pode
   * ser reativada. Se ainda houver alunos matriculados (arquivamento direto a
   * partir de ACTIVE), eles são liberados junto, como na desativação.
   */
  async archiveClass(actingRole: Role, classGroupId: string): Promise<void> {
    assertAdmin(actingRole);

    const classGroup = await classRepository.findById(classGroupId);
    if (!classGroup) {
      throw new AppError('Turma não encontrada.');
    }
    if (classGroup.status === 'COMPLETED') {
      throw new AppError('Esta turma já está arquivada.');
    }

    await freeAllStudentsAndSetStatus(actingRole, classGroupId, 'COMPLETED');
  },

  async assignSubstituteTeacher(actingRole: Role, classRecordId: string, teacherId: string): Promise<ClassRecord> {
    assertAdmin(actingRole);

    const record = await classRepository.findRecordById(classRecordId);
    if (!record) {
      throw new AppError('Aula não encontrada.');
    }

    const classGroup = await classRepository.findById(record.classGroupId);
    if (!classGroup) {
      throw new AppError('Turma não encontrada.');
    }
    assertClassIsMutable(classGroup);

    const teacher = await userService.getUserById(teacherId);
    if (!teacher || teacher.role !== 'TEACHER') {
      throw new AppError('Selecione um professor válido.');
    }

    return await classRepository.updateRecordTeacher(classRecordId, teacherId);
  },
};
