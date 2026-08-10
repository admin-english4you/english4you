/**
 * Documentos brasileiros (CPF e CEP) — normalização, validação e formatação.
 *
 * Puro e sem dependências, para poder ser usado tanto no client (máscara e
 * feedback no formulário de assinatura) quanto no server (validação de
 * verdade, antes de gravar). Persistimos SEMPRE a versão sem máscara
 * (só dígitos): máscara é apresentação, e guardar "123.456.789-09" torna
 * qualquer busca/comparação futura dependente de formatação.
 */

/** Remove tudo que não for dígito. */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/** CPF só com dígitos, pronto para persistir. */
export function normalizeCpf(value: string): string {
  return onlyDigits(value).slice(0, 11);
}

/**
 * Valida um CPF pelos dois dígitos verificadores.
 *
 * Rejeita também os CPFs de dígitos repetidos ("111.111.111-11"), que passam
 * na conta do módulo 11 mas nunca são emitidos pela Receita — é o caso que
 * um usuário digita para "pular" o campo.
 */
export function isValidCpf(value: string): boolean {
  const cpf = normalizeCpf(value);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const digits = cpf.split('').map(Number);

  for (const [length, position] of [[9, 10], [10, 11]] as const) {
    let sum = 0;
    for (let i = 0; i < length; i++) {
      sum += digits[i] * (position - i);
    }
    const remainder = (sum * 10) % 11;
    // Resto 10 e 11 equivalem a dígito verificador 0.
    const checkDigit = remainder === 10 || remainder === 11 ? 0 : remainder;
    if (checkDigit !== digits[length]) return false;
  }

  return true;
}

/** `12345678909` -> `123.456.789-09`. Devolve a entrada crua se não tiver 11 dígitos. */
export function formatCpf(value: string | null | undefined): string {
  if (!value) return '';
  const cpf = normalizeCpf(value);
  if (cpf.length !== 11) return value;
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}

/** CEP só com dígitos, pronto para persistir. */
export function normalizeCep(value: string): string {
  return onlyDigits(value).slice(0, 8);
}

export function isValidCep(value: string): boolean {
  return normalizeCep(value).length === 8;
}

/** `01310100` -> `01310-100`. Devolve a entrada crua se não tiver 8 dígitos. */
export function formatCep(value: string | null | undefined): string {
  if (!value) return '';
  const cep = normalizeCep(value);
  if (cep.length !== 8) return value;
  return `${cep.slice(0, 5)}-${cep.slice(5)}`;
}
