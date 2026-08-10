"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { EditorContent, EditorContext, useEditor } from "@tiptap/react"
import type { Node as PMNode } from "@tiptap/pm/model"

// --- Tiptap Core Extensions ---
import { StarterKit } from "@tiptap/starter-kit"
import { ImageResize } from "tiptap-extension-resize-image"
import { TaskItem, TaskList } from "@tiptap/extension-list"
import { TextAlign } from "@tiptap/extension-text-align"
import { Typography } from "@tiptap/extension-typography"
import { Highlight } from "@tiptap/extension-highlight"
import { Subscript } from "@tiptap/extension-subscript"
import { Superscript } from "@tiptap/extension-superscript"
import { FindAndReplace } from "@tiptap/extension-find-and-replace"
import { Selection } from "@tiptap/extensions"

// --- UI Primitives ---
import { Button } from "@/components/tiptap-ui-primitive/button"
import { Spacer } from "@/components/tiptap-ui-primitive/spacer"
import {
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
} from "@/components/tiptap-ui-primitive/toolbar"

// --- Tiptap Node ---
import { ImageUploadNode } from "@/components/tiptap-node/image-upload-node/image-upload-node-extension"
import { HorizontalRule } from "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension"
import "@/components/tiptap-node/blockquote-node/blockquote-node.scss"
import "@/components/tiptap-node/code-block-node/code-block-node.scss"
import "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss"
import "@/components/tiptap-node/list-node/list-node.scss"
import "@/components/tiptap-node/image-node/image-node.scss"
import "@/components/tiptap-node/heading-node/heading-node.scss"
import "@/components/tiptap-node/paragraph-node/paragraph-node.scss"

// --- Tiptap UI ---
import { HeadingDropdownMenu } from "@/components/tiptap-ui/heading-dropdown-menu"
import { ImageUploadButton } from "@/components/tiptap-ui/image-upload-button"
import { ListDropdownMenu } from "@/components/tiptap-ui/list-dropdown-menu"
import { BlockquoteButton } from "@/components/tiptap-ui/blockquote-button"
import { CodeBlockButton } from "@/components/tiptap-ui/code-block-button"
import {
  ColorHighlightPopover,
  ColorHighlightPopoverContent,
  ColorHighlightPopoverButton,
} from "@/components/tiptap-ui/color-highlight-popover"
import {
  LinkPopover,
  LinkContent,
  LinkButton,
} from "@/components/tiptap-ui/link-popover"
import { MarkButton } from "@/components/tiptap-ui/mark-button"
import { TextAlignButton } from "@/components/tiptap-ui/text-align-button"
import { UndoRedoButton } from "@/components/tiptap-ui/undo-redo-button"
import {
  SearchAndReplace,
  SearchAndReplaceButton,
} from "@/components/tiptap-ui/search-and-replace"

// --- Icons ---
import { ArrowLeftIcon } from "@/components/tiptap-icons/arrow-left-icon"
import { HighlighterIcon } from "@/components/tiptap-icons/highlighter-icon"
import { LinkIcon } from "@/components/tiptap-icons/link-icon"

// --- Hooks ---
import { useIsBreakpoint } from "@/hooks/use-is-breakpoint"
import { useWindowSize } from "@/hooks/use-window-size"
import { useCursorVisibility } from "@/hooks/use-cursor-visibility"

// --- Lib ---
import { cn } from "@/lib/utils"

// --- Editor helpers (upload de imagens coladas/arrastadas) ---
import {
  processContentImages,
  type ContentImageUploaders,
} from "@/components/editor/content-image-sync"

// --- Styles ---
import "@/components/tiptap-templates/simple/simple-editor.scss"

const SEARCH_AND_REPLACE_SCROLL_OPTIONS: ScrollIntoViewOptions = {
  block: "center",
}

/** Mesmo limite do upload de imagem de conteúdo de lição — mantém client e server (Server Action) alinhados. */
const DEFAULT_MAX_IMAGE_SIZE = 15 * 1024 * 1024 // 15MB

