"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Headphones, Loader2, Pencil, Sparkles, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import {
  createAiClipAction,
  createUploadedClipAction,
  deleteClipAction,
  updateClipTranscriptAction,
} from "@/modules/practice/practice.actions";
import { CLIP_TARGET_SECONDS, ClipVoiceEnum } from "@/modules/practice/practice.schema";
import type { ClipVoice, ListeningClip, QuizQuestion } from "@/modules/practice/practice.types";

interface ListeningClipsPanelProps {
  planId: string;
  lessonId: string;
  lessonIsActive: boolean;
  clips: ListeningClip[];
  /** Perguntas de listening ligadas a clipes (as do legado ficam fora). */
  clipQuestions: QuizQuestion[];
  onOpenQuestion: (question: QuizQuestion) => void;
}

type Mode = "ai" | "upload" | null;

interface UploadDraft {
  file: File;
  transcript: string;
  questionCount: number;
}

const QUESTION_OPTIONS = [1, 2, 3].map((n) => ({ value: String(n), label: `${n} pergunta${n > 1 ? "s" : ""}` }));
const DURATION_OPTIONS = CLIP_TARGET_SECONDS.map((s) => ({ value: String(s), label: `${s} segundos` }));
const VOICE_OPTIONS = ClipVoiceEnum.options.map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));

function Label({ children }: { children: React.ReactNode }) {
  return <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">{children}</span>;
}

