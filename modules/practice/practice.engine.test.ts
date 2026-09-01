import { describe, expect, it } from 'vitest';
import {
  MAX_ITEMS_PER_SESSION,
  REDO_UNLOCK_COST,
  XP_PER_DAY,
  assemblePracticeItems,
  buildCycleForClassRecord,
  buildCycleModes,
  buildPracticeCalendar,
  isPlayable,
  practiceDayKey,
  resolvePracticeDayStates,
} from './practice.engine';
import type {
  CycleSource,
  LearningItem,
  PracticeDayDescriptor,
  QuizQuestion,
  QuizSectionType,
  StructureMetadata,
  VocabMetadata,
} from './practice.types';

// ---------------------------------------------------------------------------
// Fábricas de fixture
// ---------------------------------------------------------------------------

function makeSource(overrides: Partial<CycleSource> = {}): CycleSource {
  return {
    lessonId: 'lesson-a',
    lessonTitle: 'Present Perfect',
    lessonLevel: 'B1',
    classRecordId: 'record-a',
    classDateKey: '2026-08-04', // terça
    activatedDayKey: null,
    hasAudio: true,
    ...overrides,
  };
}

function makeVocab(id: string, overrides: Partial<VocabMetadata> = {}): LearningItem {
  const metadata: VocabMetadata = {
    type: 'noun',
    level: 'B1',
    phonetic: '/kɒfi/',
    translation: 'café',
    is_visual: true,
    key_image_words: 'coffee cup',
    image_url: null,
    meanings: [{ definition: 'a hot drink', translation: 'café' }],
    forms: { base: 'coffee' },
    examples: [
      { text: 'I drink coffee.', translation: 'Eu bebo café.' },
      { text: 'Coffee is hot.', translation: 'Café é quente.' },
    ],
    ...overrides,
  };
  return {
    id,
    lessonId: 'lesson-a',
    type: 'VOCABULARY',
    lemma: 'coffee',
    metadata,
    reviewStatus: 'APPROVED',
    createdAt: new Date('2026-08-01'),
  };
}

function makeStructure(id: string, overrides: Partial<StructureMetadata> = {}): LearningItem {
  const metadata: StructureMetadata = {
    level: 'B1',
    structure_type: 'Verb Tense',
    syntactic_pattern: 'SVO',
    explanation: 'Sujeito + verbo + objeto.',
    examples: [
      {
        text: 'I drink coffee.',
        translation: 'Eu bebo café.',
        word_order: [
          { word: 'I', index: 0, role: 'subject' },
          { word: 'drink', index: 1, role: 'verb' },
          { word: 'coffee.', index: 2, role: 'object' },
        ],
      },
      {
        text: 'She reads books.',
        translation: 'Ela lê livros.',
        word_order: [
          { word: 'She', index: 0, role: 'subject' },
          { word: 'reads', index: 1, role: 'verb' },
          { word: 'books.', index: 2, role: 'object' },
        ],
      },
      {
        text: 'They play football.',
        translation: 'Eles jogam futebol.',
        word_order: [
          { word: 'They', index: 0, role: 'subject' },
          { word: 'play', index: 1, role: 'verb' },
          { word: 'football.', index: 2, role: 'object' },
        ],
      },
    ],
    ...overrides,
  };
  return {
    id,
    lessonId: 'lesson-a',
    type: 'STRUCTURE',
    lemma: 'Simple Present',
    metadata,
    reviewStatus: 'APPROVED',
    createdAt: new Date('2026-08-01'),
  };
}

function makeQuestion(
  id: string,
  section: QuizSectionType | null,
  renderMode: 'quiz_comprehensive' | 'listening_choice' = 'quiz_comprehensive'
): QuizQuestion {
  return {
    id,
    lessonId: 'lesson-a',
    renderMode,
    section,
    question: `Pergunta ${id}?`,
    options: ['a', 'b', 'c', 'd'],
    correctIndex: 1,
    explanation: 'Porque sim.',
    reviewStatus: 'APPROVED',
    createdAt: new Date('2026-08-01'),
  };
}

