import { practiceRepository, QuizCoverage } from './practice.repository';
import { lessonService } from '@/modules/lesson/lesson.service';
import {
  transcribeMedia,
  extractLearningItems,
  generateComprehensiveQuiz,
  generateListeningQuiz,
  RawLearningItem,
  RawComprehensiveQuiz,
  RawQuizQuestion,
} from '@/lib/openai';
import { AppError } from '@/lib/errors';
import { Role } from '@/modules/user/user.types';
import {
  LearningItem,
  NewLearningItem,
  QuizQuestion,
  NewQuizQuestion,
  QuizRenderMode,
  QuizSectionType,
} from './practice.types';

function assertAdmin(actingRole: Role) {
  if (actingRole !== 'ADMIN') {
    throw new AppError('Apenas administradores podem gerenciar conteúdo de prática.');
  }
}

/**
 * Usado só pelas 3 leituras de cobertura (`countPendingForLesson`,
 * `countPendingQuizQuestions`, `getApprovedQuizCoverage`) — o professor
 * precisa delas pra ativar uma lição ao encerrar a aula
 * (lessonService.assertLessonContentReady). Autoria/curadoria de conteúdo
 * (gerar, aprovar, remover itens/perguntas) continua só-admin via
 * `assertAdmin` acima.
 */
function assertAdminOrTeacher(actingRole: Role) {
  if (actingRole !== 'ADMIN' && actingRole !== 'TEACHER') {
    throw new AppError('Apenas administradores ou professores podem consultar o status de prática desta lição.');
  }
}

const VOCAB_CEILING = 40;
const STRUCTURE_CEILING = 15;

// Faixas-alvo pedidas por lote (ver plano: texto e mídia dividem o teto geral de 20-40/10-15).
const TEXT_BATCH_VOCAB: [number, number] = [12, 25];
const TEXT_BATCH_STRUCTURE: [number, number] = [6, 10];
const MEDIA_BATCH_VOCAB: [number, number] = [8, 18];
const MEDIA_BATCH_STRUCTURE: [number, number] = [4, 7];
// Lição só-texto (sem mídia): usa a faixa-alvo completa direto.
const SOLO_VOCAB: [number, number] = [20, VOCAB_CEILING];
const SOLO_STRUCTURE: [number, number] = [10, STRUCTURE_CEILING];

const QUIZ_SECTIONS: QuizSectionType[] = ['vocabulary', 'grammar', 'context', 'comprehension'];

/**
 * Só áudio: a transcrição roda na OpenAI (ver lib/openai.ts), cuja API não
 * aceita vídeo. Uma lição com vídeo mas sem áudio simplesmente não gera
 * transcrição — e, portanto, nem prática de compreensão auditiva (a mesma
 * regra vale em `lessonService.assertLessonContentReady`).
 */
const AUDIO_EXTENSION_MIME: Record<string, string> = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
};

