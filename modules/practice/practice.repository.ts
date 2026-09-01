import { db } from '@/lib/db';
import { learningItemsTable, quizQuestionsTable } from './practice.schema';
import { eq, and, asc, inArray, sql } from 'drizzle-orm';
import {
  LearningItem,
  NewLearningItem,
  QuizQuestion,
  NewQuizQuestion,
  QuizRenderMode,
  QuizSectionType,
} from './practice.types';

export interface QuizCoverage {
  vocabulary: number;
  grammar: number;
  context: number;
  comprehension: number;
  listening: number;
}

export const practiceRepository = {
  async findByLessonId(lessonId: string): Promise<LearningItem[]> {
    return await db.query.learningItemsTable.findMany({
      where: eq(learningItemsTable.lessonId, lessonId),
      orderBy: [asc(learningItemsTable.createdAt)],
    });
  },

  /** Só o conteúdo aprovado — é o que o aluno pode ver. Usa o índice (lesson, status). */
  async findApprovedByLessonId(lessonId: string): Promise<LearningItem[]> {
    return await db.query.learningItemsTable.findMany({
      where: and(
        eq(learningItemsTable.lessonId, lessonId),
        eq(learningItemsTable.reviewStatus, 'APPROVED')
      ),
      orderBy: [asc(learningItemsTable.createdAt)],
    });
  },

  /** Perguntas aprovadas de um modo, opcionalmente restritas a algumas seções. */
  async findApprovedQuizQuestions(
    lessonId: string,
    renderMode: QuizRenderMode,
    sections?: QuizSectionType[]
  ): Promise<QuizQuestion[]> {
    return await db.query.quizQuestionsTable.findMany({
      where: and(
        eq(quizQuestionsTable.lessonId, lessonId),
        eq(quizQuestionsTable.reviewStatus, 'APPROVED'),
        eq(quizQuestionsTable.renderMode, renderMode),
        sections && sections.length > 0 ? inArray(quizQuestionsTable.section, sections) : undefined
      ),
      orderBy: [asc(quizQuestionsTable.createdAt)],
    });
  },

  /** Contagens de itens aprovados por tipo, para decidir se um dia tem conteúdo. */
  async countApprovedItemsByType(lessonId: string): Promise<{ vocab: number; structure: number }> {
    const rows = await db
      .select({ type: learningItemsTable.type, count: sql<number>`count(*)` })
      .from(learningItemsTable)
      .where(
        and(eq(learningItemsTable.lessonId, lessonId), eq(learningItemsTable.reviewStatus, 'APPROVED'))
      )
      .groupBy(learningItemsTable.type);

    return {
      vocab: Number(rows.find((r) => r.type === 'VOCABULARY')?.count ?? 0),
      structure: Number(rows.find((r) => r.type === 'STRUCTURE')?.count ?? 0),
    };
  },

  async countPendingByLessonId(lessonId: string): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(learningItemsTable)
      .where(and(eq(learningItemsTable.lessonId, lessonId), eq(learningItemsTable.reviewStatus, 'PENDING')));
    return Number(row?.count ?? 0);
  },

  async findById(id: string): Promise<LearningItem | undefined> {
    return await db.query.learningItemsTable.findFirst({
      where: eq(learningItemsTable.id, id),
    });
  },

  async createMany(items: NewLearningItem[]): Promise<LearningItem[]> {
    if (items.length === 0) return [];
    return await db.insert(learningItemsTable).values(items).returning();
  },

  async deletePendingByLessonId(lessonId: string): Promise<void> {
    await db
      .delete(learningItemsTable)
      .where(and(eq(learningItemsTable.lessonId, lessonId), eq(learningItemsTable.reviewStatus, 'PENDING')));
  },

  async updateReviewStatus(id: string, status: 'PENDING' | 'APPROVED'): Promise<LearningItem> {
    const [item] = await db
      .update(learningItemsTable)
      .set({ reviewStatus: status })
      .where(eq(learningItemsTable.id, id))
      .returning();
    return item;
  },

  async deleteById(id: string): Promise<void> {
    await db.delete(learningItemsTable).where(eq(learningItemsTable.id, id));
  },

  /** Edição manual do admin: substitui termo e metadados de uma vez. */
  async updateItemContent(
    id: string,
    data: { lemma: string; metadata: LearningItem['metadata'] }
  ): Promise<LearningItem> {
    const [item] = await db
      .update(learningItemsTable)
      .set({ lemma: data.lemma, metadata: data.metadata })
      .where(eq(learningItemsTable.id, id))
      .returning();
    return item;
  },

  async findQuizQuestionsByLessonId(lessonId: string): Promise<QuizQuestion[]> {
    return await db.query.quizQuestionsTable.findMany({
      where: eq(quizQuestionsTable.lessonId, lessonId),
      orderBy: [asc(quizQuestionsTable.createdAt)],
    });
  },

  async createQuizQuestions(questions: NewQuizQuestion[]): Promise<QuizQuestion[]> {
    if (questions.length === 0) return [];
    return await db.insert(quizQuestionsTable).values(questions).returning();
  },

  async deletePendingQuizQuestions(lessonId: string): Promise<void> {
    await db
      .delete(quizQuestionsTable)
      .where(and(eq(quizQuestionsTable.lessonId, lessonId), eq(quizQuestionsTable.reviewStatus, 'PENDING')));
  },

  async updateQuizQuestionReviewStatus(id: string, status: 'PENDING' | 'APPROVED'): Promise<QuizQuestion> {
    const [question] = await db
      .update(quizQuestionsTable)
      .set({ reviewStatus: status })
      .where(eq(quizQuestionsTable.id, id))
      .returning();
    return question;
  },

  async deleteQuizQuestionById(id: string): Promise<void> {
    await db.delete(quizQuestionsTable).where(eq(quizQuestionsTable.id, id));
  },

  /** Edição manual do admin: enunciado, alternativas, gabarito e explicação. */
  async updateQuizQuestionContent(
    id: string,
    data: { question: string; options: string[]; correctIndex: number; explanation: string | null }
  ): Promise<QuizQuestion> {
    const [question] = await db
      .update(quizQuestionsTable)
      .set({
        question: data.question,
        options: data.options,
        correctIndex: data.correctIndex,
        explanation: data.explanation,
      })
      .where(eq(quizQuestionsTable.id, id))
      .returning();
    return question;
  },

  async countPendingQuizQuestions(lessonId: string): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(quizQuestionsTable)
      .where(and(eq(quizQuestionsTable.lessonId, lessonId), eq(quizQuestionsTable.reviewStatus, 'PENDING')));
    return Number(row?.count ?? 0);
  },

  /** Quantas perguntas APPROVED existem por seção (comprehensive) e para listening_choice, pra checar a trava de ativação. */
  async countApprovedQuizQuestionsByModeAndSection(lessonId: string): Promise<QuizCoverage> {
    const rows = await db
      .select({
        renderMode: quizQuestionsTable.renderMode,
        section: quizQuestionsTable.section,
        count: sql<number>`count(*)`,
      })
      .from(quizQuestionsTable)
      .where(and(eq(quizQuestionsTable.lessonId, lessonId), eq(quizQuestionsTable.reviewStatus, 'APPROVED')))
      .groupBy(quizQuestionsTable.renderMode, quizQuestionsTable.section);

    const coverage: QuizCoverage = { vocabulary: 0, grammar: 0, context: 0, comprehension: 0, listening: 0 };
    for (const row of rows) {
      if (row.renderMode === 'listening_choice') {
        coverage.listening += Number(row.count);
      } else if (row.section) {
        coverage[row.section] += Number(row.count);
      }
    }
    return coverage;
  },
};