const MainToolbarContent = ({
  onHighlighterClick,
  onLinkClick,
  onSearchAndReplaceClick,
  isSearchAndReplaceOpen,
  searchAndReplaceButtonRef,
  isMobile,
  hasUploaders,
}: {
  onHighlighterClick: () => void
  onLinkClick: () => void
  onSearchAndReplaceClick: () => void
  isSearchAndReplaceOpen: boolean
  searchAndReplaceButtonRef: React.RefObject<HTMLButtonElement | null>
  isMobile: boolean
  hasUploaders: boolean
}) => {
  return (
    <>
      <Spacer />

      <ToolbarGroup>
        <UndoRedoButton action="undo" />
        <UndoRedoButton action="redo" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <HeadingDropdownMenu modal={false} levels={[1, 2, 3, 4]} />
        <ListDropdownMenu
          modal={false}
          types={["bulletList", "orderedList", "taskList"]}
        />
        <BlockquoteButton />
        <CodeBlockButton />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <MarkButton type="bold" />
        <MarkButton type="italic" />
        <MarkButton type="strike" />
        <MarkButton type="code" />
        <MarkButton type="underline" />
        {!isMobile ? (
          <ColorHighlightPopover />
        ) : (
          <ColorHighlightPopoverButton onClick={onHighlighterClick} />
        )}
        {!isMobile ? <LinkPopover /> : <LinkButton onClick={onLinkClick} />}
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <MarkButton type="superscript" />
        <MarkButton type="subscript" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <TextAlignButton align="left" />
        <TextAlignButton align="center" />
        <TextAlignButton align="right" />
        <TextAlignButton align="justify" />
      </ToolbarGroup>

      {hasUploaders && (
        <>
          <ToolbarSeparator />
          <ToolbarGroup>
            <ImageUploadButton text="Add" />
          </ToolbarGroup>
        </>
      )}

      <Spacer />

      {isMobile && <ToolbarSeparator />}

      <ToolbarGroup>
        <SearchAndReplaceButton
          ref={searchAndReplaceButtonRef}
          aria-expanded={isSearchAndReplaceOpen}
          data-active-state={isSearchAndReplaceOpen ? "on" : "off"}
          onClick={onSearchAndReplaceClick}
        />
      </ToolbarGroup>
    </>
  )
}

const MobileToolbarContent = ({
  type,
  onBack,
}: {
  type: "highlighter" | "link"
  onBack: () => void
}) => (
  <>
    <ToolbarGroup>
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeftIcon className="tiptap-button-icon" />
        {type === "highlighter" ? (
          <HighlighterIcon className="tiptap-button-icon" />
        ) : (
          <LinkIcon className="tiptap-button-icon" />
        )}
      </Button>
    </ToolbarGroup>

    <ToolbarSeparator />

    {type === "highlighter" ? (
      <ColorHighlightPopoverContent />
    ) : (
      <LinkContent />
    )}
  </>
)

const IMAGE_NODE_NAME = "imageResize"

export interface SimpleEditorProps {
  /** HTML inicial do documento. */
  content?: string
  /** Disparado a cada mudança no conteúdo (já como HTML), inclusive quando uma imagem colada termina de subir e troca de blob/base64 para a URL final. */
  onChange?: (html: string) => void
  /** `false` esconde a toolbar e desliga a edição — só leitura. @default true */
  editable?: boolean
  /**
   * Funções de upload/rehost de imagens coladas, arrastadas ou inseridas pelo
   * botão "Add" da toolbar — cada dono do conteúdo (lição, board da aula ao
   * vivo etc.) injeta as suas, apontando pro Storage certo. Sem isto, o
   * botão de imagem some da toolbar e colar/arrastar imagens não faz nada.
   */
  uploaders?: ContentImageUploaders
  /** Chamado quando um upload de imagem colada/arrastada falha em segundo plano. */
  onImageUploadError?: (message: string) => void
  /** Tamanho máximo por imagem, em bytes. @default 15MB */
  maxImageSize?: number
  className?: string
}

/**
 * Editor de texto rico compartilhado por toda a plataforma (board ao vivo do
 * professor, conteúdo de lição do admin) — instalado via `tiptap add
 * simple-editor` e adaptado aqui para aceitar props em vez do conteúdo fixo
 * do template original (ver `content.json`, removido).
 *
 * Preserva o fluxo de upload de imagem que já existia no editor antigo
 * (colar/arrastar embute a imagem na hora via blob URL local, e sobe pro
 * Storage em segundo plano, trocando o `src` quando termina — ver
 * `components/editor/content-image-sync.ts`), além do botão dedicado
 * "Add" da toolbar (fluxo novo do template, mesmo `uploaders.uploadFile`).
 */
