"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
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
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor";
import { findRemovedOwnImages, type ContentImageUploaders } from "@/components/editor/content-image-sync";
import { Lesson } from "@/modules/lesson/lesson.types";
import { LearningItem, QuizQuestion, QuizSectionType } from "@/modules/practice/practice.types";
import { LESSON_STATUS_LABELS, LESSON_STATUS_STYLES } from "@/modules/lesson/lesson.utils";
import {
  updateLessonAction,
  updateLessonMediaAction,
  clearLessonMediaAction,
  updateLessonStatusAction,
  uploadLessonContentImageAction,
  rehostLessonContentImageAction,
  deleteLessonContentImagesAction,
} from "@/modules/lesson/lesson.actions";
import {
  generateLearningItemsAction,
  approveLearningItemAction,
  deleteLearningItemAction,
  approveQuizQuestionAction,
  deleteQuizQuestionAction,
} from "@/modules/practice/practice.actions";
import { runAction } from "@/lib/run-action";
import { GenerateMorePanel } from "./GenerateMorePanel";
import { LearningItemDetailModal } from "./LearningItemDetailModal";
import { QuizQuestionDetailModal } from "./QuizQuestionDetailModal";

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
      <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded border ${item.type === "VOCABULARY" ? "bg-primary/10 text-primary border-primary/20" : "bg-violet-50 text-violet-700 border-violet-200"}`}>
        {item.type === "VOCABULARY" ? "Vocab" : "Estrutura"}
      </span>
      <button type="button" onClick={() => onOpenDetails(item)} className="flex-1 min-w-0 text-left">
        <p className="font-semibold text-slate-900 text-sm truncate hover:text-primary transition-colors">{item.lemma}</p>
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
        <p className="text-sm text-slate-800 truncate hover:text-primary transition-colors">{question.question}</p>
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
  // Conteúdo atual do editor — a fonte de verdade pra salvar (`onSave`) é
  // este state, não `lesson.content`, que só reflete o que já está no banco.
  const [content, setContent] = useState(lesson.content || "<p></p>");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LessonFormInput>({
    resolver: zodResolver(LessonFormSchema),
    defaultValues: { title: lesson.title, level: lesson.level, transcript: lesson.transcript ?? "" },
  });

  const uploaders = useMemo<ContentImageUploaders>(
    () => ({
      uploadFile: async (file) => {
        const formData = new FormData();
        formData.append("image", file);
        const result = await uploadLessonContentImageAction(lesson.id, formData);
        if (!result.success || !result.data) {
          throw new Error(!result.success ? result.error : "Falha ao enviar imagem.");
        }
        return result.data.url;
      },
      rehostUrl: async (sourceUrl) => {
        const result = await rehostLessonContentImageAction({ lessonId: lesson.id, sourceUrl });
        if (!result.success || !result.data) {
          throw new Error(!result.success ? result.error : "Falha ao enviar imagem.");
        }
        return result.data.url;
      },
    }),
    [lesson.id]
  );

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
      // `runAction`, e não a Action direto: geração por IA é a chamada mais
      // sujeita a estourar o `maxDuration` da Vercel (504) — sem isso, a
      // exceção de transporte sobe crua e derruba a página inteira em vez de
      // aparecer aqui embaixo como um erro normal.
      const result = await runAction(() => generateLearningItemsAction({ lessonId: lesson.id, planId }));
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

        <Button type="button" size="sm" onClick={handleSubmit(onSave)} disabled={isSubmitting} loading={isSavePending} className="bg-primary hover:bg-primary/80">
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
            <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-sm h-[420px]">
              <SimpleEditor
                content={lesson.content || "<p></p>"}
                onChange={setContent}
                uploaders={uploaders}
                onImageUploadError={setImageUploadError}
              />
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
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-xs text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-y"
                {...register("transcript")}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-primary" /> Itens de Prática
                </h3>
                <p className="text-[11px] text-slate-400">
                  {learningItems.length} gerados{pendingCount > 0 ? ` • ${pendingCount} pendente${pendingCount > 1 ? "s" : ""} de revisão` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* "Gerar mais" só faz sentido quando já existe algo pra
                    complementar; numa lição vazia o caminho é o botão abaixo. */}
                {learningItems.length > 0 && (
                  <GenerateMorePanel
                    lessonId={lesson.id}
                    planId={planId}
                    vocabTotal={learningItems.filter((i) => i.type === "VOCABULARY").length}
                    structureTotal={learningItems.filter((i) => i.type === "STRUCTURE").length}
                    quizTotal={quizQuestions.length}
                  />
                )}
                <Button type="button" size="sm" onClick={handleGenerate} loading={isGeneratePending} className="bg-primary hover:bg-primary/80">
                  {!isGeneratePending && <Sparkles className="w-4 h-4 mr-1.5" />}
                  {isGeneratePending ? "Gerando... até 60s" : "Gerar com IA"}
                </Button>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 -mt-2">
              Gera vocabulário, estrutura e as perguntas de compreensão (abaixo) de uma vez só.
              {learningItems.length > 0 && " Como a lição já tem conteúdo, isso ACRESCENTA um lote novo — use \"Gerar mais\" para complementar sem duplicar."}
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

      <LearningItemDetailModal item={detailItem} planId={planId} onClose={() => setDetailItem(null)} />
      <QuizQuestionDetailModal
        question={detailQuestion}
        planId={planId}
        onClose={() => setDetailQuestion(null)}
      />
    </div>
  );
}
