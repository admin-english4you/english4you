import { AppError, BlockedPracticeError } from '@/lib/errors';
import { dayKeyToDate, startOfWeekKey, toDayKey, todayKey } from '@/lib/date';
import { classService } from '@/modules/class/class.service';
import { practiceService } from '@/modules/practice/practice.service';
import {
  REDO_UNLOCK_COST,
  WEEKLY_XP_GOAL,
  XP_PER_DAY,
  assemblePracticeItems,
  buildCycleForClassRecord,
  isPlayable,
  practiceDayKey,
  resolvePracticeDayStates,
} from '@/modules/practice/practice.engine';
import type {
  CycleSource,
  PracticeDayState,
  PracticeSession,
  QuizRenderMode,
} from '@/modules/practice/practice.types';
import type { StudentTaughtRecord } from '@/modules/class/class.types';
import { progressRepository } from './progress.repository';
import type {
  CompleteDayResult,
  PracticeLessonSection,
  PracticePathView,
  PurchaseResult,
  XpSummary,
} from './progress.types';

/**
 * Orquestrador da prática do aluno.
 *
 * É o único caller impuro do motor (`practice.engine`), e o ponto onde a posse
 * é validada: nenhuma lição entra numa sessão sem estar entre as aulas já
 * ministradas da turma atual do aluno.
 */

/** Contexto compartilhado por todas as leituras: aulas dadas + o que já foi feito. */
interface StudentPracticeContext {
  sources: CycleSource[];
  sourceByLessonId: Map<string, CycleSource>;
  taughtByLessonId: Map<string, StudentTaughtRecord>;
  completedKeys: Map<string, number>;
  unlockedKeys: Set<string>;
  today: string;
}

/**
 * Monta as fontes de ciclo a partir das aulas já dadas.
 *
 * `hasAudio` é decidido UMA VEZ POR LIÇÃO, nunca por dia: exige áudio E
 * perguntas de listening aprovadas. Uma lição com áudio mas sem perguntas
 * produziria um dia 6 vazio; decidir de uma vez garante que os dias 5 e 6
 * sempre mudam juntos e o quiz nunca fica meio dividido.
 */
async function buildCycleSources(taught: StudentTaughtRecord[]): Promise<CycleSource[]> {
  return await Promise.all(
    taught.map(async ({ record, lesson }) => {
      const capabilities = await practiceService.getLessonPracticeCapabilities(lesson.id);
      return {
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        lessonLevel: lesson.level,
        classRecordId: record.id,
        // `completedAt` é quando a aula foi de fato dada — pode ser bem
        // diferente de `date` (agendada) quando o professor encerra fora do
        // calendário original. Cai pra `date` só em registros legados sem
        // `completedAt` (de antes desta coluna existir).
        classDateKey: toDayKey(record.completedAt ?? record.date),
        activatedDayKey: lesson.activatedAt ? toDayKey(lesson.activatedAt) : null,
        hasAudio: Boolean(lesson.audioUrl) && capabilities.hasListening,
      } satisfies CycleSource;
    })
  );
}

async function loadContext(studentUserId: string): Promise<StudentPracticeContext> {
  const taught = await classService.getStudentTaughtRecords(studentUserId);

  const [sources, completions, unlocks] = await Promise.all([
    buildCycleSources(taught),
    progressRepository.findCompletionsByUser(studentUserId),
    progressRepository.findUnlocksByUser(studentUserId),
  ]);

  return {
    sources,
    sourceByLessonId: new Map(sources.map((s) => [s.lessonId, s])),
    taughtByLessonId: new Map(taught.map((t) => [t.lesson.id, t])),
    completedKeys: new Map(completions.map((c) => [practiceDayKey(c.lessonId, c.dayIndex), c.xpEarned])),
    unlockedKeys: new Set(unlocks.map((u) => practiceDayKey(u.lessonId, u.dayIndex))),
    today: todayKey(),
  };
}

/**
 * Descobre quais dias não têm conteúdo aprovado para o próprio modo.
 *
 * Sem isso, um dia de `sentence_unscramble` numa lição só de vocabulário
 * abriria um player sem nenhum item. Marcamos como EMPTY (cinza, injogável,
 * não comprável) em vez de substituir por outro modo em silêncio — a
 * substituição tornaria o ciclo imprevisível para o aluno.
 */