export function SimpleEditor({
  content,
  onChange,
  editable = true,
  uploaders,
  onImageUploadError,
  maxImageSize = DEFAULT_MAX_IMAGE_SIZE,
  className,
}: SimpleEditorProps) {
  const isMobile = useIsBreakpoint()
  const { height } = useWindowSize()
  const [mobileView, setMobileView] = useState<"main" | "highlighter" | "link">(
    "main"
  )
  // Nunca mostra o sub-toolbar "highlighter"/"link" fora do mobile — em vez
  // de sincronizar com um Effect (setState nele dispara outra renderização
  // à toa), deriva o valor efetivo direto no render.
  const effectiveMobileView = isMobile ? mobileView : "main"
  const [isSearchAndReplaceOpen, setIsSearchAndReplaceOpen] = useState(false)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const searchAndReplaceButtonRef = useRef<HTMLButtonElement>(null)
  // Altura da toolbar pro `useCursorVisibility` (abaixo) não colar o cursor
  // atrás dela no mobile. Medida via Effect/ResizeObserver, não lida direto
  // de `toolbarRef.current` durante o render (valor pode estar desatualizado
  // sob renderização concorrente).
  const [toolbarHeight, setToolbarHeight] = useState(0)

  const processedImageNodesRef = useRef<WeakSet<PMNode>>(new WeakSet())
  // Ponte entre handlePaste e transformPastedHTML (ambos chamados de forma
  // síncrona dentro do mesmo evento de colar): guarda os arquivos de imagem
  // reais do clipboard (se houver) para o transformPastedHTML trocar cada
  // referência quebrada "file://" no HTML colado pela imagem de verdade —
  // ou por um aviso, quando nem o clipboard tem os bytes da imagem.
  const pendingPasteImageFilesRef = useRef<File[]>([])

  const editor = useEditor({
    immediatelyRender: false,
    editable,
    editorProps: {
      attributes: {
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
        "aria-label": "Main content area, start typing to enter text.",
        class: "simple-editor",
      },
      handlePaste: (view, event) => {
        if (!uploaders) return false
        const items = event.clipboardData?.items
        const hasHtml = event.clipboardData?.types.includes("text/html")

        const imageFiles = items
          ? Array.from(items)
              .filter((item) => item.type.startsWith("image/"))
              .map((item) => item.getAsFile())
              .filter((file): file is File => Boolean(file))
          : []

        if (!hasHtml) {
          if (imageFiles.length === 0) return false
          // Paste de imagem "pura" (ex: screenshot), sem HTML acompanhando.
          event.preventDefault()
          for (const file of imageFiles) {
            const objectUrl = URL.createObjectURL(file)
            const node = view.state.schema.nodes[IMAGE_NODE_NAME].create({ src: objectUrl })
            view.dispatch(view.state.tr.replaceSelectionWith(node))
          }
          return true
        }

        // Deixa o HTML colar normalmente (retornando false); o
        // transformPastedHTML abaixo cuida de qualquer referência "file://"
        // quebrada usando os arquivos reais do clipboard, se houver.
        pendingPasteImageFilesRef.current = imageFiles
        return false
      },
      transformPastedHTML: (html) => {
        const files = pendingPasteImageFilesRef.current
        pendingPasteImageFilesRef.current = []
        if (!/file:\/\//i.test(html)) return html

        let index = 0
        return html.replace(/<img\b[^>]*\ssrc=(["'])file:\/\/.*?\1[^>]*>/gi, () => {
          const file = files[index]
          index += 1
          if (file) {
            const objectUrl = URL.createObjectURL(file)
            return `<img src="${objectUrl}">`
          }
          // O clipboard não trouxe os bytes da imagem, só o caminho local
          // (o navegador nunca consegue ler um "file://" de outra origem) —
          // não há como recuperar essa imagem automaticamente.
          return '<span data-pasted-image-unavailable="true" style="display:inline-block;padding:2px 8px;border:1px dashed #cbd5e1;border-radius:4px;color:#94a3b8;font-size:12px;">[imagem colada não pôde ser importada — copie a imagem sozinha ou arraste o arquivo aqui]</span>'
        })
      },
      handleDrop: (view, event) => {
        if (!uploaders) return false
        const files = event.dataTransfer?.files
        if (!files || files.length === 0) return false
        const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"))
        if (imageFiles.length === 0) return false

        event.preventDefault()
        const coords = { left: event.clientX, top: event.clientY }
        const dropPos = view.posAtCoords(coords)?.pos ?? view.state.selection.to

        let tr = view.state.tr
        for (const file of imageFiles) {
          const objectUrl = URL.createObjectURL(file)
          const node = view.state.schema.nodes[IMAGE_NODE_NAME].create({ src: objectUrl })
          tr = tr.insert(dropPos, node)
        }
        view.dispatch(tr)
        return true
      },
    },
    extensions: [
      StarterKit.configure({
        horizontalRule: false,
        link: {
          openOnClick: false,
          enableClickSelection: true,
        },
      }),
      HorizontalRule,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      ImageResize.configure({ minWidth: 80, maxWidth: 700 }),
      Typography,
      Superscript,
      Subscript,
      Selection,
      FindAndReplace.configure({
        searchDebounceMs: 500,
        injectCSS: false,
      }),
      ImageUploadNode.configure({
        type: IMAGE_NODE_NAME,
        accept: "image/*",
        maxSize: maxImageSize,
        limit: 3,
        upload: uploaders
          ? async (file, onProgress) => {
              onProgress?.({ progress: 0 })
              const url = await uploaders.uploadFile(file)
              onProgress?.({ progress: 100 })
              return url
            }
          : undefined,
        onError: (error) => {
          console.error("Upload failed:", error)
          onImageUploadError?.("Não foi possível enviar a imagem.")
        },
      }),
    ],
    content: content || "<p></p>",
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
      if (uploaders) {
        void processContentImages(
          editor,
          uploaders,
          processedImageNodesRef.current,
          (message) => onImageUploadError?.(message)
        )
      }
    },
  })

  // `useEditor` só usa `content` na criação — sem isto, um `content` que
  // muda depois por fora (ex: board ao vivo via RTDB refletindo a edição de
  // outra aba) nunca chegaria na tela até o componente ser remontado.
  useEffect(() => {
    if (!editor) return
    const next = content || "<p></p>"
    if (editor.getHTML() !== next) {
      editor.commands.setContent(next, { emitUpdate: false })
    }
  }, [editor, content])

  useEffect(() => {
    const el = toolbarRef.current
    if (!el) return
    const measure = () => setToolbarHeight(el.getBoundingClientRect().height)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [editable])

  const rect = useCursorVisibility({
    editor,
    overlayHeight: toolbarHeight,
  })

  const openSearchAndReplace = useCallback(() => {
    setMobileView("main")
    setIsSearchAndReplaceOpen(true)
  }, [])

  const closeSearchAndReplace = useCallback(() => {
    setIsSearchAndReplaceOpen(false)
    searchAndReplaceButtonRef.current?.focus()
  }, [])

  const toggleSearchAndReplace = useCallback(() => {
    if (isSearchAndReplaceOpen) {
      closeSearchAndReplace()
      return
    }

    openSearchAndReplace()
  }, [closeSearchAndReplace, isSearchAndReplaceOpen, openSearchAndReplace])

  return (
    <div className={cn("simple-editor-wrapper", className)}>
      <EditorContext.Provider value={{ editor }}>
        {editable && (
          <Toolbar
            ref={toolbarRef}
            style={{
              ...(isMobile
                ? {
                    bottom: `calc(100% - ${height - rect.y}px)`,
                  }
                : {}),
            }}
          >
            {effectiveMobileView === "main" ? (
              <MainToolbarContent
                onHighlighterClick={() => setMobileView("highlighter")}
                onLinkClick={() => setMobileView("link")}
                onSearchAndReplaceClick={toggleSearchAndReplace}
                isSearchAndReplaceOpen={isSearchAndReplaceOpen}
                searchAndReplaceButtonRef={searchAndReplaceButtonRef}
                isMobile={isMobile}
                hasUploaders={!!uploaders}
              />
            ) : (
              <MobileToolbarContent
                type={effectiveMobileView === "highlighter" ? "highlighter" : "link"}
                onBack={() => setMobileView("main")}
              />
            )}
          </Toolbar>
        )}

        {editable && (
          <SearchAndReplace
            className="simple-editor-search-and-replace"
            open={isSearchAndReplaceOpen}
            onOpen={openSearchAndReplace}
            onClose={closeSearchAndReplace}
            scrollIntoViewOptions={SEARCH_AND_REPLACE_SCROLL_OPTIONS}
          />
        )}

        <EditorContent
          editor={editor}
          role="presentation"
          className="simple-editor-content"
        />
      </EditorContext.Provider>
    </div>
  )
}
