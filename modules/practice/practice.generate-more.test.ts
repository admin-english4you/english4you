import { describe, it, expect } from 'vitest';
import { GenerateMoreContentSchema, AIGeneratedSectionedQuizQuestionSchema } from './practice.schema';

describe('GenerateMoreContentSchema', () => {
  const base = {
    lessonId: '11111111-1111-4111-8111-111111111111',
    planId: '22222222-2222-4222-8222-222222222222',
  };

  it('aceita pedido só de estruturas (o caso real: dias 2 e 3 curtos)', () => {
    const parsed = GenerateMoreContentSchema.safeParse({
      ...base,
      vocabCount: 0,
      structureCount: 8,
      quizCount: 0,
    });
    expect(parsed.success).toBe(true);
  });

  it('recusa pedido zerado — clicar sem escolher nada gastaria chamada de API à toa', () => {
    const parsed = GenerateMoreContentSchema.safeParse({
      ...base,
      vocabCount: 0,
      structureCount: 0,
      quizCount: 0,
    });
    expect(parsed.success).toBe(false);
  });

  it('limita o teto por chamada', () => {
    const parsed = GenerateMoreContentSchema.safeParse({
      ...base,
      vocabCount: 50,
      structureCount: 0,
      quizCount: 0,
    });
    expect(parsed.success).toBe(false);
  });

  it('o modo livre é desligado por padrão', () => {
    // Importa: gerar além do texto é o único caminho em que a IA pode inventar
    // inglês errado sem nada contradizendo. Só pode ser ligado por escolha
    // explícita do admin, nunca por omissão.
    const parsed = GenerateMoreContentSchema.parse({
      ...base,
      vocabCount: 0,
      structureCount: 3,
      quizCount: 0,
    });
    expect(parsed.allowInvented).toBe(false);
  });

  it('aceita o modo livre quando pedido explicitamente', () => {
    const parsed = GenerateMoreContentSchema.parse({
      ...base,
      vocabCount: 0,
      structureCount: 3,
      quizCount: 0,
      allowInvented: true,
    });
    expect(parsed.allowInvented).toBe(true);
  });
});

describe('AIGeneratedSectionedQuizQuestionSchema', () => {
  const questao = {
    question: 'What does "farm" mean?',
    options: ['A farm', 'A city', 'A car', 'A book'],
    correctIndex: 0,
    section: 'vocabulary' as const,
  };

  it('exige a seção declarada — é ela que decide em qual dia a pergunta cai', () => {
    expect(AIGeneratedSectionedQuizQuestionSchema.safeParse(questao).success).toBe(true);

    const { section, ...semSecao } = questao;
    expect(AIGeneratedSectionedQuizQuestionSchema.safeParse(semSecao).success).toBe(false);
  });

  it('recusa seção inválida', () => {
    expect(
      AIGeneratedSectionedQuizQuestionSchema.safeParse({ ...questao, section: 'listening' }).success
    ).toBe(false);
  });

  it('recusa correctIndex fora das alternativas', () => {
    expect(
      AIGeneratedSectionedQuizQuestionSchema.safeParse({ ...questao, correctIndex: 7 }).success
    ).toBe(false);
  });

  it('exige exatamente 4 alternativas', () => {
    expect(
      AIGeneratedSectionedQuizQuestionSchema.safeParse({ ...questao, options: ['a', 'b', 'c'] }).success
    ).toBe(false);
  });
});