async function findEmptyDayKeys(sources: CycleSource[]): Promise<Set<string>> {
  const empty = new Set<string>();

  await Promise.all(
    sources.map(async (source) => {
      const caps = await practiceService.getLessonPracticeCapabilities(source.lessonId);

      for (const day of buildCycleForClassRecord(source)) {
        const key = practiceDayKey(day.lessonId, day.dayIndex);
        switch (day.renderMode) {
          case 'flashcard_visual':
          case 'flashcard_recall':
            if (caps.vocabCount === 0) empty.add(key);
            break;
          case 'gap_fill_listening':
          case 'sentence_unscramble':
            if (caps.structureCount === 0) empty.add(key);
            break;
          case 'quiz_comprehensive': {
            const total = (day.quizSections ?? []).reduce(
              (sum, section) => sum + caps.sectionCoverage[section],
              0
            );
            if (total === 0) empty.add(key);
            break;
          }
          case 'listening_choice':
            if (caps.sectionCoverage.listening === 0) empty.add(key);
            break;
          default:
            empty.add(key);
        }
      }
    })
  );

  return empty;
}

async function resolveAllDays(ctx: StudentPracticeContext): Promise<PracticeDayState[]> {
  const emptyKeys = await findEmptyDayKeys(ctx.sources);

  return ctx.sources.flatMap((source) =>
    resolvePracticeDayStates(buildCycleForClassRecord(source), {
      todayKey: ctx.today,
      completedKeys: ctx.completedKeys,
      unlockedKeys: ctx.unlockedKeys,
      emptyKeys,
    })
  );
}

async function computeXpSummary(studentUserId: string, today: string): Promise<XpSummary> {
  const weekStart = dayKeyToDate(startOfWeekKey(today));
  const totals = await progressRepository.getXpTotals(studentUserId, weekStart);

  return {
    // Saldo derivado, nunca armazenado: neon-http não tem transação, e um
    // contador materializado inevitavelmente dessincronizaria.
    balance: totals.earnedTotal - totals.spentTotal,
    earnedTotal: totals.earnedTotal,
    earnedThisWeek: totals.earnedThisWeek,
  };
}

