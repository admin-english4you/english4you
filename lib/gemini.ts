import { GoogleGenAI, createUserContent, createPartFromUri, FileState } from "@google/genai";
import { z } from "zod";
import {
  AIGeneratedLearningItemsSchema,
  AIGeneratedComprehensiveQuizSchema,
  AIGeneratedListeningQuizSchema,
} from "@/modules/practice/practice.schema";

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

if (!ai) {
  console.warn("[Gemini] GEMINI_API_KEY não configurada — geração de itens de prática via IA está desabilitada.");
}

// Alias mantido pela Google apontando sempre para o modelo flash atual
// recomendado — evita fixar uma versão específica que pode ser descontinuada
// (ex: "gemini-2.5-flash" direto passou a retornar 404 para contas novas).
const MODEL = "gemini-flash-latest";

export type RawLearningItem = z.infer<typeof AIGeneratedLearningItemsSchema>[number];

const FILE_POLL_INTERVAL_MS = 2000;
const FILE_POLL_MAX_ATTEMPTS = 30; // até 60s esperando o processamento do arquivo

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Baixa o arquivo público do Firebase Storage e envia para a File API do
 * Gemini. Arquivos de áudio/vídeo ficam em estado PROCESSING por alguns
 * segundos após o upload — é preciso aguardar virar ACTIVE antes de
 * referenciá-los em generateContent(), senão o modelo simplesmente ignora
 * a mídia (e responde como se nada tivesse sido anexado).
 */
async function uploadMediaFromUrl(fileUrl: string, mimeType: string): Promise<{ uri: string; mimeType: string }> {
  if (!ai) throw new Error("Gemini não configurado.");

  const res = await fetch(fileUrl);
  if (!res.ok) {
    throw new Error(`Falha ao baixar mídia da lição (${res.status}).`);
  }
  const blob = await res.blob();
  let uploaded = await ai.files.upload({ file: blob, config: { mimeType } });

  if (!uploaded.name) {
    throw new Error("Falha ao enviar mídia para o Gemini.");
  }
  const fileName = uploaded.name;

  for (let attempt = 0; uploaded.state === FileState.PROCESSING && attempt < FILE_POLL_MAX_ATTEMPTS; attempt++) {
    await sleep(FILE_POLL_INTERVAL_MS);
    uploaded = await ai.files.get({ name: fileName });
  }

  if (uploaded.state === FileState.FAILED) {
    throw new Error("O Gemini falhou ao processar o arquivo de mídia.");
  }
  if (uploaded.state !== FileState.ACTIVE) {
    throw new Error("Tempo esgotado aguardando o processamento da mídia pelo Gemini.");
  }
  if (!uploaded.uri || !uploaded.mimeType) {
    throw new Error("Falha ao enviar mídia para o Gemini.");
  }

  return { uri: uploaded.uri, mimeType: uploaded.mimeType };
}

/**
 * Transcreve integralmente um áudio/vídeo de aula (palavra por palavra, em inglês).
 */
export async function transcribeMedia(fileUrl: string, mimeType: string): Promise<string> {
  if (!ai) throw new Error("Gemini não configurado.");

  const file = await uploadMediaFromUrl(fileUrl, mimeType);
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: createUserContent([
      "Transcreva integralmente este áudio/vídeo de uma aula de inglês, palavra por palavra, sem resumir, sem traduzir, mantendo a pontuação natural.",
      createPartFromUri(file.uri, file.mimeType),
    ]),
  });

  return response.text ?? "";
}

export interface ExtractItemsParams {
  text: string;
  levelHint: string;
  vocabRange: [number, number];
  structureRange: [number, number];
}

/**
 * Um lote de extração: dado um texto-fonte (conteúdo escrito OU transcrição),
 * pede ao Gemini para extrair itens de vocabulário/estrutura no formato de
 * LearningItem, já validado contra AIGeneratedLearningItemsSchema.
 */
export async function extractLearningItems(params: ExtractItemsParams): Promise<RawLearningItem[]> {
  if (!ai) throw new Error("Gemini não configurado.");

  const prompt = buildExtractionPrompt(params);
  const responseSchema = z.toJSONSchema(AIGeneratedLearningItemsSchema);

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(response.text ?? "[]");
  } catch (err) {
    console.error("[Gemini] Resposta não é um JSON válido:", err);
    return [];
  }

  const result = AIGeneratedLearningItemsSchema.safeParse(parsed);
  if (!result.success) {
    console.error("[Gemini] Resposta não bate com o formato esperado:", result.error);
    return [];
  }
  return result.data;
}

export interface ComprehensiveQuizParams {
  text: string;
  transcript: string;
  levelHint: string;
}

export type RawComprehensiveQuiz = z.infer<typeof AIGeneratedComprehensiveQuizSchema>;

