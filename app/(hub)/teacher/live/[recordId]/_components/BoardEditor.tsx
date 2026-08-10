"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor";
import type { ContentImageUploaders } from "@/components/editor/content-image-sync";
import { findRemovedOwnImages } from "@/components/editor/content-image-sync";
import {
  saveBoardContentAction,
  uploadBoardContentImageAction,
  rehostBoardContentImageAction,
  deleteBoardContentImagesAction,
} from "@/modules/class/class.actions";
import { pushBoardContent } from "@/lib/realtime-board";

interface BoardEditorProps {
  recordId: string;
  initialContent: string | null;
}

type SaveState = "idle" | "saving" | "saved" | "error";

const AUTOSAVE_DELAY_MS = 1500;
// Bem mais curto que o autosave no Postgres: é o que dá a sensação de "ao
// vivo" pros alunos — RTDB é cobrado por banda, não por operação, então dá
// pra ser generoso aqui sem custo relevante nessa escala.
const LIVE_PUSH_DELAY_MS = 300;

/**
 * Editor de anotações da aula ao vivo — usa o `SimpleEditor` compartilhado
 * (ver `components/tiptap-templates/simple/simple-editor.tsx`) com upload
 * real de imagem coladas/arrastadas (Firebase Storage, via
 * `classService.uploadBoardContentImage`).
 */
export function BoardEditor({ recordId, initialContent }: BoardEditorProps) {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Conteúdo salvo mais recentemente no Postgres — usado só pra descobrir
  // quais imagens saíram do texto entre um autosave e o próximo.
  const lastSavedContentRef = useRef(initialContent || "<p></p>");
  // Enquanto > 0, o autosave e o push ao vivo esperam: salvar/publicar uma
  // imagem colada ainda como blob local (antes do upload em segundo plano
  // terminar) gravaria uma URL que não sobrevive a um F5, e pro aluno seria
  // uma imagem quebrada até o upload terminar. `processContentImages`
  // dispara outro `onChange` assim que troca pela URL final, então o
  // autosave/push são reagendados sozinhos — não fica preso esperando.
  const pendingUploadsRef = useRef(0);

  const uploaders = useMemo<ContentImageUploaders>(
    () => ({
      uploadFile: async (file) => {
        pendingUploadsRef.current += 1;
        try {
          const formData = new FormData();
          formData.append("image", file);
          const result = await uploadBoardContentImageAction(recordId, formData);
          if (!result.success || !result.data) {
            throw new Error(!result.success ? result.error : "Falha ao enviar imagem.");
          }
          return result.data.url;
        } finally {
          pendingUploadsRef.current -= 1;
        }
      },
      rehostUrl: async (sourceUrl) => {
        pendingUploadsRef.current += 1;
        try {
          const result = await rehostBoardContentImageAction({ recordId, sourceUrl });
          if (!result.success || !result.data) {
            throw new Error(!result.success ? result.error : "Falha ao enviar imagem.");
          }
          return result.data.url;
        } finally {
          pendingUploadsRef.current -= 1;
        }
      },
    }),
    [recordId]
  );

  async function save(html: string) {
    const result = await saveBoardContentAction({ recordId, boardContent: html });
    setSaveState(result.success ? "saved" : "error");
    if (!result.success) return;

    const removedImageUrls = findRemovedOwnImages(lastSavedContentRef.current, html);
    lastSavedContentRef.current = html;
    if (removedImageUrls.length > 0) {
      await deleteBoardContentImagesAction({ recordId, imageUrls: removedImageUrls });
    }
  }

  const handleChange = (html: string) => {
    setSaveState("saving");

    if (liveTimerRef.current) clearTimeout(liveTimerRef.current);
    liveTimerRef.current = setTimeout(() => {
      if (pendingUploadsRef.current > 0) return;
      pushBoardContent(recordId, html);
    }, LIVE_PUSH_DELAY_MS);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (pendingUploadsRef.current > 0) return;
      void save(html);
    }, AUTOSAVE_DELAY_MS);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (liveTimerRef.current) clearTimeout(liveTimerRef.current);
    };
  }, []);

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="min-h-0 flex-1">
        <SimpleEditor
          content={initialContent || "<p></p>"}
          onChange={handleChange}
          uploaders={uploaders}
          onImageUploadError={() => setSaveState("error")}
        />
      </div>
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "idle") return null;

  return (
    <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
      {state === "saving" && (
        <>
          <Loader2 className="h-3 w-3 animate-spin" /> Salvando...
        </>
      )}
      {state === "saved" && (
        <>
          <Check className="h-3 w-3 text-emerald-500" /> Salvo
        </>
      )}
      {state === "error" && <span className="text-rose-500">Falha ao salvar</span>}
    </span>
  );
}
