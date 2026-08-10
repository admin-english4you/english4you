"use client";

import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { ImageResize } from "tiptap-extension-resize-image";
import { cn } from "@/lib/utils";

interface LessonContentViewProps {
  /** HTML salvo pelo editor do admin (`editor.getHTML()`). */
  html: string;
  className?: string;
}

/**
 * Renderiza o conteúdo da lição em modo leitura.
 *
 * A lista de extensões precisa espelhar exatamente a do LessonEditor do admin:
 * é o mesmo HTML sendo interpretado, e uma extensão a menos aqui faria o aluno
 * ver algo diferente do que o professor escreveu (imagens redimensionadas são
 * o caso mais visível).
 */
export function LessonContentView({ html, className }: LessonContentViewProps) {
  const editor = useEditor({
    extensions: [StarterKit, ImageResize.configure({ minWidth: 80, maxWidth: 700 })],
    content: html || "<p></p>",
    editable: false,
    immediatelyRender: false, // obrigatório com o SSR do Next
  });

  // `useEditor` só usa `content` na criação — sem isto, um `html` que muda
  // depois (ex: board ao vivo da sala do professor via RTDB) nunca chegaria
  // na tela até o componente ser desmontado/remontado.
  useEffect(() => {
    if (!editor) return;
    const next = html || "<p></p>";
    if (editor.getHTML() !== next) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
  }, [editor, html]);

  return <EditorContent editor={editor} className={cn("lesson-prose", className)} />;
}
