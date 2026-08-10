"use client";

import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { ImageResize } from "tiptap-extension-resize-image";
import { Bold, Check, Italic, List, ListOrdered, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { saveBoardContentAction } from "@/modules/class/class.actions";

interface BoardEditorProps {
  recordId: string;
  /**
   * Ponto de partida: `class_records.boardContent` se já existir, senão uma
   * CÓPIA de `lessons.content` (ver TeacherClassRoom) — o professor edita
   * livremente a partir daí. Editar aqui nunca volta a afetar o material
   * canônico nem outras turmas.
   */
  initialContent: string | null;
}

type SaveState = "idle" | "saving" | "saved" | "error";

const AUTOSAVE_DELAY_MS = 1500;

/**
 * Único editor da sala de aula (não faz sentido mostrar o material original
 * em somente-leitura ao lado de uma cópia editável dele — dois TipTap
 * duplicados na mesma tela). Extensões espelham `LessonEditor`/
 * `LessonContentView`: como o conteúdo inicial pode vir de uma cópia do
 * material da lição (que pode ter imagens), precisa do `ImageResize` também.
 */
export function BoardEditor({ recordId, initialContent }: BoardEditorProps) {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: [StarterKit, ImageResize.configure({ minWidth: 80, maxWidth: 700 })],
    content: initialContent || "<p></p>",
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      setSaveState("saving");
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void save(editor.getHTML());
      }, AUTOSAVE_DELAY_MS);
    },
  });

  async function save(html: string) {
    const result = await saveBoardContentAction({ recordId, boardContent: html });
    setSaveState(result.success ? "saved" : "error");
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-3 py-2">
        <div className="flex items-center gap-1">
          <ToolbarButton
            label="Negrito"
            active={editor?.isActive("bold")}
            onClick={() => editor?.chain().focus().toggleBold().run()}
            icon={Bold}
          />
          <ToolbarButton
            label="Itálico"
            active={editor?.isActive("italic")}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            icon={Italic}
          />
          <ToolbarButton
            label="Lista"
            active={editor?.isActive("bulletList")}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            icon={List}
          />
          <ToolbarButton
            label="Lista numerada"
            active={editor?.isActive("orderedList")}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            icon={ListOrdered}
          />
        </div>

        <SaveIndicator state={saveState} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-hide">
        <EditorContent editor={editor} className="lesson-prose min-h-full p-4 text-sm scrollbar-hide" />
      </div>
    </div>
  );
}

function ToolbarButton({
  label,
  active,
  onClick,
  icon: Icon,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  icon: typeof Bold;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800",
        active && "bg-amber-50 text-amber-700"
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
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
