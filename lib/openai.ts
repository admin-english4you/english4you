import OpenAI from "openai";
import { z } from "zod";
import {
  AIGeneratedLearningItemsSchema,
  AIGeneratedComprehensiveQuizSchema,
  AIGeneratedListeningQuizSchema,
} from "@/modules/practice/practice.schema";

const apiKey = process.env.OPENAI_API_KEY;
const openai = apiKey ? new OpenAI({ apiKey }) : null;

if (!openai) {
  console.warn("[OpenAI] OPENAI_API_KEY não configurada — geração de itens de prática via IA está desabilitada.");
}

/** Geração de texto/JSON. Mini: o trabalho é extração estruturada, não raciocínio aberto. */
const MODEL = "gpt-4.1-mini";

/**
 * Transcrição. Só ÁUDIO: diferente do Gemini, a API da OpenAI não aceita
 * vídeo — extrair a trilha exigiria ffmpeg no runtime. Ver `transcribeMedia`.
 */
const TRANSCRIBE_MODEL = "gpt-4o-transcribe";

/** Limite de upload da API de transcrição da OpenAI. */
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

export type RawLearningItem = z.infer<typeof AIGeneratedLearningItemsSchema>[number];
export type RawComprehensiveQuiz = z.infer<typeof AIGeneratedComprehensiveQuizSchema>;
export type RawQuizQuestion = z.infer<typeof AIGeneratedListeningQuizSchema>[number];

// -----------------------------------------------------------------------------
// Structured Outputs
//
// A OpenAI só aceita um subconjunto de JSON Schema em `strict: true`, e as
// regras não batem com o que `z.toJSONSchema()` emite:
//
// 1. TODA propriedade precisa estar em `required` — não existe campo opcional.
//    O equivalente é "obrigatório, mas pode vir null", então os `.optional()`
//    dos nossos schemas viram nullable aqui (e o null é removido da resposta
//    antes da validação, ver `stripNulls`).
// 2. Palavras-chave de restrição (minItems, minimum, format, ...) são
//    rejeitadas. As faixas continuam sendo pedidas no prompt e cobradas na
//    validação com Zod depois — mesmo desenho que já existia com o Gemini.
// 3. A raiz precisa ser um objeto: os schemas que são array na raiz são
//    embrulhados em `{ items: [...] }` (ver `arrayRootSchema`).
// -----------------------------------------------------------------------------

type JsonSchema = Record<string, unknown>;

const UNSUPPORTED_KEYWORDS = new Set([
  "$schema",
  "default",
  "format",
  "pattern",
  "minLength",
  "maxLength",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  "minItems",
  "maxItems",
  "uniqueItems",
  "contains",
  "minContains",
  "maxContains",
  "unevaluatedItems",
  "minProperties",
  "maxProperties",
  "patternProperties",
  "propertyNames",
  "unevaluatedProperties",
]);

function makeNullable(schema: JsonSchema): JsonSchema {
  // `enum` e `$ref` não aceitam um `type` extra sem virar contradição — nesses
  // casos a união explícita é a única forma de admitir null.
  if ("enum" in schema || "$ref" in schema) {
    return { anyOf: [schema, { type: "null" }] };
  }

  if (Array.isArray(schema.anyOf)) {
    const members = schema.anyOf as JsonSchema[];
    if (members.some((member) => member?.type === "null")) return schema;
    return { ...schema, anyOf: [...members, { type: "null" }] };
  }

  if (Array.isArray(schema.type)) {
    const types = schema.type as string[];
    return types.includes("null") ? schema : { ...schema, type: [...types, "null"] };
  }

  if (typeof schema.type === "string") {
    return { ...schema, type: [schema.type, "null"] };
  }

  return { anyOf: [schema, { type: "null" }] };
}

function toStrictSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(toStrictSchema);
  if (!node || typeof node !== "object") return node;

  const source = node as JsonSchema;
  const result: JsonSchema = {};
  for (const [key, value] of Object.entries(source)) {
    if (UNSUPPORTED_KEYWORDS.has(key)) continue;
    result[key] = toStrictSchema(value);
  }

  const properties = result.properties as Record<string, JsonSchema> | undefined;
  if (properties && typeof properties === "object") {
    const alreadyRequired = new Set((source.required as string[] | undefined) ?? []);
    for (const key of Object.keys(properties)) {
      if (!alreadyRequired.has(key)) {
        properties[key] = makeNullable(properties[key]);
      }
    }
    result.required = Object.keys(properties);
    result.additionalProperties = false;
  }

  return result;
}

/** Embrulha um schema que é array na raiz — a OpenAI exige objeto no topo. */
function arrayRootSchema(schema: z.ZodType): JsonSchema {
  const inner = toStrictSchema(z.toJSONSchema(schema)) as JsonSchema;
  return {
    type: "object",
    properties: { items: inner },
    required: ["items"],
    additionalProperties: false,
  };
}

/**
 * Remove chaves nulas antes de validar com Zod.
 *
 * Necessário porque o campo que no nosso schema é `.optional()` foi enviado à
 * OpenAI como nullable (regra 1 acima): o modelo devolve `null` onde deveria
 * ser ausente, e `.optional()` do Zod rejeita null explícito. Todo campo
 * nullable dos nossos schemas também é opcional, então apagar é sempre seguro.
 */
function stripNulls<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripNulls(item)) as unknown as T;
  }
  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (item === null) continue;
      result[key] = stripNulls(item);
    }
    return result as T;
  }
  return value;
}

async function requestJson(params: {
  prompt: string;
  schemaName: string;
  schema: JsonSchema;
}): Promise<unknown> {
  if (!openai) throw new Error("OpenAI não configurada.");

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: params.prompt }],
    response_format: {
      type: "json_schema",
      json_schema: { name: params.schemaName, strict: true, schema: params.schema },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) return null;

  try {
    return stripNulls(JSON.parse(content));
  } catch (err) {
    console.error("[OpenAI] Resposta não é um JSON válido:", err);
    return null;
  }
}

/**
 * Transcreve integralmente um ÁUDIO de aula (palavra por palavra, em inglês).
 *
 * Só áudio: a API de transcrição da OpenAI não aceita vídeo (ao contrário do
 * Gemini, que este módulo substituiu). Uma lição que precise de transcrição
 * deve ter o áudio anexado — ver `practiceService.generateLearningItems`.
 */
export async function transcribeMedia(fileUrl: string, mimeType: string): Promise<string> {
  if (!openai) throw new Error("OpenAI não configurada.");

  const res = await fetch(fileUrl);
  if (!res.ok) {
    throw new Error(`Falha ao baixar o áudio da lição (${res.status}).`);
  }

  const blob = await res.blob();
  if (blob.size > MAX_AUDIO_BYTES) {
    throw new Error("O áudio da lição passa de 25 MB, o limite da transcrição. Envie um arquivo menor.");
  }

  const extension = fileUrl.split("?")[0].split(".").pop() || "mp3";
  const file = new File([blob], `lesson-audio.${extension}`, { type: mimeType });

  const transcription = await openai.audio.transcriptions.create({
    file,
    model: TRANSCRIBE_MODEL,
    language: "en",
  });

  return transcription.text ?? "";
}

export interface ExtractItemsParams {
  text: string;
  levelHint: string;
  vocabRange: [number, number];
  structureRange: [number, number];
}

/**
 * Um lote de extração: dado um texto-fonte (conteúdo escrito OU transcrição),
 * pede à IA para extrair itens de vocabulário/estrutura no formato de
 * LearningItem, já validado contra AIGeneratedLearningItemsSchema.
 */
