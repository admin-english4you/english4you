import type { Editor } from "@tiptap/react";
import type { Node as PMNode } from "@tiptap/pm/model";

const IMAGE_NODE_NAME = "imageResize";

/** Funções de upload que o dono do conteúdo (lição, board da aula, etc.) injeta — cada um sabe pra onde/como persistir suas próprias imagens. */
export interface ContentImageUploaders {
  /** Envia um arquivo de imagem (colado ou arrastado) e devolve a URL pública. */
  uploadFile: (file: File) => Promise<string>;
  /** Baixa uma imagem externa (URL remota, ex: colada de outra página) e reenvia pro nosso Storage. */
  rehostUrl: (sourceUrl: string) => Promise<string>;
}

export function isOwnStorageUrl(src: string): boolean {
  return src.includes("firebasestorage.googleapis.com");
}

function needsRehost(src: string): boolean {
  if (src.startsWith("data:") || src.startsWith("blob:")) return true;
  if (/^https?:\/\//.test(src) && !isOwnStorageUrl(src)) return true;
  return false;
}

/** Troca o `src` de todo nó de imagem que ainda aponta para `oldSrc` por `newSrc`, em uma única transação. */
function replaceImageSrc(editor: Editor, oldSrc: string, newSrc: string): void {
  const { state, view } = editor;
  let tr = state.tr;
  let changed = false;

  state.doc.descendants((node, pos) => {
    if (node.type.name === IMAGE_NODE_NAME && node.attrs.src === oldSrc) {
      tr = tr.setNodeMarkup(pos, undefined, { ...node.attrs, src: newSrc });
      changed = true;
    }
  });

  if (changed) {
    view.dispatch(tr);
  }
}

async function uploadBlobSrc(uploadFile: ContentImageUploaders["uploadFile"], src: string): Promise<string> {
  const res = await fetch(src);
  const blob = await res.blob();
  const extension = blob.type.split("/")[1]?.split("+")[0] || "png";
  const file = new File([blob], `pasted.${extension}`, { type: blob.type || "image/png" });
  return uploadFile(file);
}

/**
 * Varre o documento atual em busca de imagens coladas que ainda não estão no
 * nosso Storage (base64, blob local, ou URL externa) e as envia automaticamente,
 * trocando o `src` pela URL final assim que o upload termina. `processedNodes`
 * evita reprocessar/reenviar o mesmo nó enquanto o upload está em andamento
 * (identidade de objeto do nó do ProseMirror, válida até o nó ser recriado).
 */
export async function processContentImages(
  editor: Editor,
  uploaders: ContentImageUploaders,
  processedNodes: WeakSet<PMNode>,
  onError: (message: string) => void
): Promise<void> {
  const pending: string[] = [];

  editor.state.doc.descendants((node) => {
    if (node.type.name !== IMAGE_NODE_NAME) return;
    const src = node.attrs.src as string | undefined;
    if (!src || processedNodes.has(node) || !needsRehost(src)) return;

    processedNodes.add(node);
    pending.push(src);
  });

  for (const src of pending) {
    try {
      const newUrl =
        src.startsWith("data:") || src.startsWith("blob:")
          ? await uploadBlobSrc(uploaders.uploadFile, src)
          : await uploaders.rehostUrl(src);

      replaceImageSrc(editor, src, newUrl);
      if (src.startsWith("blob:")) {
        URL.revokeObjectURL(src);
      }
    } catch (err) {
      console.error("Falha ao enviar imagem colada para o Storage:", err);
      onError("Não foi possível enviar automaticamente uma das imagens coladas.");
    }
  }
}

/** Extrai as URLs de `src` de todas as tags `<img>` de um HTML. */
export function extractImageUrls(html: string): string[] {
  if (typeof window === "undefined" || !html) return [];
  const doc = new DOMParser().parseFromString(html, "text/html");
  return Array.from(doc.querySelectorAll("img"))
    .map((img) => img.getAttribute("src") ?? "")
    .filter(Boolean);
}

/** Imagens que existiam no conteúdo salvo e não existem mais no conteúdo novo (só as hospedadas por nós). */
export function findRemovedOwnImages(oldHtml: string, newHtml: string): string[] {
  const oldUrls = extractImageUrls(oldHtml);
  const newUrls = new Set(extractImageUrls(newHtml));
  return oldUrls.filter((url) => !newUrls.has(url) && isOwnStorageUrl(url));
}