// ---------------------------------------------------------------------------
// Ciclo e calendário
// ---------------------------------------------------------------------------

describe('buildCycleModes', () => {
  it('com áudio: dia 5 é quiz das 4 seções e dia 6 é listening', () => {
    const modes = buildCycleModes(true);
    expect(modes.map((m) => m.renderMode)).toEqual([
      'flashcard_visual',
      'gap_fill_listening',
      'sentence_unscramble',
      'flashcard_recall',
      'quiz_comprehensive',
      'listening_choice',
    ]);
    expect(modes[4].quizSections).toEqual(['vocabulary', 'grammar', 'context', 'comprehension']);
    expect(modes[5].quizSections).toBeNull();
  });

  it('sem áudio: listening cai e o quiz se divide em dois dias', () => {
    const modes = buildCycleModes(false);
    expect(modes.map((m) => m.renderMode)).toEqual([
      'flashcard_visual',
      'gap_fill_listening',
      'sentence_unscramble',
      'flashcard_recall',
      'quiz_comprehensive',
      'quiz_comprehensive',
    ]);
    expect(modes[4].quizSections).toEqual(['vocabulary', 'grammar']);
    expect(modes[5].quizSections).toEqual(['context', 'comprehension']);
  });

  it('sem áudio nenhuma seção fica órfã — as 4 aparecem entre os dias 5 e 6', () => {
    const modes = buildCycleModes(false);
    const covered = [...(modes[4].quizSections ?? []), ...(modes[5].quizSections ?? [])];
    expect(covered.sort()).toEqual(['comprehension', 'context', 'grammar', 'vocabulary']);
  });

  it('sempre gera exatamente 6 dias', () => {
    expect(buildCycleModes(true)).toHaveLength(6);
    expect(buildCycleModes(false)).toHaveLength(6);
  });
});

describe('buildCycleForClassRecord', () => {
  it('o dia 1 é o DIA SEGUINTE à aula', () => {
    const days = buildCycleForClassRecord(makeSource({ classDateKey: '2026-08-04' }));
    expect(days[0].dayIndex).toBe(1);
    expect(days[0].dateKey).toBe('2026-08-05');
  });

  it('cobre 6 dias corridos', () => {
    const days = buildCycleForClassRecord(makeSource({ classDateKey: '2026-08-04' }));
    expect(days.map((d) => d.dateKey)).toEqual([
      '2026-08-05',
      '2026-08-06',
      '2026-08-07',
      '2026-08-08',
      '2026-08-09',
      '2026-08-10',
    ]);
  });

  it('atravessa a virada de mês', () => {
    const days = buildCycleForClassRecord(makeSource({ classDateKey: '2026-08-30' }));
    expect(days.map((d) => d.dateKey)).toEqual([
      '2026-08-31',
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
      '2026-09-04',
      '2026-09-05',
    ]);
  });

  it('quando a lição foi ativada DEPOIS da aula, o ciclo conta da ativação', () => {
    const days = buildCycleForClassRecord(
      makeSource({ classDateKey: '2026-08-04', activatedDayKey: '2026-08-10' })
    );
    expect(days[0].dateKey).toBe('2026-08-11');
  });

  it('ativação anterior à aula não antecipa o ciclo', () => {
    const days = buildCycleForClassRecord(
      makeSource({ classDateKey: '2026-08-04', activatedDayKey: '2026-07-20' })
    );
    expect(days[0].dateKey).toBe('2026-08-05');
  });

  it('carrega o classRecordId apenas como proveniência', () => {
    const days = buildCycleForClassRecord(makeSource({ classRecordId: 'rec-42' }));
    expect(days.every((d) => d.classRecordId === 'rec-42')).toBe(true);
  });
});