export async function extractLearningItems(params: ExtractItemsParams): Promise<RawLearningItem[]> {
  const parsed = await requestJson({
    prompt: buildExtractionPrompt(params),
    schemaName: "learning_items",
    schema: arrayRootSchema(AIGeneratedLearningItemsSchema),
  });

  const items = (parsed as { items?: unknown } | null)?.items ?? [];
  const result = AIGeneratedLearningItemsSchema.safeParse(items);
  if (!result.success) {
    console.error("[OpenAI] Resposta não bate com o formato esperado:", result.error);
    return [];
  }
  return result.data;
}

export interface ComprehensiveQuizParams {
  text: string;
  transcript: string;
  levelHint: string;
}

/**
 * Gera, numa única chamada, as 5-10 perguntas de múltipla escolha de cada
 * uma das 4 seções de compreensão (vocabulary/grammar/context/comprehension),
 * usando o texto escrito e a transcrição (se houver) juntos como fonte —
 * as seções explicitamente podem vir de qualquer um dos dois.
 */
export async function generateComprehensiveQuiz(
  params: ComprehensiveQuizParams
): Promise<RawComprehensiveQuiz | null> {
  const parsed = await requestJson({
    prompt: buildComprehensiveQuizPrompt(params),
    schemaName: "comprehensive_quiz",
    schema: toStrictSchema(z.toJSONSchema(AIGeneratedComprehensiveQuizSchema)) as JsonSchema,
  });

  if (parsed === null) return null;

  const result = AIGeneratedComprehensiveQuizSchema.safeParse(parsed);
  if (!result.success) {
    console.error("[OpenAI] Resposta do quiz de compreensão não bate com o formato esperado:", result.error);
    return null;
  }
  return result.data;
}

/**
 * Gera 5-10 perguntas de múltipla escolha sobre trechos/momentos ESPECÍFICOS
 * da transcrição (não compreensão geral — isso já é a seção "comprehension"
 * do quiz combinado). Usado só quando a lição tem áudio.
 */
export async function generateListeningQuiz(params: {
  transcript: string;
  levelHint: string;
}): Promise<RawQuizQuestion[]> {
  const parsed = await requestJson({
    prompt: buildListeningQuizPrompt(params),
    schemaName: "listening_quiz",
    schema: arrayRootSchema(AIGeneratedListeningQuizSchema),
  });

  const items = (parsed as { items?: unknown } | null)?.items ?? [];
  const result = AIGeneratedListeningQuizSchema.safeParse(items);
  if (!result.success) {
    console.error("[OpenAI] Resposta do quiz de listening não bate com o formato esperado:", result.error);
    return [];
  }
  return result.data;
}

function buildComprehensiveQuizPrompt(params: ComprehensiveQuizParams): string {
  const { text, transcript, levelHint } = params;
  return [
    `Você é um especialista em ensino de inglês como língua estrangeira, nível ${levelHint}.`,
    `A partir do conteúdo de aula abaixo (texto escrito${transcript ? " e transcrição de áudio" : ""}), crie perguntas de múltipla escolha (4 alternativas, exatamente 1 correta) organizadas em 4 seções. Gere entre 5 e 10 perguntas em CADA seção:`,
    ``,
    `- "vocabulary": tradução/significado de palavras e expressões presentes no texto${transcript ? " e no áudio" : ""}.`,
    `- "grammar": testa estruturas gramaticais explicadas no texto${transcript ? " e/ou usadas no áudio" : ""}.`,
    `- "context": uso prático ou nuances culturais/situacionais identificadas no conteúdo.`,
    `- "comprehension": testa o entendimento GERAL do texto${transcript ? " e/ou do áudio" : ""} (não é sobre um detalhe pontual).`,
    ``,
    `Cada pergunta precisa ter exatamente 4 alternativas plausíveis (sem "todas as anteriores"/pegadinhas ambíguas), "correctIndex" apontando a única correta (0 a 3), e pode incluir uma breve "explanation". Não repita a mesma pergunta entre seções.`,
    `Responda estritamente no formato JSON solicitado, sem texto adicional.`,
    ``,
    `--- TEXTO DA AULA ---`,
    text || "(sem conteúdo escrito)",
    ...(transcript ? ["", "--- TRANSCRIÇÃO DO ÁUDIO ---", transcript] : []),
  ].join("\n");
}

