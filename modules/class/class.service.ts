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
  PendingRecordingView,
  StudentClassOverview,
  StudentClassRecordDetail,
  StudentTaughtRecord,
  TeacherClassGroupDetail,
  TeacherClassRecordDetail,
  TeacherOverview,
  TeacherStudentDetail,
} from './class.types';
import { ScheduleSlot, WeekdayEnum } from './class.schema';
import { addDaysToKey, todayKey, weekdayIndex, zonedWallClockToUtc } from '@/lib/date';
import {
  CallAccess,
  endStreamCall,
  ensureCallAndGenerateToken,
  recordingAvailableUntil,
  startCallRecording,
  stopCallRecording,
} from '@/lib/stream-server';
import { notificationService } from '@/modules/notification/notification.service';
import { sendClassRecordingEmail } from '@/lib/resend';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { uploadBufferToStorage, deleteStorageFileByUrl, fetchExternalImage } from '@/lib/storage-upload';
import crypto from 'crypto';

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

const CALL_MAX_DURATION_MS = 2 * 60 * 60 * 1000; // 2 horas

/**
 * Fecha sozinha uma chamada esquecida ao vivo — sem infra de cron neste
 * projeto, a checagem é "preguiçosa": roda toda vez que o registro é lido
 * (reload da página do professor, poll do aluno), não num timer real. Cobre
 * o caso do professor perder internet/energia e nunca clicar em "Encerrar
 * aula": sem isto, `callStartedAt` != null + `completed` = false ficaria
 * válido pra sempre, e a sala pareceria "ao vivo" indefinidamente.
 */
async function closeIfExpired(record: ClassRecord): Promise<ClassRecord> {
  if (!record.callStartedAt || record.completed) return record;
  if (Date.now() - record.callStartedAt.getTime() < CALL_MAX_DURATION_MS) return record;

  await stopCallRecording(record.id);
  await endStreamCall(record.id);
  return await classRepository.updateRecordCompleted(record.id, true);
}

/**
 * Espelha quem pode ler/escrever o board ao vivo desta aula no Realtime
 * Database — só a lista de ids gravada aqui pelo servidor (via Admin SDK,
 * que ignora as regras) é que as regras em database.rules.json aceitam como
 * membro; o client nunca escreve este nó diretamente. Best-effort: refeito a
 * cada leitura da aula (self-healing se um aluno for removido/adicionado
 * depois), nunca lança se o RTDB não estiver configurado.
 */
async function syncBoardMembers(recordId: string, memberIds: string[]): Promise<void> {
  if (!adminDb) return;
  const members: Record<string, true> = {};
  for (const id of memberIds) members[id] = true;
  try {
    await adminDb.ref(`class-boards/${recordId}/members`).set(members);
  } catch {
    // Best-effort — ver docblock acima.
  }
}

/** Titular OU substituto: substituto (record.teacherId) tem precedência sobre o titular da turma. */
function isTeacherOfRecord(teacherId: string, record: ClassRecord, classGroup: ClassGroup): boolean {
  return record.teacherId === teacherId || (!record.teacherId && classGroup.teacherId === teacherId);
}

