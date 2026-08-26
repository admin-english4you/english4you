import { put, del } from '@vercel/blob';
import { AppError } from '@/lib/errors';

/**
 * Upload/apagar arquivos no Vercel Blob — extraído de
 * `lessonService` (era só de lá) porque o board ao vivo da sala do
 * professor (classService) também precisa subir imagens de conteúdo.
 */

/** Sobe um buffer para um caminho do Blob e retorna a URL pública. */
export async function uploadBufferToStorage(filePath: string, buffer: Buffer, contentType: string): Promise<string> {
  const blob = await put(filePath, buffer, {
    access: 'public',
    contentType,
    addRandomSuffix: false,
  });

  return blob.url;
}

/** Apaga (best-effort) um arquivo do Blob a partir da sua URL pública. Não lança em caso de falha. */
export async function deleteStorageFileByUrl(url: string): Promise<void> {
  if (!url.includes('.public.blob.vercel-storage.com')) return;

  try {
    await del(url);
  } catch (err) {
    console.error('Erro ao deletar arquivo do Vercel Blob:', err);
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
