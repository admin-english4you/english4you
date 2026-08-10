"use client";

import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { ImageResize } from "tiptap-extension-resize-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { TextAlign } from "@tiptap/extension-text-align";
import { Typography } from "@tiptap/extension-typography";
import { Highlight } from "@tiptap/extension-highlight";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { cn } from "@/lib/utils";

interface LessonContentViewProps {
  /** HTML salvo pelo editor do admin (`SimpleEditor.getHTML()`). */
  html: string;
  className?: string;
}

/**
 * Renderiza o conteúdo da lição em modo leitura.
 *
 * A lista de extensões precisa espelhar exatamente a do editor de escrita
 * (`SimpleEditor`, usado no LessonEditor do admin e no BoardEditor do
 * professor): é o mesmo HTML sendo interpretado, e uma extensão a menos aqui
 * faria o aluno ver algo diferente do que foi escrito (task list e
 * highlight sumindo, alinhamento de texto ignorado, etc.). `HorizontalRule`
 * não precisa ser listado à parte — mesmo nó de `StarterKit`, só com a UI
 * customizada do SimpleEditor, que não é relevante em modo leitura.
 */
export function LessonContentView({ html, className }: LessonContentViewProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      ImageResize.configure({ minWidth: 80, maxWidth: 700 }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Superscript,
      Subscript,
      Typography,
    ],
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