function buildListeningQuizPrompt(params: { transcript: string; levelHint: string }): string {
  const { transcript, levelHint } = params;
  return [
    `Você é um especialista em ensino de inglês como língua estrangeira, nível ${levelHint}.`,
    `A partir da transcrição de áudio abaixo, crie entre 5 e 10 perguntas de múltipla escolha (4 alternativas, exatamente 1 correta) sobre TRECHOS OU MOMENTOS ESPECÍFICOS do áudio — teste se o aluno prestou atenção a detalhes pontuais (o que uma pessoa específica disse, um número, um horário, uma decisão tomada em um momento específico da conversa), não o entendimento geral do conteúdo como um todo.`,
    `Sempre que possível, ancore a pergunta numa citação ou momento específico da transcrição (ex: "Quando o palestrante diz '...', o que ele quer dizer?").`,
    `Cada pergunta precisa ter exatamente 4 alternativas plausíveis, "correctIndex" apontando a única correta (0 a 3), e pode incluir uma breve "explanation".`,
    `Responda estritamente no formato JSON solicitado, sem texto adicional. Devolva as perguntas no campo "items".`,
    ``,
    `--- TRANSCRIÇÃO ---`,
    transcript,
  ].join("\n");
}

function buildExtractionPrompt(params: ExtractItemsParams): string {
  const { text, levelHint, vocabRange, structureRange } = params;
  return [
    `Você é um especialista em ensino de inglês como língua estrangeira, nível ${levelHint}.`,
    `A partir do texto abaixo (conteúdo de uma aula de inglês), extraia itens de aprendizagem para prática do aluno.`,
    ``,
    `Existem exatamente dois tipos de item, e a distinção entre eles é importante:`,
    ``,
    `VOCABULARY = uma palavra ou expressão fixa (chunk lexical) que o aluno precisa memorizar o SIGNIFICADO. Isso inclui palavras isoladas (substantivos, verbos, adjetivos), phrasal verbs, e expressões/coleções fixas de palavras — INCLUINDO preposições e locuções prepositivas de lugar/tempo como "next to", "in front of", "close to", "near", "under", "at 3 o'clock". Se a dúvida é "o que essa palavra/expressão SIGNIFICA?", é VOCABULARY.`,
    `STRUCTURE = um PADRÃO GRAMATICAL que se aplica a muitas frases diferentes: tempos verbais (Present Simple, Past Continuous...), formação de perguntas, voz passiva, comparativos/superlativos, condicionais, ordem das palavras na frase, etc. Se a dúvida é "COMO a frase é construída/conjugada?", é STRUCTURE. Uma preposição ou expressão de lugar isolada NUNCA é STRUCTURE, mesmo que aluno costume confundir isso — ela é sempre VOCABULARY.`,
    ``,
    `Gere entre ${vocabRange[0]} e ${vocabRange[1]} itens do tipo VOCABULARY e entre ${structureRange[0]} e ${structureRange[1]} itens do tipo STRUCTURE relevantes ao texto.`,
    `Cada item VOCABULARY deve preencher "metadata" no formato de VocabMetadata (type, level, phonetic, is_visual, key_image_words, meanings, forms, examples, ...) e precisa ter no MÍNIMO 2 exemplos de uso ("examples") diferentes entre si.`,
    `Cada item STRUCTURE deve preencher "metadata" no formato de StructureMetadata (level, structure_type, explanation, examples com word_order, ...) e precisa ter no MÍNIMO 3 exemplos de uso ("examples") diferentes entre si, cada um com seu próprio "word_order".`,
    `Não invente conteúdo fora do que está implícito no texto. Não repita o mesmo "lemma" duas vezes.`,
    `Campos que não se aplicam ao item devem vir como null.`,
    `Responda estritamente no formato JSON solicitado, sem texto adicional. Devolva os itens no campo "items".`,
    `--- TEXTO DA AULA ---`,
    text,
  ].join("\n");
}