describe('buildPracticeCalendar', () => {
  it('ciclos de aulas diferentes SE SOBREPÕEM (não são deduplicados)', () => {
    // Turma com duas aulas por semana: terça (lição A) e sexta (lição B).
    const days = buildPracticeCalendar([
      makeSource({ lessonId: 'a', lessonTitle: 'Aula A', classRecordId: 'r1', classDateKey: '2026-08-04' }),
      makeSource({ lessonId: 'b', lessonTitle: 'Aula B', classRecordId: 'r2', classDateKey: '2026-08-07' }),
    ]);

    expect(days).toHaveLength(12);

    // 08/08 tem o dia 4 da lição A e o dia 1 da lição B.
    const onEighth = days.filter((d) => d.dateKey === '2026-08-08');
    expect(onEighth).toHaveLength(2);
    expect(onEighth.map((d) => `${d.lessonId}:${d.dayIndex}`).sort()).toEqual(['a:4', 'b:1']);
  });

  it('ordena por data', () => {
    const days = buildPracticeCalendar([
      makeSource({ lessonId: 'b', lessonTitle: 'B', classDateKey: '2026-08-07' }),
      makeSource({ lessonId: 'a', lessonTitle: 'A', classDateKey: '2026-08-04' }),
    ]);
    const keys = days.map((d) => d.dateKey);
    expect([...keys].sort()).toEqual(keys);
  });

  it('a chave (lessonId, dayIndex) nunca colide entre ciclos', () => {
    const days = buildPracticeCalendar([
      makeSource({ lessonId: 'a', classDateKey: '2026-08-04' }),
      makeSource({ lessonId: 'b', classDateKey: '2026-08-05' }),
      makeSource({ lessonId: 'c', classDateKey: '2026-08-06' }),
    ]);
    const keys = days.map((d) => practiceDayKey(d.lessonId, d.dayIndex));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('devolve vazio sem aulas', () => {
    expect(buildPracticeCalendar([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Tabela de status
// ---------------------------------------------------------------------------

describe('resolvePracticeDayStates', () => {
  const days: PracticeDayDescriptor[] = buildCycleForClassRecord(
    makeSource({ classDateKey: '2026-08-04' })
  );
  // dias: 05, 06, 07, 08, 09, 10 de agosto

  const emptyCtx = {
    todayKey: '2026-08-08',
    completedKeys: new Map<string, number>(),
    unlockedKeys: new Set<string>(),
    emptyKeys: new Set<string>(),
  };

  it('dia futuro é LOCKED_FUTURE', () => {
    const states = resolvePracticeDayStates(days, emptyCtx);
    expect(states.find((s) => s.dateKey === '2026-08-09')?.status).toBe('LOCKED_FUTURE');
    expect(states.find((s) => s.dateKey === '2026-08-10')?.status).toBe('LOCKED_FUTURE');
  });

  it('o dia de hoje é AVAILABLE e vale XP', () => {
    const today = resolvePracticeDayStates(days, emptyCtx).find((s) => s.dateKey === '2026-08-08');
    expect(today?.status).toBe('AVAILABLE');
    expect(today?.xpReward).toBe(XP_PER_DAY);
  });

  it('dia passado não feito é EXPIRED e comprável', () => {
    const past = resolvePracticeDayStates(days, emptyCtx).find((s) => s.dateKey === '2026-08-05');
    expect(past?.status).toBe('EXPIRED');
    expect(past?.unlockCost).toBe(REDO_UNLOCK_COST);
    expect(past?.xpReward).toBe(0);
  });

  it('dia concluído é COMPLETED e expõe o XP ganho', () => {
    const states = resolvePracticeDayStates(days, {
      ...emptyCtx,
      completedKeys: new Map([[practiceDayKey('lesson-a', 1), XP_PER_DAY]]),
    });
    const completed = states.find((s) => s.dayIndex === 1);
    expect(completed?.status).toBe('COMPLETED');
    expect(completed?.xpEarned).toBe(XP_PER_DAY);
  });

  it('dia concluído E comprado é REPLAYABLE e NÃO dá XP', () => {
    const states = resolvePracticeDayStates(days, {
      ...emptyCtx,
      completedKeys: new Map([[practiceDayKey('lesson-a', 1), XP_PER_DAY]]),
      unlockedKeys: new Set([practiceDayKey('lesson-a', 1)]),
    });
    const replay = states.find((s) => s.dayIndex === 1);
    expect(replay?.status).toBe('REPLAYABLE');
    expect(replay?.xpReward).toBe(0);
  });

  it('dia perdido e comprado é REPLAYABLE e NÃO dá XP', () => {
    const states = resolvePracticeDayStates(days, {
      ...emptyCtx,
      unlockedKeys: new Set([practiceDayKey('lesson-a', 2)]),
    });
    const replay = states.find((s) => s.dayIndex === 2);
    expect(replay?.status).toBe('REPLAYABLE');
    expect(replay?.xpReward).toBe(0);
    expect(replay?.xpEarned).toBeNull();
  });

  it('EMPTY vence todas as outras condições e não é comprável', () => {
    const states = resolvePracticeDayStates(days, {
      ...emptyCtx,
      emptyKeys: new Set([practiceDayKey('lesson-a', 4)]),
    });
    const empty = states.find((s) => s.dayIndex === 4);
    expect(empty?.status).toBe('EMPTY'); // seria AVAILABLE (é hoje)
    expect(empty?.unlockCost).toBeNull();
  });

  it('isPlayable libera apenas AVAILABLE e REPLAYABLE', () => {
    expect(isPlayable('AVAILABLE')).toBe(true);
    expect(isPlayable('REPLAYABLE')).toBe(true);
    expect(isPlayable('COMPLETED')).toBe(false);
    expect(isPlayable('EXPIRED')).toBe(false);
    expect(isPlayable('LOCKED_FUTURE')).toBe(false);
    expect(isPlayable('EMPTY')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Montagem dos itens
// ---------------------------------------------------------------------------

const baseAssemble = {
  lessonId: 'lesson-a',
  dayIndex: 1,
  renderMode: 'flashcard_visual' as const,
  quizSections: null,
  items: [] as LearningItem[],
  questions: [] as QuizQuestion[],
};

describe('assemblePracticeItems — flashcards', () => {
  it('flashcard_visual vai da palavra para a tradução', () => {
    const [item] = assemblePracticeItems({ ...baseAssemble, items: [makeVocab('v1')] });
    expect(item.data.flashcard?.front).toBe('coffee');
    expect(item.data.flashcard?.back).toBe('café');
    expect(item.type).toBe('item');
  });

  it('flashcard_recall inverte o sentido e não usa imagem', () => {
    const [item] = assemblePracticeItems({
      ...baseAssemble,
      dayIndex: 4,
      renderMode: 'flashcard_recall',
      items: [makeVocab('v1', { image_url: 'https://exemplo/img.png' })],
    });
    expect(item.data.flashcard?.front).toBe('café');
    expect(item.data.flashcard?.back).toBe('coffee');
    expect(item.data.flashcard?.imageUrl).toBeNull();
  });

  it('flashcard_visual prioriza itens com imagem, mas mantém os sem', () => {
    const items = [
      makeVocab('sem-imagem'),
      makeVocab('com-imagem', { image_url: 'https://exemplo/img.png' }),
    ];
    const result = assemblePracticeItems({ ...baseAssemble, items });
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('com-imagem');
  });

  it('ignora estruturas no pool de flashcards', () => {
    const result = assemblePracticeItems({ ...baseAssemble, items: [makeStructure('s1')] });
    expect(result).toEqual([]);
  });

  it('descarta vocabulário sem tradução', () => {
    const semTraducao = makeVocab('v1', { translation: undefined, meanings: [] });
    expect(assemblePracticeItems({ ...baseAssemble, items: [semTraducao] })).toEqual([]);
  });

  it('respeita o teto de itens por sessão', () => {
    const items = Array.from({ length: 25 }, (_, i) => makeVocab(`v${i}`));
    expect(assemblePracticeItems({ ...baseAssemble, items })).toHaveLength(MAX_ITEMS_PER_SESSION);
  });
});

describe('assemblePracticeItems — gap_fill_listening', () => {
  const input = {
    ...baseAssemble,
    dayIndex: 2,
    renderMode: 'gap_fill_listening' as const,
    items: [makeStructure('s1')],
  };

  it('abre uma lacuna e guarda a resposta', () => {
    const [item] = assemblePracticeItems(input);
    expect(item.data.gapFill?.sentenceWithGap).toContain('____');
    expect(item.data.gapFill?.correctAnswer).toBeTruthy();
    expect(item.data.gapFill?.fullSentenceForTTS).toBe(item.mainText);
  });

  it('a resposta não aparece na frase com lacuna', () => {
    const [item] = assemblePracticeItems(input);
    const { sentenceWithGap, correctAnswer } = item.data.gapFill!;
    expect(sentenceWithGap.includes(correctAnswer)).toBe(false);
  });

  it('a lacuna é sempre a MESMA em execuções repetidas (determinismo)', () => {
    const first = assemblePracticeItems(input)[0].data.gapFill;
    for (let i = 0; i < 100; i += 1) {
      const again = assemblePracticeItems(input)[0].data.gapFill;
      expect(again?.correctAnswer).toBe(first?.correctAnswer);
      expect(again?.sentenceWithGap).toBe(first?.sentenceWithGap);
    }
  });

  it('a resposta vem sem pontuação', () => {
    const [item] = assemblePracticeItems(input);
    expect(item.data.gapFill?.correctAnswer).not.toMatch(/[.,!?]/);
  });

  it('não apaga palavras funcionais quando há palavras de conteúdo', () => {
    const comArtigo = makeStructure('s1', {
      examples: [
        {
          text: 'The cat drinks milk.',
          translation: 'O gato bebe leite.',
          word_order: [
            { word: 'The', index: 0, role: 'article' },
            { word: 'cat', index: 1, role: 'subject' },
            { word: 'drinks', index: 2, role: 'verb' },
            { word: 'milk.', index: 3, role: 'object' },
          ],
        },
      ],
    });
    const [item] = assemblePracticeItems({ ...input, items: [comArtigo] });
    expect(item.data.gapFill?.correctAnswer).not.toBe('The');
  });

  it('devolve vazio quando a estrutura não tem exemplos', () => {
    const vazio = makeStructure('s1', { examples: [] });
    expect(assemblePracticeItems({ ...input, items: [vazio] })).toEqual([]);
  });

  it('ignora vocabulário no pool', () => {
    expect(assemblePracticeItems({ ...input, items: [makeVocab('v1')] })).toEqual([]);
  });
});

describe('assemblePracticeItems — sentence_unscramble', () => {
  const input = {
    ...baseAssemble,
    dayIndex: 3,
    renderMode: 'sentence_unscramble' as const,
    items: [makeStructure('s1')],
  };

  it('a ordem correta segue o índice das palavras', () => {
    const [item] = assemblePracticeItems(input);
    const { correctOrder } = item.data.unscramble!;
    expect(correctOrder.length).toBeGreaterThanOrEqual(3);
  });

  it('o embaralhado NUNCA é igual à ordem correta', () => {
    const [item] = assemblePracticeItems(input);
    const { scrambledWords, correctOrder } = item.data.unscramble!;
    expect(scrambledWords.join(' ')).not.toBe(correctOrder.join(' '));
  });

  it('o embaralhado contém exatamente as mesmas palavras', () => {
    const [item] = assemblePracticeItems(input);
    const { scrambledWords, correctOrder } = item.data.unscramble!;
    expect([...scrambledWords].sort()).toEqual([...correctOrder].sort());
  });

  it('é determinístico entre execuções', () => {
    const first = assemblePracticeItems(input)[0].data.unscramble;
    for (let i = 0; i < 50; i += 1) {
      expect(assemblePracticeItems(input)[0].data.unscramble?.scrambledWords).toEqual(
        first?.scrambledWords
      );
    }
  });

  it('descarta exemplos com menos de duas palavras', () => {
    const curto = makeStructure('s1', {
      examples: [
        {
          text: 'Go.',
          translation: 'Vá.',
          word_order: [{ word: 'Go.', index: 0, role: 'verb' }],
        },
      ],
    });
    expect(assemblePracticeItems({ ...input, items: [curto] })).toEqual([]);
  });
});

describe('assemblePracticeItems — divisão de exemplos entre gap_fill e unscramble', () => {
  // Regressão do bug em produção: os dois dias sorteavam o exemplo de forma
  // independente e caíam no MESMO exemplo por acaso em quase metade dos
  // itens de estrutura, deixando o terceiro exemplo cadastrado inatingível
  // para sempre (mesma lição/dia sempre produz o mesmo resultado).
  const item = makeStructure('s1');

  it('gap_fill_listening e sentence_unscramble usam frases DIFERENTES do mesmo item', () => {
    const gapFillItem = assemblePracticeItems({
      ...baseAssemble,
      dayIndex: 2,
      renderMode: 'gap_fill_listening',
      items: [item],
    })[0];
    const unscrambleItem = assemblePracticeItems({
      ...baseAssemble,
      dayIndex: 3,
      renderMode: 'sentence_unscramble',
      items: [item],
    })[0];

    expect(gapFillItem.mainText).not.toBe(unscrambleItem.mainText);
  });

  it('a divisão é estável entre execuções (não é sorteio a cada request)', () => {
    const rodada1 = assemblePracticeItems({
      ...baseAssemble,
      dayIndex: 2,
      renderMode: 'gap_fill_listening',
      items: [item],
    })[0].mainText;
    const rodada2 = assemblePracticeItems({
      ...baseAssemble,
      dayIndex: 2,
      renderMode: 'gap_fill_listening',
      items: [item],
    })[0].mainText;

    expect(rodada1).toBe(rodada2);
  });

  it('com só 1 exemplo (mínimo abaixo do normal), os dois dias ainda funcionam usando o único disponível', () => {
    const umExemplo = makeStructure('s1', {
      examples: [
        {
          text: 'I drink coffee.',
          translation: 'Eu bebo café.',
          word_order: [
            { word: 'I', index: 0, role: 'subject' },
            { word: 'drink', index: 1, role: 'verb' },
            { word: 'coffee.', index: 2, role: 'object' },
          ],
        },
      ],
    });

    const gapFillItem = assemblePracticeItems({
      ...baseAssemble,
      dayIndex: 2,
      renderMode: 'gap_fill_listening',
      items: [umExemplo],
    })[0];
    const unscrambleItem = assemblePracticeItems({
      ...baseAssemble,
      dayIndex: 3,
      renderMode: 'sentence_unscramble',
      items: [umExemplo],
    })[0];

    expect(gapFillItem.mainText).toBe('I drink coffee.');
    expect(unscrambleItem.mainText).toBe('I drink coffee.');
  });

  it('quando o exemplo do slot não serve pro gap fill, tenta outro exemplo em vez de descartar o item', () => {
    // Antes: sorteava só este exemplo (sem palavra útil pra virar lacuna) e o
    // item sumia do dia inteiro. Agora precisa tentar os outros exemplos.
    const primeiroSemCandidato = makeStructure('s1', {
      examples: [
        {
          // Só palavras de 1 letra depois de stripar pontuação: nenhuma
          // serve de alvo de lacuna (o filtro exige length > 1).
          text: 'I a.',
          translation: '(inválido de propósito)',
          word_order: [
            { word: 'I', index: 0, role: 'subject' },
            { word: 'a.', index: 1, role: 'article' },
          ],
        },
        {
          text: 'She reads books.',
          translation: 'Ela lê livros.',
          word_order: [
            { word: 'She', index: 0, role: 'subject' },
            { word: 'reads', index: 1, role: 'verb' },
            { word: 'books.', index: 2, role: 'object' },
          ],
        },
      ],
    });

    const result = assemblePracticeItems({
      ...baseAssemble,
      dayIndex: 2,
      renderMode: 'gap_fill_listening',
      items: [primeiroSemCandidato],
    });

    expect(result).toHaveLength(1);
    expect(result[0].data.gapFill?.correctAnswer).toBeTruthy();
  });
});

describe('assemblePracticeItems — quizzes', () => {
  it('mapeia pergunta, opções e resposta', () => {
    const [item] = assemblePracticeItems({
      ...baseAssemble,
      dayIndex: 5,
      renderMode: 'quiz_comprehensive',
      quizSections: ['vocabulary'],
      questions: [makeQuestion('q1', 'vocabulary')],
    });
    expect(item.data.quiz?.options).toHaveLength(4);
    expect(item.data.quiz?.correctIndex).toBe(1);
    expect(item.data.quiz?.explanation).toBe('Porque sim.');
  });

  it('equilibra as perguntas entre as seções pedidas', () => {
    const questions = [
      ...Array.from({ length: 10 }, (_, i) => makeQuestion(`voc${i}`, 'vocabulary')),
      ...Array.from({ length: 10 }, (_, i) => makeQuestion(`gra${i}`, 'grammar')),
    ];
    const result = assemblePracticeItems({
      ...baseAssemble,
      dayIndex: 5,
      renderMode: 'quiz_comprehensive',
      quizSections: ['vocabulary', 'grammar'],
      questions,
    });

    expect(result).toHaveLength(MAX_ITEMS_PER_SESSION);
    const vocCount = result.filter((r) => r.id.startsWith('voc')).length;
    const graCount = result.filter((r) => r.id.startsWith('gra')).length;
    expect(vocCount).toBe(5);
    expect(graCount).toBe(5);
  });

  it('quando uma seção tem poucas perguntas, a outra completa a sessão', () => {
    const questions = [
      makeQuestion('voc0', 'vocabulary'),
      ...Array.from({ length: 12 }, (_, i) => makeQuestion(`gra${i}`, 'grammar')),
    ];
    const result = assemblePracticeItems({
      ...baseAssemble,
      dayIndex: 5,
      renderMode: 'quiz_comprehensive',
      quizSections: ['vocabulary', 'grammar'],
      questions,
    });
    expect(result).toHaveLength(MAX_ITEMS_PER_SESSION);
    expect(result.filter((r) => r.id.startsWith('voc'))).toHaveLength(1);
  });

  it('listening_choice usa as perguntas sem filtro de seção', () => {
    const questions = Array.from({ length: 3 }, (_, i) =>
      makeQuestion(`lis${i}`, null, 'listening_choice')
    );
    const result = assemblePracticeItems({
      ...baseAssemble,
      dayIndex: 6,
      renderMode: 'listening_choice',
      quizSections: null,
      questions,
    });
    expect(result).toHaveLength(3);
    expect(result[0].renderMode).toBe('listening_choice');
  });

  it('devolve vazio sem perguntas', () => {
    expect(
      assemblePracticeItems({
        ...baseAssemble,
        dayIndex: 5,
        renderMode: 'quiz_comprehensive',
        quizSections: ['vocabulary'],
        questions: [],
      })
    ).toEqual([]);
  });
});

describe('assemblePracticeItems — invariantes gerais', () => {
  it('nunca gera dois itens a partir da mesma linha de origem', () => {
    const result = assemblePracticeItems({
      ...baseAssemble,
      dayIndex: 3,
      renderMode: 'sentence_unscramble',
      items: [makeStructure('s1'), makeStructure('s2')],
    });
    const ids = result.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('review_standard fica fora do ciclo e não monta nada', () => {
    expect(
      assemblePracticeItems({
        ...baseAssemble,
        renderMode: 'review_standard',
        items: [makeVocab('v1'), makeStructure('s1')],
      })
    ).toEqual([]);
  });

  it('todo item carrega o lessonId e o renderMode do dia', () => {
    const result = assemblePracticeItems({ ...baseAssemble, items: [makeVocab('v1')] });
    expect(result.every((r) => r.lessonId === 'lesson-a')).toBe(true);
    expect(result.every((r) => r.renderMode === 'flashcard_visual')).toBe(true);
  });
});