export const progressService = {
  /** Trilha completa: uma seção por lição, com os 6 nós, mais os dias de hoje. */
  async getPracticePath(studentUserId: string): Promise<PracticePathView> {
    const ctx = await loadContext(studentUserId);
    const [days, xp] = await Promise.all([
      resolveAllDays(ctx),
      computeXpSummary(studentUserId, ctx.today),
    ]);

    const byLesson = new Map<string, PracticeDayState[]>();
    for (const day of days) {
      const bucket = byLesson.get(day.lessonId);
      if (bucket) bucket.push(day);
      else byLesson.set(day.lessonId, [day]);
    }

    // Mais recente primeiro: é a lição que o aluno está praticando agora.
    const sections: PracticeLessonSection[] = ctx.sources
      .map((source) => {
        const lessonDays = (byLesson.get(source.lessonId) ?? []).sort((a, b) => a.dayIndex - b.dayIndex);
        return {
          lessonId: source.lessonId,
          lessonTitle: source.lessonTitle,
          lessonLevel: source.lessonLevel,
          classRecordId: source.classRecordId,
          classDateKey: source.classDateKey,
          hasAudio: source.hasAudio,
          days: lessonDays,
          completedCount: lessonDays.filter((d) => d.status === 'COMPLETED' || d.status === 'REPLAYABLE')
            .length,
        };
      })
      .sort((a, b) => b.classDateKey.localeCompare(a.classDateKey));

    return {
      sections,
      // Ciclos se sobrepõem, então "hoje" pode ter mais de uma atividade.
      today: days.filter((d) => d.dateKey === ctx.today),
      xp,
      weeklyGoal: WEEKLY_XP_GOAL,
      unlockCost: REDO_UNLOCK_COST,
      todayKey: ctx.today,
    };
  },

  /** Atalho do dashboard: só as atividades liberadas hoje. */
  async getTodayPracticeDays(studentUserId: string): Promise<PracticeDayState[]> {
    const ctx = await loadContext(studentUserId);
    const days = await resolveAllDays(ctx);
    return days.filter((d) => d.dateKey === ctx.today);
  },

  async getXpSummary(studentUserId: string): Promise<XpSummary> {
    return await computeXpSummary(studentUserId, todayKey());
  },

  /**
   * Monta a sessão jogável. É o ponto de estrangulamento de posse: um aluno que
   * adivinhe o uuid de outra lição não passa daqui.
   */
  async getPracticeSession(
    studentUserId: string,
    lessonId: string,
    dayIndex: number
  ): Promise<PracticeSession> {
    const ctx = await loadContext(studentUserId);
    const day = await assertPlayableDay(ctx, lessonId, dayIndex);
    const taught = ctx.taughtByLessonId.get(lessonId)!;

    const [items, questions] = await Promise.all([
      needsLearningItems(day.renderMode)
        ? practiceService.getApprovedItemsForLesson(lessonId)
        : Promise.resolve([]),
      needsQuizQuestions(day.renderMode)
        ? practiceService.getApprovedQuizQuestions(
            lessonId,
            day.renderMode as QuizRenderMode,
            day.quizSections ?? undefined
          )
        : Promise.resolve([]),
    ]);

    const practiceItems = assemblePracticeItems({
      lessonId,
      dayIndex,
      renderMode: day.renderMode,
      quizSections: day.quizSections,
      items,
      questions,
    });

    if (practiceItems.length === 0) {
      throw new AppError('Esta prática ainda não tem conteúdo disponível.');
    }

    return {
      lessonId,
      lessonTitle: day.lessonTitle,
      dayIndex,
      renderMode: day.renderMode,
      items: practiceItems,
      audioUrl: day.renderMode === 'listening_choice' ? taught.lesson.audioUrl : null,
      xpReward: day.status === 'AVAILABLE' ? XP_PER_DAY : 0,
      isReplay: day.status === 'REPLAYABLE',
    };
  },

  /**
   * Conclui o dia. O XP é calculado AQUI, a partir do estado recomputado no
   * servidor — o cliente só informa qual dia terminou, nunca quanto valeu.
   *
   * É idempotente: refresh ou duplo submit apenas incrementam `redoCount`.
   */
  async completePracticeDay(
    studentUserId: string,
    lessonId: string,
    dayIndex: number
  ): Promise<CompleteDayResult> {
    const ctx = await loadContext(studentUserId);
    const day = await assertCompletableDay(ctx, lessonId, dayIndex);

    const alreadyCompleted = ctx.completedKeys.has(practiceDayKey(lessonId, dayIndex));
    const isReplay = day.status === 'REPLAYABLE' || alreadyCompleted;
    const xpEarned = isReplay ? 0 : XP_PER_DAY;

    await progressRepository.upsertCompletion({
      userId: studentUserId,
      lessonId,
      dayIndex,
      renderMode: day.renderMode,
      xpEarned,
    });

    const xp = await computeXpSummary(studentUserId, ctx.today);

    return { xpEarned, newBalance: xp.balance, wasReplay: isReplay, renderMode: day.renderMode };
  },

  /** Desbloqueia um dia passado gastando XP. */
  async purchasePracticeDay(
    studentUserId: string,
    lessonId: string,
    dayIndex: number
  ): Promise<PurchaseResult> {
    const ctx = await loadContext(studentUserId);
    const days = await resolveAllDays(ctx);
    const day = days.find((d) => d.lessonId === lessonId && d.dayIndex === dayIndex);

    if (!day) {
      throw new AppError('Esta prática não está disponível para você.');
    }
    if (day.status === 'EMPTY') {
      throw new AppError('Esta prática ainda não tem conteúdo disponível.');
    }
    if (day.status === 'LOCKED_FUTURE' || day.status === 'AVAILABLE') {
      throw new AppError('Este dia ainda está liberado — não é preciso gastar XP.');
    }
    if (day.status === 'REPLAYABLE') {
      throw new AppError('Você já desbloqueou esta prática.');
    }

    const bought = await progressRepository.insertUnlockIfAffordable(
      studentUserId,
      lessonId,
      dayIndex,
      REDO_UNLOCK_COST
    );

    if (!bought) {
      // Zero linhas significa saldo insuficiente OU já desbloqueado — só
      // relendo dá para distinguir e dar a mensagem certa.
      const existing = await progressRepository.findUnlock(studentUserId, lessonId, dayIndex);
      if (existing) {
        throw new AppError('Você já desbloqueou esta prática.');
      }
      const xp = await computeXpSummary(studentUserId, ctx.today);
      throw new AppError(
        `XP insuficiente: são necessários ${REDO_UNLOCK_COST} XP e você tem ${xp.balance}.`
      );
    }

    const xp = await computeXpSummary(studentUserId, ctx.today);
    return { xpSpent: REDO_UNLOCK_COST, newBalance: xp.balance };
  },
};

