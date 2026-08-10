import { formatCep, formatCpf } from '@/lib/br-document';
import { formatCents } from '@/modules/finance/finance.utils';
import type { ContractStatus } from './contract.types';

/**
 * Substituição de variáveis do contrato e mapas de rótulo/estilo de status.
 *
 * Puro de propósito: o painel do editor de modelos usa `findPlaceholderKeys`
 * no client para dar feedback ao admin enquanto ele escreve, e o
 * `contractService` usa `renderContractTemplate` no server na hora de
 * congelar o `contentSnapshot`. A substituição de verdade NUNCA acontece no
 * client — o cliente jamais produz o texto legal.
 */

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  PENDING_SIGNATURE: 'Aguardando assinatura',
  ACTIVE: 'Ativo',
  CANCELED: 'Cancelado',
  COMPLETED: 'Encerrado',
};

export const CONTRACT_STATUS_STYLES: Record<ContractStatus, string> = {
  PENDING_SIGNATURE: 'bg-amber-50 text-amber-700 border-amber-200',
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELED: 'bg-rose-50 text-rose-700 border-rose-200',
  COMPLETED: 'bg-slate-100 text-slate-600 border-slate-200',
};

/** Aceita `{{ Nome }}` além de `{{nome}}` — o admin digita à mão, então tolerar espaço/caixa evita frustração boba. */
const PLACEHOLDER_RE = /\{\{\s*([a-z0-9_]+)\s*\}\}/gi;

/**
 * Normaliza um nome para comparação: sem acento, sem caixa, sem espaço extra.
 * Usado na assinatura para conferir o nome digitado contra o cadastrado —
 * "JOÃO  DA Silva" e "joao da silva" são a mesma pessoa.
 *
 * O range `̀-ͯ` são as marcas de acento que o `NFD` separa das
 * letras (escapado, e não literal, para não depender de caracteres
 * combinantes invisíveis no código-fonte).
 */
export function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/** Catálogo exibido no painel lateral do editor de modelos. */
export const CONTRACT_PLACEHOLDERS: { key: string; label: string; example: string }[] = [
  { key: 'nome', label: 'Nome do contratante', example: 'Maria Souza' },
  { key: 'email', label: 'E-mail', example: 'maria@exemplo.com' },
  { key: 'telefone', label: 'Telefone', example: '(11) 90000-0000' },
  { key: 'documento', label: 'CPF', example: '529.982.247-25' },
  { key: 'endereco', label: 'Endereço completo', example: 'Rua A, 10 — Centro, São Paulo/SP, CEP 01310-100' },
  { key: 'logradouro', label: 'Logradouro', example: 'Rua A' },
  { key: 'numero', label: 'Número', example: '10' },
  { key: 'complemento', label: 'Complemento', example: 'Apto 52' },
  { key: 'bairro', label: 'Bairro', example: 'Centro' },
  { key: 'cidade', label: 'Cidade', example: 'São Paulo' },
  { key: 'estado', label: 'Estado (UF)', example: 'SP' },
  { key: 'cep', label: 'CEP', example: '01310-100' },
  { key: 'pacote', label: 'Nome do pacote', example: 'Semestral' },
  { key: 'valor_mensalidade', label: 'Valor da mensalidade', example: 'R$ 150,00' },
  { key: 'duracao_meses', label: 'Duração em meses', example: '6' },
  { key: 'aulas_por_semana', label: 'Aulas por semana', example: '2' },
  { key: 'data_inicio', label: 'Data de início', example: '01/03/2026' },
  { key: 'data_assinatura', label: 'Data da assinatura', example: '28/02/2026' },
  { key: 'escola', label: 'Nome da escola', example: 'English4You' },
];

/** `cpf` é alias de `documento` — os dois são naturais para quem escreve o contrato. */
export const KNOWN_PLACEHOLDER_KEYS = new Set<string>([
  ...CONTRACT_PLACEHOLDERS.map((p) => p.key),
  'cpf',
]);

