"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { ImageResize } from "tiptap-extension-resize-image";
import type { Node as PMNode } from "@tiptap/pm/model";
import { z } from "zod";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Link2,
  Save,
  Sparkles,
  Loader2,
  Music,
  Video,
  X,
  CheckCircle2,
  Trash2,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lesson } from "@/modules/lesson/lesson.types";
import { LearningItem, QuizQuestion, QuizSectionType } from "@/modules/practice/practice.types";
import { LESSON_STATUS_LABELS, LESSON_STATUS_STYLES } from "@/modules/lesson/lesson.utils";
import {
  updateLessonAction,
  updateLessonMediaAction,
  clearLessonMediaAction,
  updateLessonStatusAction,
  deleteLessonContentImagesAction,
} from "@/modules/lesson/lesson.actions";
import {
  generateLearningItemsAction,
  approveLearningItemAction,
  deleteLearningItemAction,
  approveQuizQuestionAction,
  deleteQuizQuestionAction,
} from "@/modules/practice/practice.actions";
import { LearningItemDetailModal } from "./LearningItemDetailModal";
import { QuizQuestionDetailModal } from "./QuizQuestionDetailModal";
import { processContentImages, findRemovedOwnImages } from "./content-image-upload";

interface LessonEditorProps {
  planId: string;
  lesson: Lesson;
  learningItems: LearningItem[];
  quizQuestions: QuizQuestion[];
}

const QUIZ_SECTION_GROUPS: { section: QuizSectionType; label: string }[] = [
  { section: "vocabulary", label: "Vocabulário" },
  { section: "grammar", label: "Gramática" },
  { section: "context", label: "Contexto" },
  { section: "comprehension", label: "Compreensão Geral" },
];

const LessonFormSchema = z.object({
  title: z.string().min(2, "O título da lição é obrigatório"),
  level: z.string().min(1, "Informe o nível da lição"),
  transcript: z.string().optional(),
});

type LessonFormInput = z.infer<typeof LessonFormSchema>;

function itemSummary(item: LearningItem): string {
  if (item.type === "VOCABULARY") {
    const meta = item.metadata as { translation?: string; meanings?: { translation: string }[]; level?: string };
    return meta.translation ?? meta.meanings?.[0]?.translation ?? meta.level ?? "";
  }
  const meta = item.metadata as { structure_type?: string; level?: string };
  return meta.structure_type ?? meta.level ?? "";
}