function needsLearningItems(renderMode: string): boolean {
  return (
    renderMode === 'flashcard_visual' ||
    renderMode === 'flashcard_recall' ||
    renderMode === 'gap_fill_listening' ||
    renderMode === 'sentence_unscramble'
  );
}

function needsQuizQuestions(renderMode: string): boolean {
  return renderMode === 'quiz_comprehensive' || renderMode === 'listening_choice';
}

/** Resolve o dia validando a posse. Não julga o status. */
async function resolveOwnedDay(
  ctx: StudentPracticeContext,
  lessonId: string,
  dayIndex: number
): Promise<PracticeDayState> {
  if (!ctx.sourceByLessonId.has(lessonId)) {
    throw new AppError('Esta prática não está disponível para você.');
  }

  const days = await resolveAllDays(ctx);
  const day = days.find((d) => d.lessonId === lessonId && d.dayIndex === dayIndex);
  if (!day) {
    throw new AppError('Esta prática não está disponível para você.');
  }

  return day;
}

/**
 * Estados que nunca podem ser abertos nem registrados, seja qual for o caminho.
 *
 * `BlockedPracticeError` (não `AppError`) porque o aluno TEM posse do dia —
 * ele só está num estado que não permite abrir agora. A page.tsx precisa
 * distinguir isso de "não existe" para não renderizar um 404.
 */
function assertNotBlocked(day: PracticeDayState): void {
  if (day.status === 'EMPTY') {
    throw new BlockedPracticeError('Esta prática ainda não tem conteúdo disponível.');
  }
  if (day.status === 'LOCKED_FUTURE') {
    throw new BlockedPracticeError('Esta prática ainda não foi liberada.');
  }
  if (day.status === 'EXPIRED') {
    throw new BlockedPracticeError('Esta prática expirou. Desbloqueie com XP para refazer.');
  }
}

/** Guard de ABRIR o player: exige um dia efetivamente jogável. */
async function assertPlayableDay(
  ctx: StudentPracticeContext,
  lessonId: string,
  dayIndex: number
): Promise<PracticeDayState> {
  const day = await resolveOwnedDay(ctx, lessonId, dayIndex);
  assertNotBlocked(day);

  if (day.status === 'COMPLETED') {
    throw new BlockedPracticeError('Você já concluiu esta prática. Desbloqueie com XP para refazer.');
  }
  if (!isPlayable(day.status)) {
    throw new AppError('Esta prática não está disponível.');
  }

  return day;
}

/**
 * Guard de REGISTRAR a conclusão — deliberadamente mais frouxo que o de abrir.
 *
 * COMPLETED é aceito aqui porque a conclusão precisa ser idempotente: um duplo
 * submit ou um refresh na tela de resultado chegam com o dia já concluído, e
 * devem apenas incrementar `redoCount`, não estourar um erro na cara do aluno.
 * Não há brecha: o XP de uma repetição é sempre 0, e os estados realmente
 * bloqueados (futuro, expirado, vazio) continuam barrados.
 */
async function assertCompletableDay(
  ctx: StudentPracticeContext,
  lessonId: string,
  dayIndex: number
): Promise<PracticeDayState> {
  const day = await resolveOwnedDay(ctx, lessonId, dayIndex);
  assertNotBlocked(day);
  return day;
}
