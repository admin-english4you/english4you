"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Plus, ChevronUp, ChevronDown, PlayCircle, FileText, Pencil } from "lucide-react";
import { Plan } from "@/modules/plan/plan.types";
import { Lesson } from "@/modules/lesson/lesson.types";
import { LearningItem, QuizQuestion } from "@/modules/practice/practice.types";
import { PLAN_STATUS_LABELS, PLAN_STATUS_STYLES } from "@/modules/plan/plan.utils";
import { LESSON_STATUS_LABELS, LESSON_STATUS_STYLES } from "@/modules/lesson/lesson.utils";
import { addLessonToPlanAction, reorderPlanLessonsAction, updatePlanAction } from "@/modules/plan/plan.actions";
import { updateLessonStatusAction } from "@/modules/lesson/lesson.actions";
import { CreateLessonSchema } from "@/modules/lesson/lesson.schema";
import { PlanStatusEnum } from "@/modules/plan/plan.schema";
import { LessonEditor } from "./LessonEditor";
import { z } from "zod";

interface PlanDetailProps {
  plan: Plan;
  lessons: Lesson[];
  learningItemsByLessonId: Record<string, LearningItem[]>;
  quizQuestionsByLessonId: Record<string, QuizQuestion[]>;
}

const PLAN_STATUS_OPTIONS = [
  { value: "DRAFT", label: PLAN_STATUS_LABELS.DRAFT },
  { value: "ACTIVE", label: PLAN_STATUS_LABELS.ACTIVE },
  { value: "ARCHIVED", label: PLAN_STATUS_LABELS.ARCHIVED },
];

const EditPlanFormSchema = z.object({
  name: z.string().min(2, "O nome do plano é obrigatório"),
  description: z.string().optional(),
  status: PlanStatusEnum,
});

type EditPlanFormInput = z.infer<typeof EditPlanFormSchema>;

