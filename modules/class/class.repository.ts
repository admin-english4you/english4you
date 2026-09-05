import { db } from '@/lib/db';
import { classGroupsTable, classRecordsTable } from './class.schema';
import { lessonsTable } from '@/modules/lesson/lesson.schema';
import { eq, desc, asc, and, ne, lt, gte, or, isNull, isNotNull, sql } from 'drizzle-orm';
import {
  ClassGroup,
  ClassRecord,
  NewClassGroup,
  NewClassRecord,
  PendingRecording,
} from './class.types';

export const classRepository = {
  async create(data: NewClassGroup): Promise<ClassGroup> {
    const [classGroup] = await db.insert(classGroupsTable).values(data).returning();
    return classGroup;
  },

  async findAll(): Promise<ClassGroup[]> {
    return await db.query.classGroupsTable.findMany({
      orderBy: [desc(classGroupsTable.createdAt)],
    });
  },

  /** Quantas turmas por status — card "Turmas ativas" do dashboard. */
  async countByStatus(): Promise<{ status: ClassGroup['status']; count: number }[]> {
    return await db
      .select({
        status: classGroupsTable.status,
        count: sql<number>`count(*)::int`,
      })
      .from(classGroupsTable)
      .groupBy(classGroupsTable.status);
  },

  /** Turmas criadas mais recentemente — feed de atividades do dashboard. */
  async findRecentClassGroups(limit: number): Promise<ClassGroup[]> {
    return await db.query.classGroupsTable.findMany({
      orderBy: [desc(classGroupsTable.createdAt)],
      limit,
    });
  },

  async findById(id: string): Promise<ClassGroup | undefined> {
    return await db.query.classGroupsTable.findFirst({
      where: eq(classGroupsTable.id, id),
    });
  },

  async findOtherActive(excludeClassGroupId: string): Promise<ClassGroup[]> {
    return await db.query.classGroupsTable.findMany({
      where: and(eq(classGroupsTable.status, 'ACTIVE'), ne(classGroupsTable.id, excludeClassGroupId)),
      orderBy: [asc(classGroupsTable.name)],
    });
  },

  /** Turmas ativas que usam este plano — usado para propagar novas lições do plano. */
  async findActiveByPlanId(planId: string): Promise<ClassGroup[]> {
    return await db.query.classGroupsTable.findMany({
      where: and(eq(classGroupsTable.planId, planId), eq(classGroupsTable.status, 'ACTIVE')),
    });
  },

  /** Turmas onde este professor é o titular. Usa o índice class_groups_teacher_idx. */
  async findByTeacherId(teacherId: string): Promise<ClassGroup[]> {
    return await db.query.classGroupsTable.findMany({
      where: eq(classGroupsTable.teacherId, teacherId),
      orderBy: [desc(classGroupsTable.createdAt)],
    });
  },

  async updateBasic(id: string, data: Partial<Pick<ClassGroup, 'name' | 'level' | 'schedule'>>): Promise<ClassGroup> {
    const [classGroup] = await db
      .update(classGroupsTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(classGroupsTable.id, id))
      .returning();
    return classGroup;
  },

  async updateTeacher(id: string, teacherId: string): Promise<ClassGroup> {
    const [classGroup] = await db
      .update(classGroupsTable)
      .set({ teacherId, updatedAt: new Date() })
      .where(eq(classGroupsTable.id, id))
      .returning();
    return classGroup;
  },

  async updatePlan(id: string, planId: string): Promise<ClassGroup> {
    const [classGroup] = await db
      .update(classGroupsTable)
      .set({ planId, updatedAt: new Date() })
      .where(eq(classGroupsTable.id, id))
      .returning();
    return classGroup;
  },

  async updateStatus(id: string, status: ClassGroup['status']): Promise<ClassGroup> {
    const [classGroup] = await db
      .update(classGroupsTable)
      .set({ status, updatedAt: new Date() })
      .where(eq(classGroupsTable.id, id))
      .returning();
    return classGroup;
  },

  updateStatusQuery(id: string, status: ClassGroup['status']) {
    return db
      .update(classGroupsTable)
      .set({ status, updatedAt: new Date() })
      .where(eq(classGroupsTable.id, id));
  },

  async createRecords(records: NewClassRecord[]): Promise<ClassRecord[]> {
    if (records.length === 0) return [];
    return await db.insert(classRecordsTable).values(records).returning();
  },

  async deleteNonCompletedRecords(classGroupId: string): Promise<void> {
    await db
      .delete(classRecordsTable)
      .where(and(eq(classRecordsTable.classGroupId, classGroupId), eq(classRecordsTable.completed, false)));
  },

  async findRecordsByClassGroupId(classGroupId: string): Promise<ClassRecord[]> {
    return await db.query.classRecordsTable.findMany({
      where: eq(classRecordsTable.classGroupId, classGroupId),
      orderBy: [asc(classRecordsTable.date)],
    });
  },

  /** Aulas já ocorridas, da mais recente para a mais antiga. */
  async findRecordsByClassGroupIdBefore(
    classGroupId: string,
    before: Date,
    limit?: number
  ): Promise<ClassRecord[]> {
    return await db.query.classRecordsTable.findMany({
      where: and(eq(classRecordsTable.classGroupId, classGroupId), lt(classRecordsTable.date, before)),
      orderBy: [desc(classRecordsTable.date)],
      limit,
    });
  },

  /** Aulas a partir de um instante, da mais próxima para a mais distante. */
  async findRecordsByClassGroupIdFrom(
    classGroupId: string,
    from: Date,
    limit?: number
  ): Promise<ClassRecord[]> {
    return await db.query.classRecordsTable.findMany({
      where: and(eq(classRecordsTable.classGroupId, classGroupId), gte(classRecordsTable.date, from)),
      orderBy: [asc(classRecordsTable.date)],
      limit,
    });
  },

  async findNextRecordByClassGroupId(classGroupId: string, from: Date): Promise<ClassRecord | undefined> {
    return await db.query.classRecordsTable.findFirst({
      where: and(eq(classRecordsTable.classGroupId, classGroupId), gte(classRecordsTable.date, from)),
      orderBy: [asc(classRecordsTable.date)],
    });
  },

  async findRecordById(id: string): Promise<ClassRecord | undefined> {
    return await db.query.classRecordsTable.findFirst({
      where: eq(classRecordsTable.id, id),
    });
  },

  /**
   * Aulas com uma call ao vivo (`callStartedAt` != null, `completed` = false)
   * que já passaram do `cutoff` — usado pela varredura sem cron que fecha
   * calls esquecidas (ver `classService.sweepExpiredCalls`).
   */
  async findExpiredLiveRecords(cutoff: Date): Promise<ClassRecord[]> {
    return await db.query.classRecordsTable.findMany({
      where: and(
        isNotNull(classRecordsTable.callStartedAt),
        eq(classRecordsTable.completed, false),
        lt(classRecordsTable.callStartedAt, cutoff)
      ),
    });
  },

  /**
   * Próximas aulas deste professor, titular OU substituto: `record.teacherId`
   * (substituto) tem precedência; na ausência dele, cai pro titular da turma.
   * Precisa do join porque o vínculo titular vive em classGroupsTable, não em
   * class_records.
   */
  async findUpcomingRecordsForTeacher(teacherId: string, from: Date, limit = 3): Promise<ClassRecord[]> {
    const rows = await db
      .select({ record: classRecordsTable })
      .from(classRecordsTable)
      .innerJoin(classGroupsTable, eq(classRecordsTable.classGroupId, classGroupsTable.id))
      .where(
        and(
          gte(classRecordsTable.date, from),
          or(
            eq(classRecordsTable.teacherId, teacherId),
            and(isNull(classRecordsTable.teacherId), eq(classGroupsTable.teacherId, teacherId))
          )
        )
      )
      .orderBy(asc(classRecordsTable.date))
      .limit(limit);

    return rows.map((r) => r.record);
  },

  async updateRecordTeacher(recordId: string, teacherId: string): Promise<ClassRecord> {
    const [record] = await db
      .update(classRecordsTable)
      .set({ teacherId })
      .where(eq(classRecordsTable.id, recordId))
      .returning();
    return record;
  },

  async updateRecordBoard(recordId: string, boardContent: string): Promise<ClassRecord> {
    const [record] = await db
      .update(classRecordsTable)
      .set({ boardContent })
      .where(eq(classRecordsTable.id, recordId))
      .returning();
    return record;
  },

  /**
   * (Re)abre a chamada: sempre volta `completed` para `false` e carimba
   * `callStartedAt` com AGORA — reabrir é permitido quantas vezes o professor
   * precisar (internet/energia pode cair no meio da aula). `callStartedAt`
   * sempre reflete o início da sessão AO VIVO atual (não o primeiro início
   * histórico): é contra ele que o encerramento automático de 2h é medido
   * (ver `CALL_MAX_DURATION_MS` em class.service.ts) — se preservasse o
   * valor original, reabrir uma aula depois de mais de 2h fecharia ela de
   * novo na leitura seguinte.
   */
  async reopenCall(recordId: string): Promise<ClassRecord> {
    const [record] = await db
      .update(classRecordsTable)
      .set({ completed: false, completedAt: null, callStartedAt: new Date() })
      .where(eq(classRecordsTable.id, recordId))
      .returning();
    return record;
  },

  async updateRecordCompleted(recordId: string, completed: boolean): Promise<ClassRecord> {
    const [record] = await db
      .update(classRecordsTable)
      .set({ completed, completedAt: completed ? new Date() : null })
      .where(eq(classRecordsTable.id, recordId))
      .returning();
    return record;
  },

  /** Acrescenta um segmento de gravação — nunca sobrescreve os anteriores (ver doc da coluna). */
  /**
   * Aulas com gravação que a coordenação ainda não arquivou.
   *
   * Traz o nome da turma e o título da lição junto porque o aviso precisa
   * dizer QUAL aula está prestes a sumir — uma lista de ids não faria ninguém
   * agir. Ordena pela mais antiga: é a que vence primeiro.
   */
  async findPendingRecordings(): Promise<PendingRecording[]> {
    return await db
      .select({
        recordId: classRecordsTable.id,
        classGroupId: classRecordsTable.classGroupId,
        className: classGroupsTable.name,
        lessonTitle: lessonsTable.title,
        date: classRecordsTable.date,
        recordingUrls: classRecordsTable.recordingUrls,
      })
      .from(classRecordsTable)
      .innerJoin(classGroupsTable, eq(classGroupsTable.id, classRecordsTable.classGroupId))
      .innerJoin(lessonsTable, eq(lessonsTable.id, classRecordsTable.lessonId))
      .where(
        and(
          isNull(classRecordsTable.recordingArchivedAt),
          sql`array_length(${classRecordsTable.recordingUrls}, 1) > 0`
        )
      )
      .orderBy(asc(classRecordsTable.date));
  },

  async markRecordingArchived(recordId: string): Promise<ClassRecord> {
    const [record] = await db
      .update(classRecordsTable)
      .set({ recordingArchivedAt: new Date() })
      .where(eq(classRecordsTable.id, recordId))
      .returning();
    return record;
  },

  async appendRecordingUrl(recordId: string, url: string): Promise<ClassRecord> {
    const [record] = await db
      .update(classRecordsTable)
      .set({ recordingUrls: sql`array_append(${classRecordsTable.recordingUrls}, ${url})` })
      .where(eq(classRecordsTable.id, recordId))
      .returning();
    return record;
  },

  /**
   * Adiciona o aluno à presença se ainda não estiver lá — idempotente sem
   * precisar ler e reescrever o array manualmente (Drizzle não tem um
   * "append se ausente" nativo pra colunas array). A cláusula WHERE faz
   * chamadas repetidas virarem UPDATE de 0 linhas em vez de reescrever o
   * array toda vez.
   */
  async appendAttendanceIfMissing(recordId: string, studentId: string): Promise<void> {
    await db.execute(sql`
      UPDATE class_records
      SET attendance = ARRAY(SELECT DISTINCT unnest(attendance || ARRAY[${studentId}::uuid]))
      WHERE id = ${recordId}::uuid
        AND NOT (${studentId}::uuid = ANY(attendance))
    `);
  },
};
