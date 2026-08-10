import { lessonRepository } from './lesson.repository';
import { Lesson, LessonStatus, CreateLessonInput } from './lesson.types';
import { Role } from '@/modules/user/user.types';
import { AppError } from '@/lib/errors';
import { adminStorage } from '@/lib/firebase-admin';
import { practiceService } from '@/modules/practice/practice.service';
import crypto from 'crypto';

function assertAdmin(actingRole: Role) {
  if (actingRole !== 'ADMIN') {
    throw new AppError('Apenas administradores podem gerenciar lições.');
  }
}

function storageUrlPrefix(bucketName: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/`;
}

/** Sobe um buffer para um caminho do Storage e retorna a URL pública (com download token). */
async function uploadBufferToStorage(filePath: string, buffer: Buffer, contentType: string): Promise<string> {
  if (!adminStorage) {
    throw new AppError('Serviço de Storage não configurado no servidor.');
  }

  const bucket = adminStorage.bucket();
  const fileRef = bucket.file(filePath);
  const downloadToken = crypto.randomUUID();

  await fileRef.save(buffer, {
    metadata: {
      contentType,
      cacheControl: 'public, max-age=31536000',
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
      },
    },
  });

  return `${storageUrlPrefix(bucket.name)}${encodeURIComponent(filePath)}?alt=media&token=${downloadToken}`;
}

/** Apaga (best-effort) um arquivo do Storage a partir da sua URL pública. Não lança em caso de falha. */
async function deleteStorageFileByUrl(url: string): Promise<void> {
  if (!adminStorage) return;

  const bucket = adminStorage.bucket();
  const prefix = storageUrlPrefix(bucket.name);
  if (!url.startsWith(prefix)) return;

  const parts = url.split('/o/');
  if (parts.length < 2) return;

  const filePath = decodeURIComponent(parts[1].split('?')[0]);
  try {
    const fileRef = bucket.file(filePath);
    const [exists] = await fileRef.exists();
    if (exists) {
      await fileRef.delete();
    }
  } catch (err) {
    console.error('Erro ao deletar arquivo do Firebase Storage:', err);
  }
}

const CONTENT_IMAGE_EXTENSION_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
};

/**
 * Travas de conteúdo para DISABLED/IN_PROGRESS -> ACTIVE: bloqueia enquanto
 * houver LearningItem/QuizQuestion PENDING, exige pelo menos 1 pergunta
 * aprovada em cada uma das 4 seções de compreensão, e mais 1 de
 * listening_choice se a lição tiver áudio/vídeo. Extraído para ser reusado
 * por `updateLessonStatus` (admin) e `activateLessonAsTeacher` (professor) —
 * as mesmas regras valem pros dois caminhos.
 */
async function assertLessonContentReady(actingRole: Role, lesson: Lesson): Promise<void> {
  const pendingItems = await practiceService.countPendingForLesson(actingRole, lesson.id);
  if (pendingItems > 0) {
    throw new AppError('Revise (aprove ou remova) todos os itens de prática pendentes antes de ativar a lição.');
  }

  const pendingQuestions = await practiceService.countPendingQuizQuestions(actingRole, lesson.id);
  if (pendingQuestions > 0) {
    throw new AppError('Revise (aprove ou remova) todas as perguntas de compreensão pendentes antes de ativar a lição.');
  }

  const coverage = await practiceService.getApprovedQuizCoverage(actingRole, lesson.id);
  const missingSection = (['vocabulary', 'grammar', 'context', 'comprehension'] as const).find(
    (section) => coverage[section] === 0
  );
  if (missingSection) {
    throw new AppError(`Gere e aprove ao menos uma pergunta da seção "${missingSection}" antes de ativar a lição.`);
  }

  const hasMedia = Boolean(lesson.audioUrl || lesson.videoUrl);
  if (hasMedia && coverage.listening === 0) {
    throw new AppError('Gere e aprove ao menos uma pergunta de compreensão auditiva antes de ativar a lição.');
  }
}

/**
 * Service do módulo de Lições (Regras de Negócio e RBAC).
 */
export const lessonService = {
  async getLessonsByIds(ids: string[]): Promise<Lesson[]> {
    return await lessonRepository.findByIds(ids);
  },

  async getLessonById(actingRole: Role, id: string): Promise<Lesson | undefined> {
    assertAdmin(actingRole);
    return await lessonRepository.findById(id);
  },

  /**
   * Leitura sem RBAC de papel: devolve a lição apenas se ela já foi publicada
   * (nunca DISABLED, que é o estado "o aluno ainda não chegou aqui").
   *
   * A posse — "este aluno tem direito a esta lição?" — é validada por quem
   * chama (classService/progressService), a partir da turma do aluno.
   */
  async getPublishedLessonById(lessonId: string): Promise<Lesson | undefined> {
    const lesson = await lessonRepository.findById(lessonId);
    if (!lesson || lesson.status === 'DISABLED') return undefined;
    return lesson;
  },

  /** Cria a lição em branco (título/nível). Anexá-la a um plano é responsabilidade do planService. */
  async createLessonInPlan(actingRole: Role, data: CreateLessonInput): Promise<Lesson> {
    assertAdmin(actingRole);
    return await lessonRepository.create({
      title: data.title,
      level: data.level,
      content: '',
      transcript: null,
      audioUrl: null,
      videoUrl: null,
      status: 'DISABLED',
    });
  },

  async updateLesson(
    actingRole: Role,
    lessonId: string,
    data: Partial<Pick<Lesson, 'title' | 'level' | 'content' | 'transcript'>>
  ): Promise<Lesson> {
    assertAdmin(actingRole);
    return await lessonRepository.update(lessonId, data);
  },

  async saveTranscript(actingRole: Role, lessonId: string, transcript: string): Promise<Lesson> {
    assertAdmin(actingRole);
    return await lessonRepository.update(lessonId, { transcript });
  },

  /**
   * Faz upload de áudio ou vídeo da lição para o Firebase Storage, apagando o
   * arquivo antigo (se houver) e persistindo a nova URL pública. Mesmo padrão
   * de userService.updateAvatar.
   */
  async updateMedia(actingRole: Role, lessonId: string, file: File, kind: 'audio' | 'video'): Promise<Lesson> {
    assertAdmin(actingRole);

    const currentLesson = await lessonRepository.findById(lessonId);
    if (!currentLesson) {
      throw new AppError('Lição não encontrada.');
    }

    const existingUrl = kind === 'audio' ? currentLesson.audioUrl : currentLesson.videoUrl;
    if (existingUrl) {
      await deleteStorageFileByUrl(existingUrl);
    }

    const extension = file.name.split('.').pop() || (kind === 'audio' ? 'mp3' : 'mp4');
    const filePath = `lessons/${lessonId}/${kind}_${Date.now()}.${extension}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const publicUrl = await uploadBufferToStorage(filePath, buffer, file.type);

    return await lessonRepository.updateMedia(
      lessonId,
      kind === 'audio' ? { audioUrl: publicUrl } : { videoUrl: publicUrl }
    );
  },

  /** Remove o áudio ou vídeo da lição (apaga do Storage best-effort e limpa a coluna). */
  async clearMedia(actingRole: Role, lessonId: string, kind: 'audio' | 'video'): Promise<Lesson> {
    assertAdmin(actingRole);

    const currentLesson = await lessonRepository.findById(lessonId);
    if (!currentLesson) {
      throw new AppError('Lição não encontrada.');
    }

    const existingUrl = kind === 'audio' ? currentLesson.audioUrl : currentLesson.videoUrl;
    if (existingUrl) {
      await deleteStorageFileByUrl(existingUrl);
    }

    return await lessonRepository.updateMedia(lessonId, kind === 'audio' ? { audioUrl: null } : { videoUrl: null });
  },

  /**
   * Sobe uma imagem colada diretamente no conteúdo da lição (arquivo de
   * clipboard ou base64 já convertido em Blob pelo client) e retorna a URL
   * pública. Não mexe na coluna `content` — quem embute a URL no HTML é o
   * editor, e o `content` só é persistido quando a lição é salva.
   */
  async uploadContentImage(actingRole: Role, lessonId: string, file: File): Promise<string> {
    assertAdmin(actingRole);

    const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
    const filePath = `lessons/${lessonId}/content_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${extension}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    return await uploadBufferToStorage(filePath, buffer, file.type || 'image/png');
  },

  /**
   * Baixa uma imagem externa (colada de outra página) no servidor e a
   * reenvia para o nosso Storage, evitando depender de um host de terceiros.
   */
  async rehostContentImage(actingRole: Role, lessonId: string, sourceUrl: string): Promise<string> {
    assertAdmin(actingRole);

    const res = await fetch(sourceUrl);
    if (!res.ok) {
      throw new AppError('Não foi possível baixar a imagem colada.');
    }

    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.startsWith('image/')) {
      throw new AppError('O conteúdo colado não é uma imagem válida.');
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const extensionFromType = contentType.split('/')[1]?.split('+')[0] ?? 'png';
    const extension = CONTENT_IMAGE_EXTENSION_MIME[extensionFromType] ? extensionFromType : 'png';
    const filePath = `lessons/${lessonId}/content_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${extension}`;

    return await uploadBufferToStorage(filePath, buffer, contentType);
  },

  /** Apaga (best-effort) imagens de conteúdo que foram removidas do editor, só as que são desta lição. */
  async deleteContentImages(actingRole: Role, lessonId: string, imageUrls: string[]): Promise<void> {
    assertAdmin(actingRole);

    const ownImages = imageUrls.filter((url) => url.includes(`/lessons%2F${lessonId}%2Fcontent_`));
    await Promise.all(ownImages.map((url) => deleteStorageFileByUrl(url)));
  },

  /**
   * DISABLED -> ACTIVE é bloqueado enquanto houver LearningItem ou QuizQuestion
   * PENDING para a lição, e exige pelo menos 1 pergunta aprovada em cada uma
   * das 4 seções de compreensão (vocabulary/grammar/context/comprehension) —
   * sem isso a lição fica incompleta pro app do aluno. Se a lição tem
   * áudio/vídeo, também exige pelo menos 1 pergunta aprovada de
   * listening_choice. ACTIVE -> DISABLED é sempre permitido (reverter a
   * liberação). IN_PROGRESS não é setado por esta UI.
   */
  async updateLessonStatus(actingRole: Role, lessonId: string, status: 'ACTIVE' | 'DISABLED'): Promise<Lesson> {
    assertAdmin(actingRole);

    let lesson: Lesson | undefined;
    if (status === 'ACTIVE') {
      lesson = await lessonRepository.findById(lessonId);
      if (!lesson) {
        throw new AppError('Lição não encontrada.');
      }
      await assertLessonContentReady(actingRole, lesson);
    }

    // Carimba a PRIMEIRA ativação. É a partir dela (e não só da data da aula)
    // que o ciclo de prática do aluno começa — sem isso, ativar uma lição
    // atrasada geraria 6 dias já vencidos. Reativar depois de um DISABLE não
    // reinicia o carimbo, para não empurrar o ciclo de quem já começou.
    const activatedAt = status === 'ACTIVE' && lesson && !lesson.activatedAt ? new Date() : undefined;

    return await lessonRepository.updateStatus(lessonId, status as LessonStatus, activatedAt);
  },

  /**
   * Ativação disparada pelo PROFESSOR ao encerrar uma aula ao vivo — nunca
   * desativa (professor só libera, nunca bloqueia) e é idempotente (se outra
   * turma já ativou esta mesma lição, uma segunda chamada não falha, já que
   * `status` é global e não por turma). A checagem de posse ("este professor
   * pode ativar esta lição?") é responsabilidade de quem chama
   * (classService.activateLessonForRecord) — aqui só valida o papel.
   */
  async activateLessonAsTeacher(actingRole: Role, lessonId: string): Promise<Lesson> {
    if (actingRole !== 'TEACHER' && actingRole !== 'ADMIN') {
      throw new AppError('Apenas professores podem ativar lições.');
    }

    const lesson = await lessonRepository.findById(lessonId);
    if (!lesson) {
      throw new AppError('Lição não encontrada.');
    }
    if (lesson.status === 'ACTIVE') {
      return lesson;
    }

    await assertLessonContentReady(actingRole, lesson);
    const activatedAt = lesson.activatedAt ?? new Date();
    return await lessonRepository.updateStatus(lessonId, 'ACTIVE', activatedAt);
  },
};
