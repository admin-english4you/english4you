import { StreamClient } from "@stream-io/node-sdk";

/**
 * Cliente server-side do Stream (vídeo da sala de aula).
 *
 * Espelha o padrão de `lib/firebase-admin.ts`: singleton preguiçoso, guardado
 * contra reinicialização, export nulável — todo chamador precisa checar antes
 * de usar, em vez de o módulo lançar no import se a env var faltar.
 */

let streamClient: StreamClient | null = null;

const apiKey = process.env.STREAM_API_KEY;
const apiSecret = process.env.STREAM_SECRET;

if (apiKey && apiSecret) {
  streamClient = new StreamClient(apiKey, apiSecret);
}

export { streamClient };

/**
 * Por quantos dias o Stream guarda uma gravação antes de apagá-la sozinho.
 *
 * Não é escolha nossa: é a política de retenção do bucket deles, visível no
 * cabeçalho `x-amz-expiration` da própria URL da gravação
 * (`rule-id="DeleteRecordingsAfter14Days"`). Passado o prazo, o arquivo some —
 * a plataforma não tem como recuperá-lo.
 *
 * Se o plano do Stream mudar essa retenção, é este número que precisa mudar:
 * ele alimenta o aviso que vai no e-mail do aluno e na documentação do admin.
 */
export const RECORDING_RETENTION_DAYS = 14;

/** Quando a gravação de uma aula deixa de existir no Stream. */
export function recordingAvailableUntil(recordedAt: Date = new Date()): Date {
  const limite = new Date(recordedAt);
  limite.setDate(limite.getDate() + RECORDING_RETENTION_DAYS);
  return limite;
}

/** Tipo de call usado por toda a plataforma — nunca provisionamos um tipo customizado no dashboard. */
const CALL_TYPE = "default";

/**
 * Id determinístico da chamada a partir do id da aula (class_records.id).
 * Evita precisar de uma coluna extra só pra guardar "qual é o callId desta
 * aula" — e o webhook consegue voltar de `call_cid` (`type:id`) pro
 * `recordId` sem nenhuma consulta ao banco.
 */
export function callIdForRecord(recordId: string): string {
  return `class-record-${recordId}`;
}

/** Extrai o recordId de volta a partir do `call_cid` (`"default:class-record-<uuid>"`) do payload do webhook. */
export function recordIdFromCallCid(callCid: string): string | null {
  const prefix = `${CALL_TYPE}:class-record-`;
  if (!callCid.startsWith(prefix)) return null;
  return callCid.slice(prefix.length);
}

export interface StreamUserRef {
  id: string;
  name?: string;
  image?: string | null;
}

interface GenerateCallAccessParams {
  recordId: string;
  userId: string;
  /** Quem mais deve poder entrar nesta call (roster completo — professor + turma). */
  memberUserIds: string[];
  createdByUserId: string;
  /**
   * Todo usuário referenciado na call (criador + membros) precisa existir do
   * lado do Stream ANTES de ser citado — senão `getOrCreate` falha com
   * "users ... don't exist". Nossos ids (UUID do Neon) nunca foram
   * registrados lá, então fazemos upsert aqui, toda vez (idempotente/barato
   * no Stream, não exige um cadastro prévio em outro lugar).
   */
  users: StreamUserRef[];
}

export interface CallAccess {
  apiKey: string;
  token: string;
  callId: string;
}

/**
 * Garante que a call existe (idempotente — um F5 no meio da aula não
 * reprovisiona nada) e gera um token de entrada de curta duração pro usuário.
 * Devolve `null` se o Stream não estiver configurado (env vars ausentes).
 */
export async function ensureCallAndGenerateToken({
  recordId,
  userId,
  memberUserIds,
  createdByUserId,
  users,
}: GenerateCallAccessParams): Promise<CallAccess | null> {
  if (!streamClient || !apiKey) return null;

  if (users.length > 0) {
    await streamClient.upsertUsers(
      users.map((u) => ({ id: u.id, name: u.name, image: u.image ?? undefined }))
    );
  }

  const callId = callIdForRecord(recordId);
  const call = streamClient.video.call(CALL_TYPE, callId);

  await call.getOrCreate({
    data: {
      created_by_id: createdByUserId,
      members: memberUserIds.map((id) => ({ user_id: id })),
    },
  });

  const token = streamClient.generateUserToken({ user_id: userId, validity_in_seconds: 3600 });

  return { apiKey, token, callId };
}

/**
 * Liga a gravação da call — chamado pelo client assim que o professor entra
 * de fato na sessão (ver classService.startCallRecordingForRecord).
 *
 * Best-effort: o Stream exige uma sessão ativa para `startRecording()` (erro
 * "there is no active session" se ninguém entrou ainda), e nada nesta função
 * garante que a sessão já está totalmente registrada do lado do Stream no
 * instante exato da chamada — uma falha aqui não deve travar o join do
 * professor, só significa que a próxima tentativa (ex: reconexão) tenta de novo.
 */
export async function startCallRecording(recordId: string): Promise<void> {
  if (!streamClient) return;
  const call = streamClient.video.call(CALL_TYPE, callIdForRecord(recordId));
  try {
    // 'composite': uma única gravação da call inteira (visão mesclada de
    // todos os participantes) — é o que faz sentido pra reassistir uma aula.
    await call.startRecording({ recording_type: "composite" });
  } catch {
    // Best-effort — ver docblock acima.
  }
}

/** Desliga a gravação — o evento `call.recording_ready` chega depois, de forma assíncrona, via webhook. */
export async function stopCallRecording(recordId: string): Promise<void> {
  if (!streamClient) return;
  const call = streamClient.video.call(CALL_TYPE, callIdForRecord(recordId));
  try {
    await call.stopRecording({ recording_type: "composite" });
  } catch {
    // Best-effort: se a gravação já tiver parado sozinha (ex: todos saíram),
    // o Stream retorna erro — não deve impedir o professor de encerrar a aula.
  }
}

/** Encerra a call no Stream (desconecta quem ainda estiver conectado). */
export async function endStreamCall(recordId: string): Promise<void> {
  if (!streamClient) return;
  const call = streamClient.video.call(CALL_TYPE, callIdForRecord(recordId));
  try {
    await call.end();
  } catch {
    // Best-effort: call que já terminou sozinha (todos saíram) não deve
    // impedir o fluxo de "Encerrar aula" no nosso lado.
  }
}

/**
 * Verifica a assinatura HMAC do webhook e devolve o evento tipado, ou `null`
 * se a assinatura for inválida. `rawBody` precisa ser o texto cru da request
 * (não `request.json()`, que reformataria os bytes que a assinatura cobre).
 */
export function verifyAndParseStreamWebhook(rawBody: string, signature: string) {
  if (!streamClient) return null;
  try {
    return streamClient.verifyAndParseWebhook(rawBody, signature);
  } catch {
    return null;
  }
}