function LearningItemRow({ item, planId, onOpenDetails }: { item: LearningItem; planId: string; onOpenDetails: (item: LearningItem) => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleApprove = () => {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await approveLearningItemAction({ itemId: item.id, planId });
      if (result.success) {
        router.refresh();
      } else {
        setErrorMessage(result.error);
      }
    });
  };

  const handleDelete = () => {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await deleteLearningItemAction({ itemId: item.id, planId });
      if (result.success) {
        router.refresh();
      } else {
        setErrorMessage(result.error);
      }
    });
  };

  return (
    <div className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg">
      <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded border ${item.type === "VOCABULARY" ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-violet-50 text-violet-700 border-violet-200"}`}>
        {item.type === "VOCABULARY" ? "Vocab" : "Estrutura"}
      </span>
      <button type="button" onClick={() => onOpenDetails(item)} className="flex-1 min-w-0 text-left">
        <p className="font-semibold text-slate-900 text-sm truncate hover:text-indigo-600 transition-colors">{item.lemma}</p>
        <p className="text-xs text-slate-500 truncate">{itemSummary(item)}</p>
        {errorMessage && <p className="text-[11px] text-rose-600 mt-1">{errorMessage}</p>}
      </button>
      <div className="flex items-center gap-2 shrink-0">
        {item.reviewStatus === "PENDING" ? (
          <button
            type="button"
            onClick={handleApprove}
            disabled={isPending}
            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors disabled:opacity-30"
            title="Aprovar"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          </button>
        ) : (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
            Aprovado
          </span>
        )}
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors disabled:opacity-30"
          title="Remover"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function QuizQuestionRow({
  question,
  planId,
  onOpenDetails,
}: {
  question: QuizQuestion;
  planId: string;
  onOpenDetails: (question: QuizQuestion) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleApprove = () => {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await approveQuizQuestionAction({ questionId: question.id, planId });
      if (result.success) {
        router.refresh();
      } else {
        setErrorMessage(result.error);
      }
    });
  };

  const handleDelete = () => {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await deleteQuizQuestionAction({ questionId: question.id, planId });
      if (result.success) {
        router.refresh();
      } else {
        setErrorMessage(result.error);
      }
    });
  };

  return (
    <div className="flex items-center gap-3 p-2.5 border border-slate-200 rounded-lg">
      <button type="button" onClick={() => onOpenDetails(question)} className="flex-1 min-w-0 text-left">
        <p className="text-sm text-slate-800 truncate hover:text-indigo-600 transition-colors">{question.question}</p>
        {errorMessage && <p className="text-[11px] text-rose-600 mt-1">{errorMessage}</p>}
      </button>
      <div className="flex items-center gap-2 shrink-0">
        {question.reviewStatus === "PENDING" ? (
          <button
            type="button"
            onClick={handleApprove}
            disabled={isPending}
            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors disabled:opacity-30"
            title="Aprovar"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          </button>
        ) : (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
            Aprovada
          </span>
        )}
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors disabled:opacity-30"
          title="Remover"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function LessonEditor({ planId, lesson, learningItems, quizQuestions }: LessonEditorProps) {
  const router = useRouter();
  const [isSavePending, startSaveTransition] = useTransition();
  const [isMediaPending, startMediaTransition] = useTransition();
  const [isGeneratePending, startGenerateTransition] = useTransition();
  const [isActivatePending, startActivateTransition] = useTransition();

  const [saveError, setSaveError] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [activateError, setActivateError] = useState<string | null>(null);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<LearningItem | null>(null);
  const [detailQuestion, setDetailQuestion] = useState<QuizQuestion | null>(null);

  const audioInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const processedImageNodesRef = useRef<WeakSet<PMNode>>(new WeakSet());
  // Ponte entre handlePaste e transformPastedHTML (ambos chamados de forma
  // síncrona dentro do mesmo evento de colar): guarda os arquivos de imagem
  // reais do clipboard (se houver) para o transformPastedHTML trocar cada
  // referência quebrada "file://" no HTML colado pela imagem de verdade —
  // ou por um aviso, quando nem o clipboard tem os bytes da imagem
  // (limitação do navegador: uma página nunca consegue ler um caminho local
  // "file://" diretamente, então sem os bytes no clipboard não há como
  // recuperar essa imagem automaticamente).
  const pendingPasteImageFilesRef = useRef<File[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LessonFormInput>({
    resolver: zodResolver(LessonFormSchema),
    defaultValues: { title: lesson.title, level: lesson.level, transcript: lesson.transcript ?? "" },
  });

  const editor = useEditor({
    extensions: [StarterKit, ImageResize.configure({ minWidth: 80, maxWidth: 700 })],
    content: lesson.content || "<p></p>",
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      void processContentImages(editor, lesson.id, processedImageNodesRef.current, setImageUploadError);
    },
    editorProps: {
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        const hasHtml = event.clipboardData?.types.includes("text/html");

        const imageFiles = items
          ? Array.from(items)
              .filter((item) => item.type.startsWith("image/"))
              .map((item) => item.getAsFile())
              .filter((file): file is File => Boolean(file))
          : [];

        if (!hasHtml) {
          if (imageFiles.length === 0) return false;
          // Paste de imagem "pura" (ex: screenshot), sem HTML acompanhando.
          event.preventDefault();
          for (const file of imageFiles) {
            const objectUrl = URL.createObjectURL(file);
            const node = view.state.schema.nodes.imageResize.create({ src: objectUrl });
            view.dispatch(view.state.tr.replaceSelectionWith(node));
          }
          return true;
        }

        // Deixa o HTML colar normalmente (retornando false); o
        // transformPastedHTML abaixo cuida de qualquer referência "file://"
        // quebrada usando os arquivos reais do clipboard, se houver.
        pendingPasteImageFilesRef.current = imageFiles;
        return false;
      },
      transformPastedHTML: (html) => {
        const files = pendingPasteImageFilesRef.current;
        pendingPasteImageFilesRef.current = [];
        if (!/file:\/\//i.test(html)) return html;

        let index = 0;
        return html.replace(/<img\b[^>]*\ssrc=(["'])file:\/\/.*?\1[^>]*>/gi, () => {
          const file = files[index];
          index += 1;
          if (file) {
            const objectUrl = URL.createObjectURL(file);
            return `<img src="${objectUrl}">`;
          }
          // O clipboard não trouxe os bytes da imagem, só o caminho local
          // (o navegador nunca consegue ler um "file://" de outra origem) —
          // não há como recuperar essa imagem automaticamente.
          return '<span data-pasted-image-unavailable="true" style="display:inline-block;padding:2px 8px;border:1px dashed #cbd5e1;border-radius:4px;color:#94a3b8;font-size:12px;">[imagem colada não pôde ser importada — copie a imagem sozinha ou arraste o arquivo aqui]</span>';
        });
      },
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;
        const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
        if (imageFiles.length === 0) return false;

        event.preventDefault();
        const coords = { left: event.clientX, top: event.clientY };
        const dropPos = view.posAtCoords(coords)?.pos ?? view.state.selection.to;

        let tr = view.state.tr;
        for (const file of imageFiles) {
          const objectUrl = URL.createObjectURL(file);
          const node = view.state.schema.nodes.imageResize.create({ src: objectUrl });
          tr = tr.insert(dropPos, node);
        }
        view.dispatch(tr);
        return true;
      },
    },
  });

  const pendingCount = learningItems.filter((i) => i.reviewStatus === "PENDING").length;
  const pendingQuestionCount = quizQuestions.filter((q) => q.reviewStatus === "PENDING").length;
  const hasMedia = Boolean(lesson.audioUrl || lesson.videoUrl);

  const missingSections = QUIZ_SECTION_GROUPS.filter(
    ({ section }) => !quizQuestions.some((q) => q.renderMode === "quiz_comprehensive" && q.section === section && q.reviewStatus === "APPROVED")
  );
  const hasApprovedListening = quizQuestions.some((q) => q.renderMode === "listening_choice" && q.reviewStatus === "APPROVED");

  const canActivate =
    lesson.status === "DISABLED" &&
    learningItems.length > 0 &&
    pendingCount === 0 &&
    pendingQuestionCount === 0 &&
    missingSections.length === 0 &&
    (!hasMedia || hasApprovedListening);

  const activationBlockReason = (() => {
    if (learningItems.length === 0) return "Gere os itens de prática e as perguntas de compreensão antes de ativar.";
    if (pendingCount > 0) return `Revise (aprove ou remova) os ${pendingCount} item(ns) de prática pendente(s) antes de ativar.`;
    if (pendingQuestionCount > 0) return `Revise (aprove ou remova) as ${pendingQuestionCount} pergunta(s) pendente(s) antes de ativar.`;
    if (missingSections.length > 0) return `Falta pelo menos 1 pergunta aprovada na seção "${missingSections[0].label}".`;
    if (hasMedia && !hasApprovedListening) return "Falta pelo menos 1 pergunta aprovada de Áudio/Vídeo Específico.";
    return null;
  })();

  const onSave = (data: LessonFormInput) => {
    setSaveError(null);
    const content = editor?.getHTML() ?? "";
    const removedImageUrls = findRemovedOwnImages(lesson.content, content);

    startSaveTransition(async () => {
      const result = await updateLessonAction({ lessonId: lesson.id, ...data, content });
      if (result.success) {
        if (removedImageUrls.length > 0) {
          await deleteLessonContentImagesAction({ lessonId: lesson.id, imageUrls: removedImageUrls });
        }
        router.refresh();
      } else {
        setSaveError(result.error);
      }
    });
  };

  const handleMediaChange = (kind: "audio" | "video") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaError(null);

    const formData = new FormData();
    formData.append("media", file);

    startMediaTransition(async () => {
      const result = await updateLessonMediaAction(lesson.id, kind, formData);
      if (result.success) {
        router.refresh();
      } else {
        setMediaError(result.error);
      }
      if (kind === "audio" && audioInputRef.current) audioInputRef.current.value = "";
      if (kind === "video" && videoInputRef.current) videoInputRef.current.value = "";
    });
  };

  const handleClearMedia = (kind: "audio" | "video") => {
    setMediaError(null);
    startMediaTransition(async () => {
      const result = await clearLessonMediaAction({ lessonId: lesson.id, kind });
      if (result.success) {
        router.refresh();
      } else {
        setMediaError(result.error);
      }
    });
  };

  const handleGenerate = () => {
    setGenerateError(null);
    startGenerateTransition(async () => {
      const result = await generateLearningItemsAction({ lessonId: lesson.id, planId });
      if (result.success) {
        router.refresh();
      } else {
        setGenerateError(result.error);
      }
    });
  };

  const handleActivate = () => {
    setActivateError(null);
    startActivateTransition(async () => {
      const result = await updateLessonStatusAction({ lessonId: lesson.id, status: "ACTIVE" });
      if (result.success) {
        router.refresh();
      } else {
        setActivateError(result.error);
      }
    });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Action Header */}
      <div className="h-14 border-b border-slate-200 flex items-center justify-between px-6 shrink-0 bg-white z-10">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <span>Lições</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-900 font-semibold truncate max-w-[200px]">{lesson.title}</span>
          <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded border ${LESSON_STATUS_STYLES[lesson.status]}`}>
            {LESSON_STATUS_LABELS[lesson.status]}
          </span>
        </div>

        <Button type="button" size="sm" onClick={handleSubmit(onSave)} disabled={isSubmitting} loading={isSavePending} className="bg-indigo-600 hover:bg-indigo-700">
          {!isSavePending && <Save className="w-4 h-4 mr-1.5" />}
          Salvar
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-slate-50/30">
        <div className="max-w-3xl mx-auto space-y-6">
          {saveError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">{saveError}</div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Título da Lição</label>
              <Input type="text" className="bg-white" {...register("title")} />
              {errors.title && <p className="text-[11px] text-rose-600 mt-1">{errors.title.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Nível</label>
              <Input type="text" placeholder="Ex: A1, B2..." className="bg-white w-40" {...register("level")} />
              {errors.level && <p className="text-[11px] text-rose-600 mt-1">{errors.level.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Conteúdo da Aula</label>
            {imageUploadError && (
              <p className="text-[11px] text-rose-600 mb-1.5">{imageUploadError}</p>
            )}
            <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 flex flex-wrap items-center gap-1">
                <button type="button" onClick={() => editor?.chain().focus().toggleBold().run()} className={`p-1.5 rounded transition-colors ${editor?.isActive("bold") ? "bg-indigo-100 text-indigo-700" : "text-slate-600 hover:bg-slate-200"}`}>
                  <Bold className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => editor?.chain().focus().toggleItalic().run()} className={`p-1.5 rounded transition-colors ${editor?.isActive("italic") ? "bg-indigo-100 text-indigo-700" : "text-slate-600 hover:bg-slate-200"}`}>
                  <Italic className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => editor?.chain().focus().toggleUnderline().run()} className={`p-1.5 rounded transition-colors ${editor?.isActive("underline") ? "bg-indigo-100 text-indigo-700" : "text-slate-600 hover:bg-slate-200"}`}>
                  <UnderlineIcon className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-slate-300 mx-1"></div>
                <button type="button" onClick={() => editor?.chain().focus().toggleBulletList().run()} className={`p-1.5 rounded transition-colors ${editor?.isActive("bulletList") ? "bg-indigo-100 text-indigo-700" : "text-slate-600 hover:bg-slate-200"}`}>
                  <List className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => editor?.chain().focus().toggleOrderedList().run()} className={`p-1.5 rounded transition-colors ${editor?.isActive("orderedList") ? "bg-indigo-100 text-indigo-700" : "text-slate-600 hover:bg-slate-200"}`}>
                  <ListOrdered className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-slate-300 mx-1"></div>
                <button
                  type="button"
                  onClick={() => {
                    const url = window.prompt("URL do link:");
                    if (url) editor?.chain().focus().setLink({ href: url }).run();
                  }}
                  className={`p-1.5 rounded transition-colors ${editor?.isActive("link") ? "bg-indigo-100 text-indigo-700" : "text-slate-600 hover:bg-slate-200"}`}
                >
                  <Link2 className="w-4 h-4" />
                </button>
              </div>
              {/* `lesson-prose` é a mesma classe do leitor do aluno — sem ela o
                  preflight do Tailwind achata h1/ul/ol e o que o admin escreve
                  não é o que o aluno vê. */}
              <EditorContent editor={editor} className="lesson-prose min-h-[260px] p-4" />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Imagens coladas ou arrastadas no conteúdo são enviadas automaticamente para o servidor. Clique numa imagem para redimensioná-la ou movê-la. Se colar de um documento (Word/Docs) e a imagem não aparecer, tente copiar a imagem sozinha (clique direito nela → Copiar) ou arraste o arquivo direto para aqui.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Áudio / Vídeo (opcional)</label>
            {mediaError && <p className="text-[11px] text-rose-600">{mediaError}</p>}

            <div className="flex flex-wrap gap-3">
              <input ref={audioInputRef} type="file" accept="audio/mp3,audio/mpeg,audio/wav,audio/x-wav,audio/mp4" onChange={handleMediaChange("audio")} className="hidden" />
              {lesson.audioUrl ? (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg text-xs text-slate-700">
                  <Music className="w-3.5 h-3.5" />
                  <a href={lesson.audioUrl} target="_blank" rel="noreferrer" className="hover:underline">Áudio enviado</a>
                  <button type="button" onClick={() => handleClearMedia("audio")} disabled={isMediaPending} className="text-slate-400 hover:text-rose-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <Button type="button" variant="outline" size="sm" onClick={() => audioInputRef.current?.click()} loading={isMediaPending}>
                  {!isMediaPending && <Music className="w-3.5 h-3.5 mr-1.5" />}
                  Enviar Áudio
                </Button>
              )}

              <input ref={videoInputRef} type="file" accept="video/mp4,video/quicktime,video/webm" onChange={handleMediaChange("video")} className="hidden" />
              {lesson.videoUrl ? (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg text-xs text-slate-700">
                  <Video className="w-3.5 h-3.5" />
                  <a href={lesson.videoUrl} target="_blank" rel="noreferrer" className="hover:underline">Vídeo enviado</a>
                  <button type="button" onClick={() => handleClearMedia("video")} disabled={isMediaPending} className="text-slate-400 hover:text-rose-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <Button type="button" variant="outline" size="sm" onClick={() => videoInputRef.current?.click()} loading={isMediaPending}>
                  {!isMediaPending && <Video className="w-3.5 h-3.5 mr-1.5" />}
                  Enviar Vídeo
                </Button>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Transcrição (opcional — a IA preenche automaticamente se ficar em branco)</label>
              <textarea
                rows={4}
                placeholder="Cole a transcrição do áudio/vídeo aqui, ou deixe em branco para a IA transcrever."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-xs text-slate-800 outline-none focus:border-[#016ad1] focus:ring-2 focus:ring-[#016ad1]/20 transition-all resize-y"
                {...register("transcript")}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-500" /> Itens de Prática
                </h3>
                <p className="text-[11px] text-slate-400">
                  {learningItems.length} gerados{pendingCount > 0 ? ` • ${pendingCount} pendente${pendingCount > 1 ? "s" : ""} de revisão` : ""}
                </p>
              </div>
              <Button type="button" size="sm" onClick={handleGenerate} loading={isGeneratePending} className="bg-indigo-600 hover:bg-indigo-700">
                {!isGeneratePending && <Sparkles className="w-4 h-4 mr-1.5" />}
                {isGeneratePending ? "Gerando... até 60s" : "Gerar com IA"}
              </Button>
            </div>
            <p className="text-[11px] text-slate-400 -mt-2">
              Gera vocabulário, estrutura e as perguntas de compreensão (abaixo) de uma vez só.
            </p>

            {generateError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">{generateError}</div>
            )}

            {learningItems.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                Nenhum item gerado ainda. Escreva o conteúdo (e, opcionalmente, envie áudio/vídeo) e clique em &quot;Gerar com IA&quot;.
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {learningItems.map((item) => (
                  <LearningItemRow key={item.id} item={item} planId={planId} onOpenDetails={setDetailItem} />
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-violet-500" /> Perguntas de Compreensão
              </h3>
              <p className="text-[11px] text-slate-400">
                {quizQuestions.length} geradas{pendingQuestionCount > 0 ? ` • ${pendingQuestionCount} pendente${pendingQuestionCount > 1 ? "s" : ""} de revisão` : ""}
              </p>
            </div>

            {quizQuestions.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                Nenhuma pergunta gerada ainda — são criadas junto com os itens de prática ao clicar em &quot;Gerar com IA&quot; acima.
              </p>
            ) : (
              <div className="space-y-4">
                {QUIZ_SECTION_GROUPS.map(({ section, label }) => {
                  const sectionQuestions = quizQuestions.filter(
                    (q) => q.renderMode === "quiz_comprehensive" && q.section === section
                  );
                  return (
                    <div key={section}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{label}</h4>
                        {sectionQuestions.length === 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                            faltando
                          </span>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        {sectionQuestions.map((q) => (
                          <QuizQuestionRow key={q.id} question={q} planId={planId} onOpenDetails={setDetailQuestion} />
                        ))}
                      </div>
                    </div>
                  );
                })}

                {hasMedia && (
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Áudio/Vídeo Específico</h4>
                      {!hasApprovedListening && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                          faltando
                        </span>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      {quizQuestions
                        .filter((q) => q.renderMode === "listening_choice")
                        .map((q) => (
                          <QuizQuestionRow key={q.id} question={q} planId={planId} onOpenDetails={setDetailQuestion} />
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            {activateError && (
              <div className="p-3 mb-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">{activateError}</div>
            )}
            {lesson.status === "ACTIVE" ? (
              <div className="flex items-center gap-2 text-emerald-700 text-sm font-semibold">
                <ShieldCheck className="w-4 h-4" /> Esta lição está ativa e liberada para os alunos.
              </div>
            ) : (
              <Button
                type="button"
                onClick={handleActivate}
                disabled={!canActivate}
                loading={isActivatePending}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isActivatePending ? "Ativando..." : "Aprovar e Ativar Lição"}
              </Button>
            )}
            {lesson.status !== "ACTIVE" && activationBlockReason && (
              <p className="text-[11px] text-slate-400 text-center mt-2">{activationBlockReason}</p>
            )}
          </div>
        </div>
      </div>

      <LearningItemDetailModal item={detailItem} onClose={() => setDetailItem(null)} />
      <QuizQuestionDetailModal question={detailQuestion} onClose={() => setDetailQuestion(null)} />
    </div>
  );
}
