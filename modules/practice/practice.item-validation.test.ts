import { describe, it, expect } from 'vitest';
import { AIGeneratedLearningItemSchema, AIGeneratedLearningItemsSchema } from './practice.schema';

/**
 * Trava a regressão que fez uma lição terminar com 59 perguntas de quiz e ZERO
 * itens de aprendizagem: a resposta da IA era validada como ARRAY, então um
 * único item malformado reprovava o lote inteiro e ele era descartado em
 * silêncio. Ver `extractLearningItems` em `lib/openai.ts`.
 */

function vocab(lemma: string, exampleCount: number) {
  return {
    type: 'VOCABULARY' as const,
    lemma,
    metadata: {
      type: 'noun',
      level: 'A1',
      phonetic: `/${lemma}/`,
      is_visual: false,
      key_image_words: lemma,
      meanings: [{ definition: `meaning of ${lemma}`, translation: `tradução de ${lemma}` }],
      forms: { base: lemma },
      examples: Array.from({ length: exampleCount }, (_, i) => ({
        text: `Example ${i} with ${lemma}.`,
        translation: `Exemplo ${i} com ${lemma}.`,
      })),
    },
  };
}

describe('validação da resposta de itens da IA', () => {
  it('o schema de ARRAY reprova o lote inteiro por causa de um item ruim', () => {
    // Documenta o comportamento que motivou a mudança: 2 itens bons + 1 com
    // exemplos de menos = nada aproveitado.
    const lote = [vocab('apple', 2), vocab('house', 2), vocab('broken', 1)];

    expect(AIGeneratedLearningItemsSchema.safeParse(lote).success).toBe(false);
  });

  it('validando item a item, os bons sobrevivem ao item ruim', () => {
    const lote = [vocab('apple', 2), vocab('house', 2), vocab('broken', 1)];

    const valid = lote.filter((item) => AIGeneratedLearningItemSchema.safeParse(item).success);

    expect(valid).toHaveLength(2);
    expect(valid.map((i) => i.lemma)).toEqual(['apple', 'house']);
  });

  it('vocabulário precisa de 2 exemplos e estrutura de 3 — o mínimo que a IA sempre entrega', () => {
    // Todo item em produção vem com exatamente o mínimo, então é nesse limite
    // que a validação vive: um exemplo a menos e o item cai.
    expect(AIGeneratedLearningItemSchema.safeParse(vocab('apple', 2)).success).toBe(true);
    expect(AIGeneratedLearningItemSchema.safeParse(vocab('apple', 1)).success).toBe(false);

    const structure = (exampleCount: number) => ({
      type: 'STRUCTURE' as const,
      lemma: 'to be affirmative',
      metadata: {
        level: 'A1',
        structure_type: 'Verb Tense',
        explanation: 'Subject + to be + complement.',
        examples: Array.from({ length: exampleCount }, (_, i) => ({
          text: `They are students ${i}.`,
          translation: `Eles são estudantes ${i}.`,
          word_order: [
            { word: 'They', index: 0, role: 'subject' },
            { word: 'are', index: 1, role: 'verb' },
            { word: 'students', index: 2, role: 'complement' },
          ],
        })),
      },
    });

    expect(AIGeneratedLearningItemSchema.safeParse(structure(3)).success).toBe(true);
    expect(AIGeneratedLearningItemSchema.safeParse(structure(2)).success).toBe(false);
  });
});
