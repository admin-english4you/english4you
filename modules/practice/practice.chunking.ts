/**
 * Divisão de um alvo de geração em chamadas paralelas menores.
 *
 * Existe por um 504 real em produção: uma lição de 9.372 chars pedindo os
 * 10-15 itens STRUCTURE numa chamada só levou 117s sozinha — bem acima do
 * teto de 60s do plano Hobby da Vercel (`maxDuration` do deploy). STRUCTURE é
 * o tipo caro de gerar (cada exemplo carrega um `word_order` palavra a
 * palavra); VOCABULARY é mais barato, mas ainda arriscado em lote grande.
 *
 * A saída é pedir em CHAMADAS PARALELAS menores, cada uma vendo o texto
 * INTEIRO da aula — reduz o que cada chamada precisa GERAR (o fator caro),
 * sem reduzir o que ela vê pra extrair (o que afetaria a qualidade).
 *
 * Módulo puro, sem `db`/`openai` — só a aritmética de como fatiar. Ver uso em
 * `practice.service.ts`.
 */

/** Acima disto, uma única chamada de extração arrisca passar dos 60s. */
export const MAX_VOCAB_PER_CALL = 14;
export const MAX_STRUCTURE_PER_CALL = 5;

/**
 * Divide um alvo [min,max] em pedaços de no máximo `perChunkMax`.
 * Pedaços iguais entre si (o range pedido a cada chamada é sempre o mesmo);
 * a extração já trata a faixa como aproximada, então não precisa ser exato.
 */
export function splitRangeByChunkSize(range: [number, number], perChunkMax: number): [number, number][] {
  const [min, max] = range;
  if (max <= 0) return [];
  const parts = Math.max(1, Math.ceil(max / perChunkMax));
  const chunkMin = Math.max(1, Math.round(min / parts));
  const chunkMax = Math.max(chunkMin, Math.ceil(max / parts));
  return Array.from({ length: parts }, () => [chunkMin, chunkMax] as [number, number]);
}

/**
 * Como `splitRangeByChunkSize`, mas para uma contagem exata (usado por
 * "gerar mais", onde o admin pede um número, não uma faixa).
 *
 * A soma dos pedaços bate exatamente com `count` — dividir em lotes muda
 * COMO é pedido, nunca QUANTO, porque a tela mostra "X de Y pedidos" e esse
 * "Y" precisa continuar sendo o número que o admin digitou.
 */
export function splitCountByChunkSize(count: number, perChunkMax: number): number[] {
  if (count <= 0) return [];
  const parts = Math.max(1, Math.ceil(count / perChunkMax));
  const base = Math.floor(count / parts);
  const remainder = count % parts;
  return Array.from({ length: parts }, (_, i) => base + (i < remainder ? 1 : 0)).filter((n) => n > 0);
}
