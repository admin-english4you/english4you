import { practiceRepository, QuizCoverage } from './practice.repository';
import { lessonService } from '@/modules/lesson/lesson.service';
import {
  transcribeMedia,
  extractLearningItems,
  extractMoreLearningItems,
  generateComprehensiveQuiz,
  generateListeningQuiz,
  generateMoreQuizQuestions,
  RawLearningItem,
  RawComprehensiveQuiz,
  RawQuizQuestion,
  RawSectionedQuizQuestion,
} from '@/lib/openai';
import { AppError } from '@/lib/errors';
import { partitionByLanguage, findLanguageViolations } from './practice.language';
import { Role } from '@/modules/user/user.types';
import {
  GenerateMoreReport,
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
 * Abaixo disto, os dias de "completar a frase" e "monte a frase" ficam curtos
 * o bastante para o aluno perceber (são um exercício por item STRUCTURE).
 * É limiar de AVISO no log, não de erro — ver o uso em `generateLearningItems`.
 */
const MIN_EXPECTED_STRUCTURES = 6;

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

    // Guarda de idioma antes de persistir: um item com o conteúdo em
    // português ensina a coisa errada (o aluno monta "Eles são estudantes"
    // num exercício que pede a frase em inglês). Prompt não é garantia — ver
    // `practice.language.ts`. Os descartados vão pro log com o campo exato,
    // porque item sumindo em silêncio vira "a IA gerou menos hoje".
    const { valid: languageChecked, rejected } = partitionByLanguage(vocabItems);
    if (rejected.length > 0) {
      console.warn(
        `[Prática] ${rejected.length} item(ns) descartado(s) por idioma na lição ${lessonId}:`,
        rejected.map(({ item, violations }) => ({
          lemma: item.lemma,
          campos: violations.map((v) => `${v.field} (${v.reason})`),
        }))
      );
    }

    const mergedVocab = mergeDedupeAndCap(languageChecked);
    const quizQuestions = [...flattenComprehensiveQuiz(lessonId, comprehensiveQuiz), ...mapListeningQuiz(lessonId, listeningQuiz)];

    // Sem item nenhum não adianta gravar só o quiz: a lição fica pela metade
    // (dias 1 a 4 da prática saem vazios, porque flashcard/gap fill/monte a
    // frase saem TODOS dos learning items) e, como a geração devolvia
    // "sucesso", ninguém ficava sabendo. Foi assim que uma lição terminou com
    // 59 perguntas e zero itens. Melhor falhar aqui e o admin gerar de novo.
    if (mergedVocab.length === 0) {
      throw new AppError(
        'A IA não devolveu nenhum item de vocabulário ou estrutura para esta lição. Nada foi salvo — tente gerar novamente.'
      );
    }

    await practiceRepository.deletePendingByLessonId(lessonId);
    await practiceRepository.deletePendingQuizQuestions(lessonId);

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

    await practiceRepository.createQuizQuestions(quizQuestions);

    // Os dias 2 e 3 da prática (gap fill e monte a frase) saem SÓ de itens
    // STRUCTURE, um exercício por item — então a contagem de estruturas é
    // literalmente quantos exercícios o aluno recebe nesses dias. Poucas
    // estruturas passavam despercebidas até o aluno abrir a prática e achar
    // dois exercícios. O aviso é log, não erro: um texto de aula que é uma
    // lista de vocabulário pode legitimamente não ter 10 padrões gramaticais,
    // e forçar o número faria a IA inventar conteúdo — pior e mais difícil de
    // perceber do que ter poucos.
    const structureCount = mergedVocab.filter((item) => item.type === 'STRUCTURE').length;
    if (structureCount < MIN_EXPECTED_STRUCTURES) {
      console.warn(
        `[Prática] Lição ${lessonId}: só ${structureCount} estrutura(s) geradas (esperado ~${MIN_EXPECTED_STRUCTURES}). ` +
          `Os dias de "completar a frase" e "monte a frase" terão ${structureCount} exercício(s).`
      );
    }

    return await practiceRepository.findByLessonId(lessonId);
  },

  /**
   * Gera conteúdo ADICIONAL para uma lição que já tem itens, sem duplicar.
   *
   * Existe porque `generateLearningItems` só apaga o que está PENDING, e tudo
   * entra APPROVED: rodar de novo acrescentava um lote inteiro por cima do que
   * já havia. Foi assim que uma lição acumulou 59 perguntas em duas execuções,
   * com uma repetida. Aqui a duplicata é barrada duas vezes — a IA recebe a
   * lista do que já existe, e o que ela devolver é conferido contra o banco.
   *
   * Devolve o pedido e o recebido lado a lado: o modelo entrega o que o texto
   * da aula comporta, e é comum vir menos. Quem chama precisa poder dizer
   * "vieram 3 das 10" em vez de recarregar a tela como se tudo tivesse dado
   * certo.
   */
  async generateMoreContent(
    actingRole: Role,
    input: {
      lessonId: string;
      vocabCount: number;
      structureCount: number;
      quizCount: number;
      /**
       * Libera a IA a criar conteúdo além do texto da aula.
       *
       * O que entra por aqui vai para PENDING, não APPROVED — e essa é a
       * diferença que importa. Sem base no texto, não há nada contradizendo
       * uma frase errada, e este conteúdo é treinado por repetição espaçada
       * em aluno iniciante, que é justamente quem não tem repertório para
       * desconfiar. `assertLessonContentReady` já impede ativar a lição
       * enquanto houver pendência, então a revisão vira portão, não aviso.
       */
      allowInvented?: boolean;
    }
  ): Promise<GenerateMoreReport> {
    assertAdmin(actingRole);

    const { lessonId, vocabCount, structureCount, quizCount, allowInvented = false } = input;
    const reviewStatus = allowInvented ? ('PENDING' as const) : ('APPROVED' as const);
    const reasons: string[] = [];
    const lesson = await lessonService.getLessonById(actingRole, lessonId);
    if (!lesson) throw new AppError('Lição não encontrada.');

    const plainText = stripHtml(lesson.content);
    const transcript = lesson.transcript ?? '';
    if (!plainText && !transcript) {
      throw new AppError('Adicione conteúdo escrito ou áudio à lição antes de gerar com IA.');
    }

    const [existingItems, existingQuestions] = await Promise.all([
      practiceRepository.findByLessonId(lessonId),
      practiceRepository.findQuizQuestionsByLessonId(lessonId),
    ]);

    const report: GenerateMoreReport = {
      vocab: { requested: vocabCount, inserted: 0, duplicates: 0 },
      structure: { requested: structureCount, inserted: 0, duplicates: 0 },
      quiz: { requested: quizCount, inserted: 0, duplicates: 0 },
      reason: null,
      pendingReview: allowInvented,
    };

    // --- Itens de aprendizagem ---
    if (vocabCount > 0 || structureCount > 0) {
      let raw: RawLearningItem[] = [];
      try {
        const result = await extractMoreLearningItems({
          text: plainText || transcript,
          levelHint: lesson.level,
          vocabCount,
          structureCount,
          existingLemmas: existingItems.map((item) => item.lemma),
          allowInvented,
        });
        raw = result.items;
        if (result.reason) reasons.push(result.reason);
      } catch (err) {
        console.error('OpenAI (gerar mais itens) falhou:', err);
        throw new AppError('Falha ao gerar itens com IA. Tente novamente em instantes.');
      }

      const { valid, rejected } = partitionByLanguage(raw);
      if (rejected.length > 0) {
        console.warn(
          `[Prática] ${rejected.length} item(ns) extra descartado(s) por idioma na lição ${lessonId}:`,
          rejected.map(({ item, violations }) => ({
            lemma: item.lemma,
            campos: violations.map((v) => `${v.field} (${v.reason})`),
          }))
        );
      }

      // Dedupe contra o BANCO, não só dentro do lote: a exclusão via prompt
      // reduz repetição, não elimina.
      const known = new Set(existingItems.map((item) => `${item.type}::${item.lemma.trim().toLowerCase()}`));
      const novos: RawLearningItem[] = [];
      for (const item of valid) {
        const key = `${item.type}::${item.lemma.trim().toLowerCase()}`;
        if (known.has(key)) {
          if (item.type === 'VOCABULARY') report.vocab.duplicates += 1;
          else report.structure.duplicates += 1;
          continue;
        }
        known.add(key);
        novos.push(item);
      }

      // Respeita o teto total da lição, contando o que já existe.
      const vocabRoom = Math.max(0, VOCAB_CEILING - existingItems.filter((i) => i.type === 'VOCABULARY').length);
      const structureRoom = Math.max(0, STRUCTURE_CEILING - existingItems.filter((i) => i.type === 'STRUCTURE').length);
      const toInsert = [
        ...novos.filter((i) => i.type === 'VOCABULARY').slice(0, Math.min(vocabCount, vocabRoom)),
        ...novos.filter((i) => i.type === 'STRUCTURE').slice(0, Math.min(structureCount, structureRoom)),
      ];

      if (toInsert.length > 0) {
        await practiceRepository.createMany(
          toInsert.map((item) => ({
            lessonId,
            type: item.type,
            lemma: item.lemma,
            metadata: item.metadata,
            reviewStatus,
          }))
        );
      }
      report.vocab.inserted = toInsert.filter((i) => i.type === 'VOCABULARY').length;
      report.structure.inserted = toInsert.filter((i) => i.type === 'STRUCTURE').length;
    }

    // --- Perguntas de quiz ---
    if (quizCount > 0) {
      let raw: RawSectionedQuizQuestion[] = [];
      try {
        const result = await generateMoreQuizQuestions({
          text: plainText,
          transcript,
          levelHint: lesson.level,
          count: quizCount,
          existingQuestions: existingQuestions.map((q) => q.question),
          allowInvented,
        });
        raw = result.questions;
        if (result.reason) reasons.push(result.reason);
      } catch (err) {
        console.error('OpenAI (gerar mais perguntas) falhou:', err);
        throw new AppError('Falha ao gerar perguntas com IA. Tente novamente em instantes.');
      }

      const knownQuestions = new Set(existingQuestions.map((q) => q.question.trim().toLowerCase()));
      const novas: NewQuizQuestion[] = [];
      for (const question of raw) {
        const key = question.question.trim().toLowerCase();
        if (knownQuestions.has(key)) {
          report.quiz.duplicates += 1;
          continue;
        }
        // Alternativa repetida dentro da própria pergunta deixa o aluno com
        // duas opções idênticas — já aconteceu em produção.
        if (new Set(question.options.map((o) => o.trim().toLowerCase())).size !== question.options.length) {
          report.quiz.duplicates += 1;
          continue;
        }
        knownQuestions.add(key);
        novas.push({
          lessonId,
          renderMode: 'quiz_comprehensive',
          section: question.section,
          question: question.question,
          options: question.options,
          correctIndex: question.correctIndex,
          explanation: question.explanation ?? null,
          reviewStatus,
        });
      }

      const limitadas = novas.slice(0, quizCount);
      if (limitadas.length > 0) {
        await practiceRepository.createQuizQuestions(limitadas);
      }
      report.quiz.inserted = limitadas.length;
    }

    report.reason = reasons.length > 0 ? reasons.join(' ') : null;
    return report;
  },

  async approveItem(actingRole: Role, itemId: string): Promise<LearningItem> {
    assertAdmin(actingRole);
    return await practiceRepository.updateReviewStatus(itemId, 'APPROVED');
  },

  async deleteItem(actingRole: Role, itemId: string): Promise<void> {
    assertAdmin(actingRole);
    await practiceRepository.deleteById(itemId);
  },

  /**
   * Correção manual de um item pelo admin.
   *
   * A guarda de idioma aqui AVISA, mas não bloqueia: diferente da geração por
   * IA (onde um item ruim é lixo descartável e sempre dá pra gerar de novo),
   * aqui há uma pessoa decidindo conscientemente, e ela pode ter um motivo
   * legítimo que o detector não conhece — um cognato, uma expressão que se
   * escreve igual nos dois idiomas, uma lição sobre falsos cognatos. Bloquear
   * transformaria a tela de correção numa briga contra a heurística.
   */
  async updateItem(
    actingRole: Role,
    itemId: string,
    data: { lemma: string; metadata: LearningItem['metadata'] }
  ): Promise<LearningItem> {
    assertAdmin(actingRole);

    const existing = await practiceRepository.findById(itemId);
    if (!existing) {
      throw new AppError('Item não encontrado.');
    }

    const violations = findLanguageViolations({
      type: existing.type,
      lemma: data.lemma,
      metadata: data.metadata,
    });
    if (violations.length > 0) {
      console.warn(
        `[Prática] Item ${itemId} salvo pelo admin com possível conteúdo em português:`,
        violations.map((v) => `${v.field} (${v.reason}) = "${v.value}"`)
      );
    }

    return await practiceRepository.updateItemContent(itemId, data);
  },

  async approveQuizQuestion(actingRole: Role, questionId: string): Promise<QuizQuestion> {
    assertAdmin(actingRole);
    return await practiceRepository.updateQuizQuestionReviewStatus(questionId, 'APPROVED');
  },

  async deleteQuizQuestion(actingRole: Role, questionId: string): Promise<void> {
    assertAdmin(actingRole);
    await practiceRepository.deleteQuizQuestionById(questionId);
  },

  /** Correção manual de uma pergunta de quiz pelo admin. */
  async updateQuizQuestion(
    actingRole: Role,
    questionId: string,
    data: { question: string; options: string[]; correctIndex: number; explanation?: string }
  ): Promise<QuizQuestion> {
    assertAdmin(actingRole);

    // `correctIndex` é índice de array: se ele apontasse para fora das
    // alternativas, o dia de prática abriria com uma pergunta sem resposta
    // certa possível. O schema já cobre 0-3, mas a checagem contra o tamanho
    // real fecha o caso de uma edição futura mudar a quantidade.
    if (data.correctIndex >= data.options.length) {
      throw new AppError('A alternativa correta precisa ser uma das alternativas informadas.');
    }

    return await practiceRepository.updateQuizQuestionContent(questionId, {
      question: data.question,
      options: data.options,
      correctIndex: data.correctIndex,
      explanation: data.explanation?.trim() ? data.explanation.trim() : null,
    });
  },
};
