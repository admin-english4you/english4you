import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UpdateLearningItemSchema, UpdateQuizQuestionSchema, wordOrderMatchesText } from './practice.schema';

/**
 * Edição manual de exercícios pelo admin: o que é salvo vai direto para o motor
 * de prática, então a validação precisa barrar o que quebraria um dia.
 */

const findById = vi.fn();
const updateItemContent = vi.fn();
const updateQuizQuestionContent = vi.fn();

vi.mock('./practice.repository', () => ({
  practiceRepository: {
    findById: (...a: unknown[]) => findById(...a),
    updateItemContent: (...a: unknown[]) => updateItemContent(...a),
    updateQuizQuestionContent: (...a: unknown[]) => updateQuizQuestionContent(...a),
  },
}));
vi.mock('@/modules/lesson/lesson.service', () => ({ lessonService: {} }));
vi.mock('@/lib/openai', () => ({}));

const { practiceService } = await import('./practice.service');

const IDS = {
  itemId: '11111111-1111-4111-8111-111111111111',
  planId: '22222222-2222-4222-8222-222222222222',
};

function exemplo(text: string, words: string[]) {
  return {
    text,
    translation: 'tradução',
    word_order: words.map((word, index) => ({ word, index, role: 'word' })),
  };
}

function estrutura(examples: ReturnType<typeof exemplo>[]) {
  return {
    level: 'A1',
    structure_type: 'Verb Tense',
    explanation: 'Presente contínuo.',
    examples,
  };
}

describe('wordOrderMatchesText', () => {
  it('aceita as mesmas palavras na mesma ordem, ignorando pontuação e maiúsculas', () => {
    expect(wordOrderMatchesText(exemplo('She is reading a book.', ['she', 'is', 'reading', 'a', 'book']))).toBe(true);
  });

  it('recusa palavra faltando ou trocada de lugar', () => {
    expect(wordOrderMatchesText(exemplo('She is reading a book.', ['She', 'is', 'reading', 'book']))).toBe(false);
    expect(wordOrderMatchesText(exemplo('She is reading a book.', ['is', 'She', 'reading', 'a', 'book']))).toBe(false);
  });

  it('aceita expressão de várias palavras num mesmo bloco', () => {
    expect(wordOrderMatchesText(exemplo('I live in New York.', ['I', 'live', 'in', 'New York']))).toBe(true);
  });
});

describe('UpdateLearningItemSchema', () => {
  const okExamples = [
    exemplo('She is reading.', ['She', 'is', 'reading']),
    exemplo('They are eating.', ['They', 'are', 'eating']),
    exemplo('He is running.', ['He', 'is', 'running']),
  ];

  it('aceita estrutura com exemplos coerentes', () => {
    const parsed = UpdateLearningItemSchema.safeParse({ ...IDS, lemma: 'Present continuous', metadata: estrutura(okExamples) });
    expect(parsed.success).toBe(true);
  });

  it('recusa "monte a frase" que não bate com a frase, apontando o exemplo', () => {
    const quebrado = [...okExamples.slice(0, 2), exemplo('He is running.', ['He', 'runs'])];
    const parsed = UpdateLearningItemSchema.safeParse({ ...IDS, lemma: 'Present continuous', metadata: estrutura(quebrado) });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0].message).toMatch(/Exemplo 3/);
  });

  it('recusa estrutura com menos de 3 exemplos', () => {
    const parsed = UpdateLearningItemSchema.safeParse({
      ...IDS,
      lemma: 'Present continuous',
      metadata: estrutura(okExamples.slice(0, 2)),
    });
    expect(parsed.success).toBe(false);
  });
});

describe('UpdateQuizQuestionSchema', () => {
  it('recusa alternativas repetidas', () => {
    const parsed = UpdateQuizQuestionSchema.safeParse({
      questionId: IDS.itemId,
      planId: IDS.planId,
      question: 'Pergunta?',
      options: ['a', 'b', 'a', 'c'],
      correctIndex: 0,
    });
    expect(parsed.success).toBe(false);
  });
});

describe('practiceService — edição', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findById.mockResolvedValue({ id: IDS.itemId, type: 'STRUCTURE' });
    updateItemContent.mockImplementation(async (_id: string, data: unknown) => data);
    updateQuizQuestionContent.mockImplementation(async (_id: string, data: unknown) => data);
  });

  it('updateItem recusa quem não é admin', async () => {
    await expect(
      practiceService.updateItem('TEACHER', IDS.itemId, { lemma: 'x', metadata: estrutura([]) as never })
    ).rejects.toThrow(/administradores/);
    expect(updateItemContent).not.toHaveBeenCalled();
  });

  it('updateItem recusa item inexistente', async () => {
    findById.mockResolvedValue(undefined);
    await expect(
      practiceService.updateItem('ADMIN', IDS.itemId, { lemma: 'x', metadata: estrutura([]) as never })
    ).rejects.toThrow(/não encontrado/);
  });

  it('updateQuizQuestion recusa resposta certa fora das alternativas', async () => {
    await expect(
      practiceService.updateQuizQuestion('ADMIN', IDS.itemId, {
        question: 'Pergunta?',
        options: ['a', 'b', 'c'],
        correctIndex: 3,
      })
    ).rejects.toThrow(/alternativa correta/);
    expect(updateQuizQuestionContent).not.toHaveBeenCalled();
  });

  it('updateQuizQuestion grava explicação vazia como nula', async () => {
    await practiceService.updateQuizQuestion('ADMIN', IDS.itemId, {
      question: 'Pergunta?',
      options: ['a', 'b', 'c', 'd'],
      correctIndex: 1,
      explanation: '   ',
    });
    expect(updateQuizQuestionContent).toHaveBeenCalledWith(IDS.itemId, expect.objectContaining({ explanation: null }));
  });
});