export function ListeningClipsPanel({
  planId,
  lessonId,
  lessonIsActive,
  clips,
  clipQuestions,
  onOpenQuestion,
}: ListeningClipsPanelProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(null);
  const [progress, setProgress] = useState<string | null>(null);

  // Gerar com IA
  const [aiCount, setAiCount] = useState(3);
  const [aiSeconds, setAiSeconds] = useState("30");
  const [aiQuestions, setAiQuestions] = useState("1");
  const [aiVoice, setAiVoice] = useState<ClipVoice>("marin");

  // Enviar áudios
  const [uploads, setUploads] = useState<UploadDraft[]>([]);

  // Edição / exclusão
  const [editingClipId, setEditingClipId] = useState<string | null>(null);
  const [transcriptDraft, setTranscriptDraft] = useState("");
  const [clipToDelete, setClipToDelete] = useState<ListeningClip | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isBusy = progress !== null;

  const finishBatch = (ok: number, total: number, firstError: string | null) => {
    setProgress(null);
    if (ok === total) {
      toast.success(`${ok} áudio${ok > 1 ? "s" : ""} criado${ok > 1 ? "s" : ""}.`);
      setMode(null);
      setUploads([]);
    } else {
      toast.error(`${ok} de ${total} áudios criados. ${firstError ?? ""}`.trim());
    }
    router.refresh();
  };

  // Um áudio por chamada: cada geração leva vários segundos e o lote inteiro
  // não caberia no limite de tempo de uma requisição.
  const handleGenerate = async () => {
    let ok = 0;
    let firstError: string | null = null;
    for (let i = 0; i < aiCount; i++) {
      setProgress(`Gerando áudio ${i + 1} de ${aiCount}...`);
      const result = await createAiClipAction({
        lessonId,
        planId,
        targetSeconds: Number(aiSeconds),
        questionCount: Number(aiQuestions),
        voice: aiVoice,
      });
      if (result.success) ok += 1;
      else firstError ??= result.error;
    }
    finishBatch(ok, aiCount, firstError);
  };

  const handleUpload = async () => {
    let ok = 0;
    let firstError: string | null = null;
    for (const [i, draft] of uploads.entries()) {
      setProgress(`Enviando áudio ${i + 1} de ${uploads.length}...`);
      const formData = new FormData();
      formData.append("audio", draft.file);
      formData.append("transcript", draft.transcript);
      formData.append("questionCount", String(draft.questionCount));
      const result = await createUploadedClipAction(lessonId, planId, formData);
      if (result.success) ok += 1;
      else firstError ??= result.error;
    }
    finishBatch(ok, uploads.length, firstError);
  };

  const handleSaveTranscript = async (clipId: string) => {
    setIsSaving(true);
    const result = await updateClipTranscriptAction({ clipId, planId, transcript: transcriptDraft });
    setIsSaving(false);
    if (result.success) {
      toast.success("Transcrição atualizada.");
      setEditingClipId(null);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  const handleDelete = async () => {
    if (!clipToDelete) return;
    setIsSaving(true);
    const result = await deleteClipAction({ clipId: clipToDelete.id, planId });
    setIsSaving(false);
    if (result.success) {
      toast.success("Áudio excluído.");
      setClipToDelete(null);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
            <Headphones className="h-4 w-4 text-sky-500" /> Áudios da prática (listening)
          </h3>
          <p className="text-[11px] text-slate-400">
            Áudios curtos para o dia de compreensão auditiva — cada um com as suas perguntas. Opcional: sem áudios, os
            dias 5 e 6 dividem o quiz.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => setMode(mode === "ai" ? null : "ai")} disabled={isBusy}>
            <Sparkles className="mr-1 h-3.5 w-3.5" /> Gerar com IA
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setMode(mode === "upload" ? null : "upload")} disabled={isBusy}>
            <Upload className="mr-1 h-3.5 w-3.5" /> Enviar áudios
          </Button>
        </div>
      </div>

      {lessonIsActive && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Esta lição já está ativa: adicionar o primeiro áudio (ou excluir o último) muda os dias 5 e 6 de quem está
          praticando esta lição agora.
        </div>
      )}

      {mode === "ai" && (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="block">
              <Label>Quantos áudios</Label>
              <input
                type="number"
                min={1}
                max={10}
                value={aiCount}
                onChange={(e) => setAiCount(Math.min(10, Math.max(1, Number(e.target.value) || 1)))}
                className="h-9 w-full rounded-md border border-slate-300 px-3 text-sm"
              />
            </label>
            <div>
              <Label>Duração de cada</Label>
              <Select value={aiSeconds} onChange={setAiSeconds} options={DURATION_OPTIONS} />
            </div>
            <div>
              <Label>Perguntas por áudio</Label>
              <Select value={aiQuestions} onChange={setAiQuestions} options={QUESTION_OPTIONS} />
            </div>
            <div>
              <Label>Voz</Label>
              <Select value={aiVoice} onChange={(v) => setAiVoice(v as ClipVoice)} options={VOICE_OPTIONS} />
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            A IA escreve um diálogo ou recado curto com o conteúdo desta lição, gera a voz e cria as perguntas. A
            duração é aproximada.
          </p>
          <div className="flex justify-end">
            <Button type="button" size="sm" onClick={handleGenerate} disabled={isBusy}>
              {isBusy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1 h-3.5 w-3.5" />}
              {progress ?? `Gerar ${aiCount} áudio${aiCount > 1 ? "s" : ""}`}
            </Button>
          </div>
        </div>
      )}

      {mode === "upload" && (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <input
            type="file"
            multiple
            accept=".mp3,.wav,.m4a,audio/mpeg,audio/wav,audio/mp4"
            disabled={isBusy}
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              setUploads(files.map((file) => ({ file, transcript: "", questionCount: 1 })));
            }}
            className="block w-full text-xs"
          />
          <p className="text-[11px] text-slate-500">mp3, wav ou m4a, até 25MB cada. Prefira áudios curtos.</p>

          {uploads.map((draft, index) => (
            <div key={`${draft.file.name}-${index}`} className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-semibold text-slate-700">{draft.file.name}</span>
                <div className="w-36">
                  <Select
                    value={String(draft.questionCount)}
                    onChange={(v) =>
                      setUploads((prev) => prev.map((d, i) => (i === index ? { ...d, questionCount: Number(v) } : d)))
                    }
                    options={QUESTION_OPTIONS}
                  />
                </div>
              </div>
              <textarea
                rows={2}
                value={draft.transcript}
                onChange={(e) =>
                  setUploads((prev) => prev.map((d, i) => (i === index ? { ...d, transcript: e.target.value } : d)))
                }
                placeholder="Transcrição (opcional — deixe vazio para a IA transcrever)"
                lang="en"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
              />
            </div>
          ))}

          <div className="flex justify-end">
            <Button type="button" size="sm" onClick={handleUpload} disabled={isBusy || uploads.length === 0}>
              {isBusy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-1 h-3.5 w-3.5" />}
              {progress ?? `Enviar ${uploads.length} áudio${uploads.length === 1 ? "" : "s"}`}
            </Button>
          </div>
        </div>
      )}

      {clips.length === 0 ? (
        <p className="py-4 text-center text-xs text-slate-400">Nenhum áudio da prática ainda.</p>
      ) : (
        <div className="space-y-3">
          {clips.map((clip, index) => {
            const questions = clipQuestions.filter((q) => q.clipId === clip.id);
            const isEditing = editingClipId === clip.id;
            return (
              <div key={clip.id} className="space-y-2 rounded-lg border border-slate-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">Áudio {index + 1}</span>
                    <span
                      className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${
                        clip.source === "AI"
                          ? "border-violet-200 bg-violet-50 text-violet-700"
                          : "border-sky-200 bg-sky-50 text-sky-700"
                      }`}
                    >
                      {clip.source === "AI" ? `IA · ~${clip.targetSeconds}s` : "Enviado"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setClipToDelete(clip)}
                    className="p-1 text-slate-400 hover:text-rose-600"
                    aria-label={`Excluir áudio ${index + 1}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <audio controls preload="none" src={clip.audioUrl} className="h-9 w-full" />

                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      rows={4}
                      value={transcriptDraft}
                      onChange={(e) => setTranscriptDraft(e.target.value)}
                      lang="en"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                    />
                    <div className="flex justify-end gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => setEditingClipId(null)} disabled={isSaving}>
                        Cancelar
                      </Button>
                      <Button type="button" size="sm" onClick={() => handleSaveTranscript(clip.id)} loading={isSaving}>
                        Salvar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <p className="flex-1 whitespace-pre-line text-[11px] text-slate-500 line-clamp-3">{clip.transcript}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingClipId(clip.id);
                        setTranscriptDraft(clip.transcript);
                      }}
                      className="p-1 text-slate-400 hover:text-primary"
                      aria-label="Editar transcrição"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                <div className="space-y-1">
                  {questions.map((q) => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => onOpenQuestion(q)}
                      className="block w-full truncate rounded-md bg-slate-50 px-2 py-1.5 text-left text-[11px] text-slate-700 hover:bg-primary/10"
                    >
                      {q.question}
                    </button>
                  ))}
                  {questions.length === 0 && (
                    <p className="text-[11px] text-rose-600">Este áudio está sem perguntas — exclua e crie de novo.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={clipToDelete !== null} onClose={() => !isSaving && setClipToDelete(null)} title="Excluir áudio">
        <div className="space-y-4 p-6">
          <p className="text-sm text-slate-700">
            O áudio e as perguntas dele serão excluídos. Esta ação não pode ser desfeita.
          </p>
          <Modal.Footer>
            <Button type="button" variant="outline" onClick={() => setClipToDelete(null)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete} loading={isSaving}>
              Excluir
            </Button>
          </Modal.Footer>
        </div>
      </Modal>
    </div>
  );
}