/** Chaves únicas (minúsculas) presentes no HTML, na ordem de aparição. */
export function findPlaceholderKeys(html: string): string[] {
  const found = new Set<string>();
  for (const match of html.matchAll(PLACEHOLDER_RE)) {
    found.add(match[1].toLowerCase());
  }
  return Array.from(found);
}

/** Chaves usadas no modelo que não existem no catálogo — bloqueiam o salvamento. */
export function findUnknownPlaceholderKeys(html: string): string[] {
  return findPlaceholderKeys(html).filter((key) => !KNOWN_PLACEHOLDER_KEYS.has(key));
}

/**
 * Escapa os valores substituídos.
 *
 * OBRIGATÓRIO: os valores vêm de um formulário livre preenchido pelo ALUNO
 * (endereço, complemento). Sem isto, um complemento com
 * `<img src=x onerror=...>` viraria XSS armazenado dentro de um documento
 * legal, renderizado depois no painel do admin.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDatePtBr(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  }).format(date);
}

export interface PlaceholderUser {
  name: string;
  email: string;
  phone: string | null;
  document: string | null;
  addressStreet: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  addressDistrict: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressZipCode: string | null;
}

export interface PlaceholderPackage {
  name: string;
  installmentValueCents: number;
  durationInMonths: number;
  classesPerWeek: number;
}

/** Monta o endereço numa linha só, pulando as partes que o usuário não preencheu. */
function composeAddress(user: PlaceholderUser): string {
  const streetLine = [user.addressStreet, user.addressNumber, user.addressComplement]
    .filter(Boolean)
    .join(', ');
  const cityLine = [user.addressCity, user.addressState].filter(Boolean).join('/');
  const parts = [
    streetLine,
    user.addressDistrict,
    cityLine,
    user.addressZipCode ? `CEP ${formatCep(user.addressZipCode)}` : '',
  ].filter(Boolean);
  return parts.join(' — ');
}

export function buildPlaceholderValues(input: {
  user: PlaceholderUser;
  pkg?: PlaceholderPackage | null;
  startDate: Date;
  signedAt?: Date;
}): Record<string, string> {
  const { user, pkg, startDate, signedAt } = input;
  const cpf = formatCpf(user.document);

  return {
    nome: user.name,
    email: user.email,
    telefone: user.phone ?? '',
    documento: cpf,
    cpf,
    endereco: composeAddress(user),
    logradouro: user.addressStreet ?? '',
    numero: user.addressNumber ?? '',
    complemento: user.addressComplement ?? '',
    bairro: user.addressDistrict ?? '',
    cidade: user.addressCity ?? '',
    estado: user.addressState ?? '',
    cep: formatCep(user.addressZipCode),
    pacote: pkg?.name ?? '',
    valor_mensalidade: pkg ? formatCents(pkg.installmentValueCents) : '',
    duracao_meses: pkg ? String(pkg.durationInMonths) : '',
    aulas_por_semana: pkg ? String(pkg.classesPerWeek) : '',
    data_inicio: formatDatePtBr(startDate),
    data_assinatura: signedAt ? formatDatePtBr(signedAt) : '',
    escola: 'English4You',
  };
}

/**
 * Substitui as variáveis do modelo. Toda chave sem valor vira `—` e é
 * reportada em `unresolved`: um contrato assinado jamais pode exibir um
 * `{{...}}` cru para o aluno.
 */
export function renderContractTemplate(
  html: string,
  values: Record<string, string>
): { html: string; unresolved: string[] } {
  const unresolved: string[] = [];

  const rendered = html.replace(PLACEHOLDER_RE, (_match, rawKey: string) => {
    const key = rawKey.toLowerCase();
    const value = values[key];
    if (!value) {
      unresolved.push(key);
      return '—';
    }
    return escapeHtml(value);
  });

  return { html: rendered, unresolved: Array.from(new Set(unresolved)) };
}