function inferMimeType(url: string): string {
  const withoutQuery = url.split('?')[0];
  const extension = withoutQuery.split('.').pop()?.toLowerCase() ?? '';
  const mimeType = AUDIO_EXTENSION_MIME[extension];
  if (!mimeType) {
    throw new AppError('Formato de áudio não reconhecido para transcrição.');
  }
  return mimeType;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function mergeDedupeAndCap(items: RawLearningItem[]): RawLearningItem[] {
  const seen = new Map<string, RawLearningItem>();
  for (const item of items) {
    const key = `${item.type}::${item.lemma.trim().toLowerCase()}`;
    if (!seen.has(key)) {
      seen.set(key, item);
    }
  }
  const deduped = [...seen.values()];
  const vocab = deduped.filter((i) => i.type === 'VOCABULARY').slice(0, VOCAB_CEILING);
  const structure = deduped.filter((i) => i.type === 'STRUCTURE').slice(0, STRUCTURE_CEILING);
  return [...vocab, ...structure];
}

function flattenComprehensiveQuiz(
  lessonId: string,
  quiz: RawComprehensiveQuiz | null
): NewQuizQuestion[] {
  if (!quiz) return [];
  return QUIZ_SECTIONS.flatMap((section) =>
    quiz[section].map((q): NewQuizQuestion => ({
      lessonId,
      renderMode: 'quiz_comprehensive',
      section,
      question: q.question,
      options: q.options,
      correctIndex: q.correctIndex,
      explanation: q.explanation ?? null,
      reviewStatus: 'APPROVED',
    }))
  );
}

function mapListeningQuiz(lessonId: string, questions: RawQuizQuestion[]): NewQuizQuestion[] {
  return questions.map((q): NewQuizQuestion => ({
    lessonId,
    renderMode: 'listening_choice',
    section: null,
    question: q.question,
    options: q.options,
    correctIndex: q.correctIndex,
    explanation: q.explanation ?? null,
    reviewStatus: 'APPROVED',
  }));
}

/**
 * Service do módulo de Prática (LearningItems e QuizQuestions gerados via IA).
 */
export const practiceService = {
  // ---------------------------------------------------------------------------
  // Leituras de CONTEÚDO APROVADO (sem RBAC de papel)
  //
  // Estes três getters não checam papel de propósito: devolvem apenas conteúdo
  // já aprovado e sem nenhum dado pessoal. Quem chama (progressService) já
  // validou que o aluno tem direito àquela lição, a partir da turma dele.
  // Mesmo precedente dos já existentes `lessonService.getLessonsByIds` e
  // `planService.getOrderedLessonsForPlan`.
  // ---------------------------------------------------------------------------

  async getApprovedItemsForLesson(lessonId: string): Promise<LearningItem[]> {
    return await practiceRepository.findApprovedByLessonId(lessonId);
  },

  async getApprovedQuizQuestions(
    lessonId: string,
    renderMode: QuizRenderMode,
    sections?: QuizSectionType[]
  ): Promise<QuizQuestion[]> {
    return await practiceRepository.findApprovedQuizQuestions(lessonId, renderMode, sections);
  },

  /**
   * O que a lição consegue oferecer de prática. `hasListening` é o que decide,
   * junto do `audioUrl`, se o ciclo usa o dia 6 como compreensão auditiva.
   */
  async getLessonPracticeCapabilities(lessonId: string): Promise<{
    hasListening: boolean;
    vocabCount: number;
    structureCount: number;
    sectionCoverage: QuizCoverage;
  }> {
    const [counts, coverage] = await Promise.all([
      practiceRepository.countApprovedItemsByType(lessonId),
      practiceRepository.countApprovedQuizQuestionsByModeAndSection(lessonId),
    ]);

    return {
      hasListening: coverage.listening > 0,
      vocabCount: counts.vocab,
      structureCount: counts.structure,
      sectionCoverage: coverage,
    };
  },

  async getItemsForLesson(actingRole: Role, lessonId: string): Promise<LearningItem[]> {
    assertAdmin(actingRole);
    return await practiceRepository.findByLessonId(lessonId);
  },

  async countPendingForLesson(actingRole: Role, lessonId: string): Promise<number> {
    assertAdminOrTeacher(actingRole);
    return await practiceRepository.countPendingByLessonId(lessonId);
  },

  async getQuizQuestionsForLesson(actingRole: Role, lessonId: string): Promise<QuizQuestion[]> {
    assertAdmin(actingRole);
    return await practiceRepository.findQuizQuestionsByLessonId(lessonId);
  },

  async countPendingQuizQuestions(actingRole: Role, lessonId: string): Promise<number> {
    assertAdminOrTeacher(actingRole);
    return await practiceRepository.countPendingQuizQuestions(lessonId);
  },

  async getApprovedQuizCoverage(actingRole: Role, lessonId: string): Promise<QuizCoverage> {
    assertAdminOrTeacher(actingRole);
    return await practiceRepository.countApprovedQuizQuestionsByModeAndSection(lessonId);
  },

  /**
   * Orquestra a geração via IA para uma lição: vocabulário/estrutura (texto e,
   * se houver mídia, transcrição) E as perguntas de compreensão (4 seções do
   * quiz_comprehensive sempre; listening_choice só com mídia) — tudo na mesma
   * chamada, em paralelo, com transcrição resolvida antes se necessário.
   * Se qualquer lote falhar, nada é persistido (nem vocabulário/estrutura,
   * nem quiz) — a lição fica incompleta e o admin tenta de novo. Itens/perguntas
   * já APPROVED nunca são tocados; só os PENDING antigos são substituídos.
   */
  async generateLearningItems(actingRole: Role, lessonId: string): Promise<LearningItem[]> {
    assertAdmin(actingRole);

    const lesson = await lessonService.getLessonById(actingRole, lessonId);
    if (!lesson) {
      throw new AppError('Lição não encontrada.');
    }

    const plainText = stripHtml(lesson.content);
    if (!plainText && !lesson.audioUrl) {
      throw new AppError('Adicione conteúdo escrito ou áudio à lição antes de gerar com IA.');
    }

    const hasMedia = Boolean(lesson.audioUrl);

    let vocabItems: RawLearningItem[] = [];
    let comprehensiveQuiz: RawComprehensiveQuiz | null = null;
    let listeningQuiz: RawQuizQuestion[] = [];

    try {
      let transcript = lesson.transcript ?? '';
      if (hasMedia && !transcript) {
        const mediaUrl = lesson.audioUrl!;
        const mimeType = inferMimeType(mediaUrl);
        transcript = await transcribeMedia(mediaUrl, mimeType);
        await lessonService.saveTranscript(actingRole, lessonId, transcript);
      }

      if (hasMedia) {
        const [textVocab, mediaVocab, quiz, listening] = await Promise.all([
          plainText
            ? extractLearningItems({ text: plainText, levelHint: lesson.level, vocabRange: TEXT_BATCH_VOCAB, structureRange: TEXT_BATCH_STRUCTURE })
            : Promise.resolve([]),
          extractLearningItems({ text: transcript, levelHint: lesson.level, vocabRange: MEDIA_BATCH_VOCAB, structureRange: MEDIA_BATCH_STRUCTURE }),
          generateComprehensiveQuiz({ text: plainText, transcript, levelHint: lesson.level }),
          generateListeningQuiz({ transcript, levelHint: lesson.level }),
        ]);
        vocabItems = [...textVocab, ...mediaVocab];
        comprehensiveQuiz = quiz;
        listeningQuiz = listening;
      } else {
        const [soloVocab, quiz] = await Promise.all([
          extractLearningItems({ text: plainText, levelHint: lesson.level, vocabRange: SOLO_VOCAB, structureRange: SOLO_STRUCTURE }),
          generateComprehensiveQuiz({ text: plainText, transcript: '', levelHint: lesson.level }),
        ]);
        vocabItems = soloVocab;
        comprehensiveQuiz = quiz;
      }

      if (!comprehensiveQuiz) {
        throw new Error('A geração das perguntas de compreensão falhou.');
      }
    } catch (err) {
      console.error('OpenAI generation failed:', err);
      throw new AppError('Falha ao gerar itens com IA. Tente novamente em instantes.');
    }

    const mergedVocab = mergeDedupeAndCap(vocabItems);
    const quizQuestions = [...flattenComprehensiveQuiz(lessonId, comprehensiveQuiz), ...mapListeningQuiz(lessonId, listeningQuiz)];

    await practiceRepository.deletePendingByLessonId(lessonId);
    await practiceRepository.deletePendingQuizQuestions(lessonId);

    if (mergedVocab.length > 0) {
      // Itens já entram APPROVED: o fluxo é o admin remover os que não quiser,
      // não aprovar um a um. PENDING continua existindo no schema para casos em
      // que se queira reintroduzir uma etapa de revisão explícita no futuro.
      const toInsert: NewLearningItem[] = mergedVocab.map((item) => ({
        lessonId,
        type: item.type,
        lemma: item.lemma,
        metadata: item.metadata,
        reviewStatus: 'APPROVED',
      }));
      await practiceRepository.createMany(toInsert);
    }

    await practiceRepository.createQuizQuestions(quizQuestions);

    return await practiceRepository.findByLessonId(lessonId);
  },

  async approveItem(actingRole: Role, itemId: string): Promise<LearningItem> {
    assertAdmin(actingRole);
    return await practiceRepository.updateReviewStatus(itemId, 'APPROVED');
  },

  async deleteItem(actingRole: Role, itemId: string): Promise<void> {
    assertAdmin(actingRole);
    await practiceRepository.deleteById(itemId);
  },

  async approveQuizQuestion(actingRole: Role, questionId: string): Promise<QuizQuestion> {
    assertAdmin(actingRole);
    return await practiceRepository.updateQuizQuestionReviewStatus(questionId, 'APPROVED');
  },

  async deleteQuizQuestion(actingRole: Role, questionId: string): Promise<void> {
    assertAdmin(actingRole);
    await practiceRepository.deleteQuizQuestionById(questionId);
  },
};
