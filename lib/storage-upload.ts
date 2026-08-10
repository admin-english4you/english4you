import { adminStorage } from '@/lib/firebase-admin';
import { AppError } from '@/lib/errors';
import crypto from 'crypto';

/**
 * Upload/apagar arquivos no Firebase Storage — extraído de
 * `lessonService` (era só de lá) porque o board ao vivo da sala do
 * professor (classService) também precisa subir imagens de conteúdo.
 */

function storageUrlPrefix(bucketName: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/`;
}

/** Sobe um buffer para um caminho do Storage e retorna a URL pública (com download token). */
export async function uploadBufferToStorage(filePath: string, buffer: Buffer, contentType: string): Promise<string> {
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
export async function deleteStorageFileByUrl(url: string): Promise<void> {
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

export const CONTENT_IMAGE_EXTENSION_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
};

/** Baixa uma imagem externa (URL remota) e devolve o buffer + extensão certa, pronta pra `uploadBufferToStorage`. Lança `AppError` se não for uma imagem válida. */
export async function fetchExternalImage(sourceUrl: string): Promise<{ buffer: Buffer; contentType: string; extension: string }> {
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

  return { buffer, contentType, extension };
}