export function PlanDetail({ plan, lessons, learningItemsByLessonId, quizQuestionsByLessonId }: PlanDetailProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(lessons[0]?.id ?? null);
  const [isAddLessonModalOpen, setIsAddLessonModalOpen] = useState(false);
  const [isEditPlanModalOpen, setIsEditPlanModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedLesson = lessons.find((l) => l.id === selectedLessonId) ?? null;

  const {
    register: registerLesson,
    handleSubmit: handleSubmitLesson,
    reset: resetLessonForm,
    formState: { errors: lessonErrors, isSubmitting: isSubmittingLesson },
  } = useForm<{ title: string; level: string }>({
    resolver: zodResolver(CreateLessonSchema),
    defaultValues: { title: "", level: "" },
  });

  const {
    register: registerPlan,
    handleSubmit: handleSubmitPlan,
    control,
    formState: { errors: planErrors, isSubmitting: isSubmittingPlan },
  } = useForm<EditPlanFormInput>({
    resolver: zodResolver(EditPlanFormSchema),
    defaultValues: { name: plan.name, description: plan.description ?? "", status: plan.status },
  });

  const closeAddLessonModal = () => {
    setIsAddLessonModalOpen(false);
    setErrorMessage(null);
    resetLessonForm({ title: "", level: "" });
  };

  const onAddLesson = (data: { title: string; level: string }) => {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await addLessonToPlanAction({ planId: plan.id, ...data });
      if (result.success && result.data) {
        setSelectedLessonId(result.data.id);
        closeAddLessonModal();
        router.refresh();
      } else if (!result.success) {
        setErrorMessage(result.error);
      }
    });
  };

  const onUpdatePlan = (data: EditPlanFormInput) => {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await updatePlanAction({ planId: plan.id, ...data });
      if (result.success) {
        setIsEditPlanModalOpen(false);
        router.refresh();
      } else if (!result.success) {
        setErrorMessage(result.error);
      }
    });
  };

  const moveLesson = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= lessons.length) return;

    const reordered = [...lessons];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];

    startTransition(async () => {
      const result = await reorderPlanLessonsAction({
        planId: plan.id,
        orderedLessonIds: reordered.map((l) => l.id),
      });
      if (result.success) {
        router.refresh();
      } else if (!result.success) {
        setErrorMessage(result.error);
      }
    });
  };

  const toggleLessonStatus = (lesson: Lesson) => {
    const nextStatus = lesson.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    setErrorMessage(null);
    startTransition(async () => {
      const result = await updateLessonStatusAction({ lessonId: lesson.id, status: nextStatus });
      if (result.success) {
        router.refresh();
      } else if (!result.success) {
        setErrorMessage(result.error);
      }
    });
  };

  return (
    <AppLayout role="ADMIN">
      <div className="mx-auto space-y-6">
        <PageHeader title={plan.name} description={plan.description || "Sem descrição."}>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${PLAN_STATUS_STYLES[plan.status]}`}>
            {PLAN_STATUS_LABELS[plan.status]}
          </span>
          <Button type="button" variant="outline" onClick={() => setIsEditPlanModalOpen(true)}>
            <Pencil className="w-4 h-4 mr-2" /> Editar Plano
          </Button>
        </PageHeader>

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
            {errorMessage}
          </div>
        )}

        <div className="h-[calc(100vh-14rem)] min-h-[600px] flex flex-col md:flex-row overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Left Panel: Outline */}
          <div className="w-full md:w-80 border-r border-slate-200 bg-slate-50/70 flex flex-col shrink-0">
            <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between">
              <h2 className="font-bold text-slate-900 text-sm">Lições do Plano</h2>
              <Button type="button" size="sm" onClick={() => setIsAddLessonModalOpen(true)}>
                <Plus className="w-4 h-4 mr-1" /> Adicionar
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {lessons.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-6">Nenhuma lição neste plano ainda.</p>
              )}

              {lessons.map((lesson, index) => {
                const pendingCount =
                  (learningItemsByLessonId[lesson.id] ?? []).filter((i) => i.reviewStatus === "PENDING").length +
                  (quizQuestionsByLessonId[lesson.id] ?? []).filter((q) => q.reviewStatus === "PENDING").length;

                return (
                  <div
                    key={lesson.id}
                    className={`w-full text-left p-3 rounded-xl flex items-start gap-2 transition-all border ${
                      selectedLessonId === lesson.id
                        ? "bg-white shadow-sm border-indigo-200 ring-1 ring-indigo-100"
                        : "border-transparent hover:bg-slate-200/50"
                    }`}
                  >
                    <div className="flex flex-col shrink-0 -my-1">
                      <button
                        type="button"
                        onClick={() => moveLesson(index, "up")}
                        disabled={index === 0 || isPending}
                        className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveLesson(index, "down")}
                        disabled={index === lessons.length - 1 || isPending}
                        className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button type="button" onClick={() => setSelectedLessonId(lesson.id)} className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${LESSON_STATUS_STYLES[lesson.status]}`}>
                          {LESSON_STATUS_LABELS[lesson.status]}
                        </span>
                        {pendingCount > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                            {pendingCount} pendente{pendingCount > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      <h3 className={`font-semibold text-xs leading-snug line-clamp-2 ${selectedLessonId === lesson.id ? "text-indigo-700" : "text-slate-700"}`}>
                        {lesson.title}
                      </h3>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1">
                        {lesson.videoUrl ? <PlayCircle className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                        Nível {lesson.level}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleLessonStatus(lesson)}
                      disabled={isPending || lesson.status === "IN_PROGRESS"}
                      title={lesson.status === "ACTIVE" ? "Desativar lição" : "Ativar lição"}
                      className="shrink-0 text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 disabled:opacity-30"
                    >
                      {lesson.status === "ACTIVE" ? "Desativar" : "Ativar"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Panel: Editor */}
          <div className="flex-1 flex flex-col bg-white overflow-hidden">
            {selectedLesson ? (
              <LessonEditor
                key={selectedLesson.id}
                planId={plan.id}
                lesson={selectedLesson}
                learningItems={learningItemsByLessonId[selectedLesson.id] ?? []}
                quizQuestions={quizQuestionsByLessonId[selectedLesson.id] ?? []}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center p-8">
                <p className="text-sm text-slate-400 text-center">
                  Nenhuma lição selecionada. Clique em &quot;Adicionar&quot; para criar a primeira lição deste plano.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={isAddLessonModalOpen} onClose={closeAddLessonModal} title="Adicionar Lição">
        <form onSubmit={handleSubmitLesson(onAddLesson)} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Título</label>
            <Input type="text" placeholder="Ex: Present Simple vs Continuous" {...registerLesson("title")} />
            {lessonErrors.title && <p className="text-[11px] text-rose-600 mt-1">{lessonErrors.title.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Nível</label>
            <Input type="text" placeholder="Ex: A1, B2..." {...registerLesson("level")} />
            {lessonErrors.level && <p className="text-[11px] text-rose-600 mt-1">{lessonErrors.level.message}</p>}
          </div>
          <Modal.Footer>
            <Button type="button" variant="outline" onClick={closeAddLessonModal}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmittingLesson} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              Adicionar
            </Button>
          </Modal.Footer>
        </form>
      </Modal>

      <Modal isOpen={isEditPlanModalOpen} onClose={() => setIsEditPlanModalOpen(false)} title="Editar Plano">
        <form onSubmit={handleSubmitPlan(onUpdatePlan)} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Nome</label>
            <Input type="text" {...registerPlan("name")} />
            {planErrors.name && <p className="text-[11px] text-rose-600 mt-1">{planErrors.name.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Descrição</label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 outline-none focus:border-[#016ad1] focus:ring-2 focus:ring-[#016ad1]/20 transition-all resize-y"
              {...registerPlan("description")}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Status</label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onChange={field.onChange} options={PLAN_STATUS_OPTIONS} />
              )}
            />
          </div>
          <Modal.Footer>
            <Button type="button" variant="outline" onClick={() => setIsEditPlanModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmittingPlan} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              Salvar
            </Button>
          </Modal.Footer>
        </form>
      </Modal>
    </AppLayout>
  );
}