/** Monta o acesso à call (apiKey + token + callId), com o roster completo como membros. */
async function buildCallAccess(
  record: ClassRecord,
  classGroup: ClassGroup,
  requestingUserId: string
): Promise<CallAccess | null> {
  const [students, effectiveTeacher] = await Promise.all([
    userService.getStudentsByClassGroupIdForTeacher(classGroup.id),
    classGroup.teacherId ? userService.getUserById(classGroup.teacherId) : Promise.resolve(undefined),
  ]);
  const effectiveTeacherId = record.teacherId ?? classGroup.teacherId ?? requestingUserId;

  const memberUserIds = Array.from(new Set([effectiveTeacherId, ...students.map((s) => s.id)]));

  // Todo membro citado na call precisa existir do lado do Stream primeiro.
  const users = [
    { id: effectiveTeacherId, name: effectiveTeacher?.name, image: effectiveTeacher?.avatarUrl },
    ...students.map((s) => ({ id: s.id, name: s.name, image: s.avatarUrl })),
  ];

  return await ensureCallAndGenerateToken({
    recordId: record.id,
    userId: requestingUserId,
    memberUserIds,
    createdByUserId: effectiveTeacherId,
    users,
  });
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

    const rawRecord = await classRepository.findRecordById(recordId);
    if (!rawRecord || rawRecord.classGroupId !== student.classGroupId) return null;
    const record = await closeIfExpired(rawRecord);

    const classGroup = await classRepository.findById(record.classGroupId);
    if (!classGroup) return null;

    const [[hydrated], classmates, headTeacher] = await Promise.all([
      hydrateRecords([record]),
      userService.getClassmatesForStudent(studentUserId),
      classGroup.teacherId ? userService.getUserById(classGroup.teacherId) : Promise.resolve(undefined),
    ]);

    const effectiveTeacherId = record.teacherId ?? classGroup.teacherId;
    await syncBoardMembers(recordId, [
      student.id,
      ...classmates.map((c) => c.id),
      ...(effectiveTeacherId ? [effectiveTeacherId] : []),
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

  // ---------------------------------------------------------------------------
  // Leituras/escritas do PROFESSOR
  //
  // Mesmo contrato do bloco do aluno: recebem `teacherUserId`, nunca
  // `actingRole`. Releem o professor fresco (userService.getTeacherById) e
  // validam posse antes de qualquer leitura/escrita ligada a uma turma/aula.
  // Devolvem `null`/`undefined` (não lançam) quando o recurso não existe ou
  // não pertence a este professor, para a página chamar notFound().
  // ---------------------------------------------------------------------------

  /** Stats do professor: quantas turmas titulares + próximas 3 aulas (titular ou substituto). */
  async getTeacherClassesOverview(teacherUserId: string): Promise<TeacherOverview> {
    const teacher = await userService.getTeacherById(teacherUserId);

    const [titularClasses, upcomingRaw] = await Promise.all([
      classRepository.findByTeacherId(teacher.id),
      classRepository.findUpcomingRecordsForTeacher(teacher.id, new Date(), 3),
    ]);

    const studentCounts = await userService.countStudentsByClassGroupIds(
      'TEACHER' as Role,
      titularClasses.map((c) => c.id)
    );
    const studentCount = Object.values(studentCounts).reduce((sum, n) => sum + n, 0);

    return {
      classCount: titularClasses.length,
      studentCount,
      upcomingRecords: await hydrateRecords(upcomingRaw),
    };
  },

  /** Lista de turmas titulares do professor, com contagem de alunos — cards de /teacher/classes. */
  async getTeacherClasses(teacherUserId: string): Promise<ClassGroupListItem[]> {
    const teacher = await userService.getTeacherById(teacherUserId);
    const classes = await classRepository.findByTeacherId(teacher.id);
    if (classes.length === 0) return [];

    const counts = await userService.countStudentsByClassGroupIds(
      'TEACHER' as Role,
      classes.map((c) => c.id)
    );

    return classes.map((c) => ({ ...c, enrolledCount: counts[c.id] ?? 0, teacher }));
  },

  /** Turma + roster + grade de aulas — só titular (substituição pontual não abre este detalhe). */
  async getTeacherClassDetail(
    teacherUserId: string,
    classGroupId: string
  ): Promise<TeacherClassGroupDetail | null> {
    const teacher = await userService.getTeacherById(teacherUserId);
    const classGroup = await classRepository.findById(classGroupId);
    if (!classGroup || classGroup.teacherId !== teacher.id) return null;

    const [plan, students, records] = await Promise.all([
      classGroup.planId ? planService.getPlanById(classGroup.planId) : Promise.resolve(undefined),
      userService.getStudentsByClassGroupIdForTeacher(classGroupId),
      classRepository.findRecordsByClassGroupId(classGroupId),
    ]);

    return {
      classGroup,
      plan: plan ?? null,
      students,
      records: await hydrateRecords(records),
    };
  },

  /**
   * Dados de PII de um aluno específico, buscados sob demanda ao abrir o
   * modal — nunca pré-carregados na lista do roster (ver justificativa em
   * getTeacherStudentDetailAction). Valida que o aluno pertence a uma turma
   * TITULAR deste professor antes de expor e-mail/telefone.
   */
  async getTeacherClassStudentDetail(
    teacherUserId: string,
    classGroupId: string,
    studentId: string
  ): Promise<TeacherStudentDetail | null> {
    const teacher = await userService.getTeacherById(teacherUserId);
    const classGroup = await classRepository.findById(classGroupId);
    if (!classGroup || classGroup.teacherId !== teacher.id) return null;

    const student = await userService.getUserById(studentId);
    if (!student || student.classGroupId !== classGroupId) return null;

    const { id, name, email, phone, avatarUrl } = student;
    return { id, name, email, phone, avatarUrl };
  },

  /** Uma aula específica, aberta pelo professor titular OU substituto desta ocorrência. */
  async getTeacherClassRecord(
    teacherUserId: string,
    recordId: string
  ): Promise<TeacherClassRecordDetail | null> {
    const teacher = await userService.getTeacherById(teacherUserId);
    const rawRecord = await classRepository.findRecordById(recordId);
    if (!rawRecord) return null;
    const record = await closeIfExpired(rawRecord);

    const classGroup = await classRepository.findById(record.classGroupId);
    if (!classGroup || !isTeacherOfRecord(teacher.id, record, classGroup)) return null;

    const [[hydrated], students, headTeacher] = await Promise.all([
      hydrateRecords([record]),
      userService.getStudentsByClassGroupIdForTeacher(classGroup.id),
      classGroup.teacherId ? userService.getUserById(classGroup.teacherId) : Promise.resolve(undefined),
    ]);

    const effectiveTeacherId = record.teacherId ?? classGroup.teacherId ?? teacher.id;
    await syncBoardMembers(recordId, [effectiveTeacherId, ...students.map((s) => s.id)]);

    return {
      ...hydrated,
      classGroup,
      effectiveTeacher: hydrated.teacher ?? headTeacher ?? null,
      students,
    };
  },

  /** Acesso à call pro professor — `null` se a chamada ainda não foi iniciada. */
  async getTeacherCallAccess(teacherUserId: string, recordId: string): Promise<CallAccess | null> {
    const teacher = await userService.getTeacherById(teacherUserId);
    const rawRecord = await classRepository.findRecordById(recordId);
    if (!rawRecord) return null;
    const record = await closeIfExpired(rawRecord);

    const classGroup = await classRepository.findById(record.classGroupId);
    if (!classGroup || !isTeacherOfRecord(teacher.id, record, classGroup)) return null;
    // `completed` também trava aqui, não só `callStartedAt`: a aula pode já
    // ter sido iniciada e encerrada (ou estar aguardando reabertura depois de
    // uma queda), e nesse meio-tempo não faz sentido devolver acesso a uma
    // call que ninguém está ativamente usando.
    if (!record.callStartedAt || record.completed) return null;

    return await buildCallAccess(record, classGroup, teacher.id);
  },

  /** Acesso à call pro aluno — `null` se a aula não é da turma dele ou a chamada não está ao vivo agora. */
  async getStudentCallAccess(studentUserId: string, recordId: string): Promise<CallAccess | null> {
    const student = await userService.getStudentById(studentUserId);
    if (!student.classGroupId) return null;

    const rawRecord = await classRepository.findRecordById(recordId);
    if (!rawRecord || rawRecord.classGroupId !== student.classGroupId) return null;
    const record = await closeIfExpired(rawRecord);
    if (!record.callStartedAt || record.completed) return null;

    const classGroup = await classRepository.findById(record.classGroupId);
    if (!classGroup) return null;

    return await buildCallAccess(record, classGroup, student.id);
  },

  /**
   * (Re)inicia a chamada: provisiona a call no Stream (idempotente — mesma
   * call determinística, `getOrCreate`) e volta `completed` para `false`.
   *
   * O professor pode chamar isto QUANTAS VEZES precisar para a mesma aula —
   * internet ou energia podem cair no meio da aula, e reabrir precisa
   * funcionar sem fricção. Como o `callId` é determinístico
   * (`class-record-${recordId}`), reabrir sempre volta pra MESMA call no
   * Stream: novas gravações se somam às anteriores (ver `appendRecordingUrl`),
   * nunca substituem.
   *
   * NÃO liga a gravação aqui — `call.startRecording()` do Stream exige uma
   * sessão ativa (alguém já conectado via WebRTC), e neste ponto ninguém
   * entrou ainda. A gravação começa em `startCallRecordingForRecord`,
   * chamado pelo client assim que o próprio professor efetivamente entra na
   * chamada (mesmo raciocínio de `markStudentAttendance`: o gatilho real é o
   * join, não o clique em "iniciar").
   */
  async startCall(teacherUserId: string, recordId: string): Promise<{ record: ClassRecord } & CallAccess> {
    const teacher = await userService.getTeacherById(teacherUserId);
    const record = await classRepository.findRecordById(recordId);
    if (!record) throw new AppError('Aula não encontrada.');

    const classGroup = await classRepository.findById(record.classGroupId);
    if (!classGroup || !isTeacherOfRecord(teacher.id, record, classGroup)) {
      throw new AppError('Você não tem permissão para iniciar esta aula.');
    }

    const access = await buildCallAccess(record, classGroup, teacher.id);
    if (!access) throw new AppError('Serviço de vídeo não configurado no servidor.');

    const updated = await classRepository.reopenCall(recordId);

    return { record: updated, ...access };
  },

  /**
   * Liga a gravação — chamado pelo client (hooks/useStreamCall) assim que o
   * PRÓPRIO professor entra de fato na call. Idempotente do lado do Stream
   * (chamar de novo com uma gravação já ativa não duplica nada); erros são
   * best-effort (ver `startCallRecording` em lib/stream-server.ts).
   */
  async startCallRecordingForRecord(teacherUserId: string, recordId: string): Promise<void> {
    const teacher = await userService.getTeacherById(teacherUserId);
    const record = await classRepository.findRecordById(recordId);
    if (!record) throw new AppError('Aula não encontrada.');

    const classGroup = await classRepository.findById(record.classGroupId);
    if (!classGroup || !isTeacherOfRecord(teacher.id, record, classGroup)) {
      throw new AppError('Você não tem permissão para gravar esta aula.');
    }

    await startCallRecording(recordId);
  },

  /** Encerra a aula: desliga gravação e a call no Stream (best-effort) e marca concluída. */
  async endCall(teacherUserId: string, recordId: string): Promise<ClassRecord> {
    const teacher = await userService.getTeacherById(teacherUserId);
    const record = await classRepository.findRecordById(recordId);
    if (!record) throw new AppError('Aula não encontrada.');

    const classGroup = await classRepository.findById(record.classGroupId);
    if (!classGroup || !isTeacherOfRecord(teacher.id, record, classGroup)) {
      throw new AppError('Você não tem permissão para encerrar esta aula.');
    }

    // `completed` é marcado ANTES de derrubar a call no Stream, não depois:
    // `endStreamCall` desconecta quem estiver conectado quase imediatamente,
    // e o client do aluno reage a isso revalidando o acesso (ver
    // VideoPanel.tsx). Se o Postgres só fosse atualizado depois, essa
    // revalidação podia chegar primeiro e ainda ler `completed: false`,
    // recebendo um acesso novo (`buildCallAccess` -> `getOrCreate`) que
    // reabre a call que acabou de ser encerrada.
    //
    // Sem early-return se já completed: encerrar precisa ser sempre seguro de
    // chamar de novo (ex: reabriu e encerrou de novo) — o update em si já é
    // idempotente (setar true quando já é true não muda nada).
    const updated = await classRepository.updateRecordCompleted(recordId, true);
    await stopCallRecording(recordId);
    await endStreamCall(recordId);

    return updated;
  },

  /** Salva as anotações desta ocorrência da aula — isolado de lessons.content. */
  async updateRecordBoard(teacherUserId: string, recordId: string, boardContent: string): Promise<ClassRecord> {
    const teacher = await userService.getTeacherById(teacherUserId);
    const record = await classRepository.findRecordById(recordId);
    if (!record) throw new AppError('Aula não encontrada.');

    const classGroup = await classRepository.findById(record.classGroupId);
    if (!classGroup || !isTeacherOfRecord(teacher.id, record, classGroup)) {
      throw new AppError('Você não tem permissão para editar esta aula.');
    }

    return await classRepository.updateRecordBoard(recordId, boardContent);
  },

  /**
   * Sobe uma imagem colada/arrastada diretamente no board da aula (clipboard
   * ou blob já convertido pelo client) e devolve a URL pública. Mesmo padrão
   * de `lessonService.uploadContentImage`, só que guardada sob
   * `class-boards/{recordId}/` em vez de `lessons/{lessonId}/` — não mexe em
   * `boardContent`, quem embute a URL no HTML é o editor.
   */
  async uploadBoardContentImage(teacherUserId: string, recordId: string, file: File): Promise<string> {
    const teacher = await userService.getTeacherById(teacherUserId);
    const record = await classRepository.findRecordById(recordId);
    if (!record) throw new AppError('Aula não encontrada.');

    const classGroup = await classRepository.findById(record.classGroupId);
    if (!classGroup || !isTeacherOfRecord(teacher.id, record, classGroup)) {
      throw new AppError('Você não tem permissão para editar esta aula.');
    }

    const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
    const filePath = `class-boards/${recordId}/content_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${extension}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    return await uploadBufferToStorage(filePath, buffer, file.type || 'image/png');
  },

  /** Baixa uma imagem externa colada no board e reenvia pro nosso Storage — mesmo motivo de `lessonService.rehostContentImage`. */
  async rehostBoardContentImage(teacherUserId: string, recordId: string, sourceUrl: string): Promise<string> {
    const teacher = await userService.getTeacherById(teacherUserId);
    const record = await classRepository.findRecordById(recordId);
    if (!record) throw new AppError('Aula não encontrada.');

    const classGroup = await classRepository.findById(record.classGroupId);
    if (!classGroup || !isTeacherOfRecord(teacher.id, record, classGroup)) {
      throw new AppError('Você não tem permissão para editar esta aula.');
    }

    const { buffer, contentType, extension } = await fetchExternalImage(sourceUrl);
    const filePath = `class-boards/${recordId}/content_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${extension}`;
    return await uploadBufferToStorage(filePath, buffer, contentType);
  },

  /** Apaga (best-effort) imagens do board que foram removidas do editor, só as desta aula. */
  async deleteBoardContentImages(teacherUserId: string, recordId: string, imageUrls: string[]): Promise<void> {
    const teacher = await userService.getTeacherById(teacherUserId);
    const record = await classRepository.findRecordById(recordId);
    if (!record) throw new AppError('Aula não encontrada.');

    const classGroup = await classRepository.findById(record.classGroupId);
    if (!classGroup || !isTeacherOfRecord(teacher.id, record, classGroup)) {
      throw new AppError('Você não tem permissão para editar esta aula.');
    }

    const ownImages = imageUrls.filter((url) => url.includes(`/class-boards/${recordId}/content_`));
    await Promise.all(ownImages.map((url) => deleteStorageFileByUrl(url)));
  },

  /**
   * Token do Firebase Auth (custom token, mesmo uid do usuário) pro board ao
   * vivo desta aula — a sessão desta plataforma é cookie próprio (ver
   * lib/auth-server.ts), não Firebase Auth, então sem isto o client nunca
   * tem `auth != null` e as regras em database.rules.json barram tudo
   * (permission_denied tanto pra ler quanto pra escrever). O client troca
   * este token por uma sessão do Firebase antes de assinar/publicar o canal
   * (ver lib/realtime-board.ts).
   *
   * `null` se o Admin SDK não estiver configurado ou o usuário ainda não for
   * membro sincronizado deste board (ver `syncBoardMembers` — só populado
   * depois que a página da sala já carregou uma vez pro professor ou aluno) —
   * a própria checagem de membro aqui é defesa em profundidade, já que as
   * regras do RTDB fariam o mesmo bloqueio no path do conteúdo de qualquer
   * forma.
   */
  async getBoardAuthToken(userId: string, recordId: string): Promise<string | null> {
    if (!adminAuth || !adminDb) return null;
    const snapshot = await adminDb.ref(`class-boards/${recordId}/members/${userId}`).once('value');
    if (!snapshot.exists()) return null;
    return await adminAuth.createCustomToken(userId);
  },

  /** Marca presença automática do aluno ao entrar de fato na chamada. Idempotente. */
  async markStudentAttendance(studentUserId: string, recordId: string): Promise<void> {
    const student = await userService.getStudentById(studentUserId);
    const record = await classRepository.findRecordById(recordId);
    if (!record || record.classGroupId !== student.classGroupId) {
      throw new AppError('Esta aula não está disponível para você.');
    }

    await classRepository.appendAttendanceIfMissing(recordId, student.id);
  },

  /**
   * Ativa a lição desta aula manualmente, a pedido do professor — nunca
   * automático ao encerrar a chamada (uma chamada que caiu não deve travar
   * nada). A checagem de posse aqui é o único portão de "este professor pode
   * ativar esta lição"; as travas de conteúdo em si vivem no lessonService.
   */
  async activateLessonForRecord(teacherUserId: string, recordId: string): Promise<Lesson> {
    const teacher = await userService.getTeacherById(teacherUserId);
    const record = await classRepository.findRecordById(recordId);
    if (!record) throw new AppError('Aula não encontrada.');

    const classGroup = await classRepository.findById(record.classGroupId);
    if (!classGroup || !isTeacherOfRecord(teacher.id, record, classGroup)) {
      throw new AppError('Você não tem permissão para ativar a lição desta aula.');
    }

    return await lessonService.activateLessonAsTeacher('TEACHER', record.lessonId);
  },

  /**
   * Ponto de entrada do webhook — sem sessão/actingRole, chamado só pela rota
   * app/api/webhooks/stream. Grava a URL da gravação e notifica a turma.
   */
  async handleRecordingReady(recordId: string, recordingUrl: string): Promise<void> {
    // Acrescenta ao array — nunca sobrescreve. Uma aula pode ter sido aberta
    // e fechada várias vezes (queda de conexão), cada sessão gera seu próprio
    // segmento, e todos pertencem à mesma aula.
    await classRepository.appendRecordingUrl(recordId, recordingUrl);

    const record = await classRepository.findRecordById(recordId);
    if (!record) return;
    const classGroup = await classRepository.findById(record.classGroupId);
    if (!classGroup) return;

    const [lessons, studentSummaries] = await Promise.all([
      lessonService.getLessonsByIds([record.lessonId]),
      userService.getStudentsByClassGroupIdForTeacher(classGroup.id),
    ]);
    const lessonTitle = lessons[0]?.title ?? 'Aula';
    const studentIds = studentSummaries.map((s) => s.id);
    if (studentIds.length === 0) return;

    const link = `/student/classes/${recordId}`;
    await notificationService.notifyUsers(studentIds, {
      type: 'CLASS_RECORDING_READY',
      title: 'Gravação disponível',
      body: `A gravação da aula "${lessonTitle}" (${classGroup.name}) já está disponível para assistir.`,
      link,
    });

    // O prazo conta do momento em que a gravação ficou pronta — é quando ela
    // passa a existir no bucket do Stream.
    const availableUntil = recordingAvailableUntil();

    const students = await userService.getUsersByIds(studentIds);
    await Promise.all(
      students
        .filter((s) => s.email)
        .map((s) =>
          sendClassRecordingEmail({
            email: s.email,
            studentName: s.name,
            className: classGroup.name,
            lessonTitle,
            recordingUrl: `${process.env.APP_URL ?? 'http://localhost:3000'}${link}`,
            availableUntil,
          })
        )
    );
  },

  /** Rede de segurança: se "Encerrar aula" falhou mas a call terminou mesmo assim, marca concluída. */
  async handleCallEndedWebhook(recordId: string): Promise<void> {
    const record = await classRepository.findRecordById(recordId);
    if (!record || record.completed) return;
    await classRepository.updateRecordCompleted(recordId, true);
  },

  async countByStatus(actingRole: Role): Promise<Record<ClassGroup['status'], number>> {
    assertAdmin(actingRole);

    const rows = await classRepository.countByStatus();
    const totals: Record<ClassGroup['status'], number> = { ACTIVE: 0, INACTIVE: 0, COMPLETED: 0 };
    for (const row of rows) totals[row.status] = row.count;
    return totals;
  },

  async getRecentClassGroups(actingRole: Role, limit: number): Promise<ClassGroup[]> {
    assertAdmin(actingRole);
    return await classRepository.findRecentClassGroups(limit);
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

  /**
   * Gravações que a coordenação ainda não baixou, com o prazo já calculado.
   *
   * O prazo é derivado da DATA DA AULA, e não de quando a gravação ficou
   * pronta: não guardamos esse instante, e a diferença é de horas — irrelevante
   * diante de uma janela de 14 dias. Errar para menos aqui é o lado seguro,
   * porque antecipa o aviso em vez de atrasá-lo.
   */
  async getPendingRecordings(actingRole: Role): Promise<PendingRecordingView[]> {
    assertAdmin(actingRole);

    const pendentes = await classRepository.findPendingRecordings();
    const agora = Date.now();

    return pendentes.map((p) => {
      const availableUntil = recordingAvailableUntil(p.date);
      return {
        ...p,
        availableUntil,
        daysLeft: Math.ceil((availableUntil.getTime() - agora) / (24 * 60 * 60 * 1000)),
      };
    });
  },

  /**
   * Marca que a gravação já foi baixada e arquivada pela escola.
   *
   * É uma confirmação MANUAL de propósito: não há como o servidor saber que um
   * download no navegador do admin terminou, e fingir que sabe (marcando no
   * clique do link) daria por resolvida uma aula que ninguém guardou.
   */
  async markRecordingArchived(actingRole: Role, recordId: string): Promise<void> {
    assertAdmin(actingRole);

    const record = await classRepository.findRecordById(recordId);
    if (!record) throw new AppError('Aula não encontrada.');
    if (record.recordingUrls.length === 0) {
      throw new AppError('Esta aula não tem gravação.');
    }

    await classRepository.markRecordingArchived(recordId);
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
