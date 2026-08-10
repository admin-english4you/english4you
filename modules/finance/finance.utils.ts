/**
 * Helpers de dinheiro do módulo financeiro.
 *
 * Todo valor monetário é persistido como INTEIRO EM CENTAVOS
 * (`installmentValueCents`), nunca como float ou `numeric`: `numeric` do
 * Drizzle chega em TS como `string` (o driver preserva precisão), o que
 * espalharia `parseFloat` por todo call-site; e float quebra soma de parcelas.
 * A conversão para reais acontece só na borda de apresentação (aqui) e, no
 * futuro, na borda da API do Mercado Pago.
 */

const BRL_FORMATTER = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

/** `15000` -> `"R$ 150,00"`. */
export function formatCents(cents: number): string {
  return BRL_FORMATTER.format(cents / 100);
}

/**
 * Lê o que o admin digitou no formulário de pacote e devolve centavos.
 * Aceita `"R$ 1.234,56"`, `"1234,56"`, `"1234.56"` e `"1234"`.
 * Devolve `null` quando não dá para interpretar — quem chama decide a mensagem.
 */
export function parseBRLToCents(input: string): number | null {
  const cleaned = input.replace(/[R$\s]/g, '').trim();
  if (!cleaned) return null;

  // "1.234,56" (pt-BR) -> "1234.56"; "1234.56" (já decimal) fica como está.
  const normalized = cleaned.includes(',')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned;

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;

  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) return null;

  // `Math.round` porque 19.99 * 100 = 1998.9999... em ponto flutuante.
  return Math.round(value * 100);
}

/** `15000` -> `"150,00"` — para preencher o input de edição sem o símbolo. */
export function centsToInputValue(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}