/**
 * A API do Gemini responde 400 "Request contains an invalid argument" quando
 * o responseSchema tem minItems/maxItems em mais de ~3 arrays de nível 1 de
 * um mesmo objeto (confirmado isolando o schema até reproduzir o erro com o
 * mínimo de propriedades). A contagem 5-10 por seção continua garantida via
 * prompt + validação estrita (com min/max) depois de receber a resposta.
 */
function stripOuterArrayBounds(schema: Record<string, unknown>): Record<string, unknown> {
  const properties = schema.properties as Record<string, Record<string, unknown>> | undefined;
  if (!properties) return schema;
  for (const propSchema of Object.values(properties)) {
    delete propSchema.minItems;
    delete propSchema.maxItems;
  }
  return schema;
}

/**
 * Gera, numa única chamada, as 5-10 perguntas de múltipla escolha de cada
 * uma das 4 seções de compreensão (vocabulary/grammar/context/comprehension),
 * usando o texto escrito e a transcrição (se houver) juntos como fonte —
 * as seções explicitamente podem vir de qualquer um dos dois.
 */
export async function generateComprehensiveQuiz(params: ComprehensiveQuizParams): Promise<RawComprehensiveQuiz | null> {
  if (!ai) throw new Error("Gemini não configurado.");

  const prompt = buildComprehensiveQuizPrompt(params);
  const responseSchema = stripOuterArrayBounds(z.toJSONSchema(AIGeneratedComprehensiveQuizSchema));

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: { responseMimeType: "application/json", responseSchema },
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(response.text ?? "{}");
  } catch (err) {
    console.error("[Gemini] Resposta do quiz de compreensão não é um JSON válido:", err);
    return null;
  }

  const result = AIGeneratedComprehensiveQuizSchema.safeParse(parsed);
  if (!result.success) {
    console.error("[Gemini] Resposta do quiz de compreensão não bate com o formato esperado:", result.error);
    return null;
  }
  return result.data;
}

function buildComprehensiveQuizPrompt(params: ComprehensiveQuizParams): string {
  const { text, transcript, levelHint } = params;
  return [
    `Você é um especialista em ensino de inglês como língua estrangeira, nível ${levelHint}.`,
    `A partir do conteúdo de aula abaixo (texto escrito${transcript ? " e transcrição de áudio/vídeo" : ""}), crie perguntas de múltipla escolha (4 alternativas, exatamente 1 correta) organizadas em 4 seções. Gere entre 5 e 10 perguntas em CADA seção:`,
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
    ...(transcript ? ["", "--- TRANSCRIÇÃO DO ÁUDIO/VÍDEO ---", transcript] : []),
  ].join("\n");
}

export type RawQuizQuestion = z.infer<typeof AIGeneratedListeningQuizSchema>[number];

/**
 * Gera 5-10 perguntas de múltipla escolha sobre trechos/momentos ESPECÍFICOS
 * da transcrição (não compreensão geral — isso já é a seção "comprehension"
 * do quiz combinado). Usado só quando a lição tem áudio/vídeo.
 */
export async function generateListeningQuiz(params: { transcript: string; levelHint: string }): Promise<RawQuizQuestion[]> {
  if (!ai) throw new Error("Gemini não configurado.");

  const prompt = buildListeningQuizPrompt(params);
  const responseSchema = z.toJSONSchema(AIGeneratedListeningQuizSchema);

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: { responseMimeType: "application/json", responseSchema },
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(response.text ?? "[]");
  } catch (err) {
    console.error("[Gemini] Resposta do quiz de listening não é um JSON válido:", err);
    return [];
  }

  const result = AIGeneratedListeningQuizSchema.safeParse(parsed);
  if (!result.success) {
    console.error("[Gemini] Resposta do quiz de listening não bate com o formato esperado:", result.error);
    return [];
  }
  return result.data;
}

function buildListeningQuizPrompt(params: { transcript: string; levelHint: string }): string {
  const { transcript, levelHint } = params;
  return [
    `Você é um especialista em ensino de inglês como língua estrangeira, nível ${levelHint}.`,
    `A partir da transcrição de áudio/vídeo abaixo, crie entre 5 e 10 perguntas de múltipla escolha (4 alternativas, exatamente 1 correta) sobre TRECHOS OU MOMENTOS ESPECÍFICOS do áudio — teste se o aluno prestou atenção a detalhes pontuais (o que uma pessoa específica disse, um número, um horário, uma decisão tomada em um momento específico da conversa), não o entendimento geral do conteúdo como um todo.`,
    `Sempre que possível, ancore a pergunta numa citação ou momento específico da transcrição (ex: "Quando o palestrante diz '...', o que ele quer dizer?").`,
    `Cada pergunta precisa ter exatamente 4 alternativas plausíveis, "correctIndex" apontando a única correta (0 a 3), e pode incluir uma breve "explanation".`,
    `Responda estritamente no formato JSON solicitado, sem texto adicional.`,
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
    `Responda estritamente no formato JSON solicitado, sem texto adicional.`,
    `--- TEXTO DA AULA ---`,
    text,
  ].join("\n");
}
