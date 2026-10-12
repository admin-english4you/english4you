"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { updateLearningItemAction } from "@/modules/practice/practice.actions";
import type { LearningItem, VocabMetadata, StructureMetadata } from "@/modules/practice/practice.types";
import { wordOrderMatchesText } from "@/modules/practice/practice.schema";

/**
 * Correção manual de um item de prática.
 *
 * Edita só os campos que o ALUNO vê — termo, tradução, exemplos e a ordem das
 * palavras. O resto do metadata (fonética, sinônimos, papéis sintáticos,
 * `is_visual`...) é preservado intacto no save: são campos que a IA preenche,
 * que não aparecem em nenhum render mode e cuja edição manual só criaria
 * chance de quebrar o formato sem nenhum ganho pra quem está corrigindo.
 *
 * O `word_order` é editado como uma linha de texto separada por espaço, e não
 * campo a campo: ele é exatamente o banco de palavras do "monte a frase", e é
 * assim que o admin pensa nele. O `role` de cada palavra é preservado por
 * posição — quando o admin muda a quantidade de palavras, as novas herdam
 * "word" como papel, que é o que os render modes tratam como neutro.
 */
interface LearningItemEditFormProps {
  item: LearningItem;
  planId: string;
  onCancel: () => void;
  onSaved: () => void;
}

interface ExampleDraft {
  /** Posição do exemplo original de onde este veio; null = exemplo novo. */
  originalIndex: number | null;
  text: string;
  translation: string;
  wordOrder: string;
}

/** Mínimos do schema: o motor precisa de exemplos suficientes para os dias de prática. */
const MIN_EXAMPLES = { VOCABULARY: 2, STRUCTURE: 3 } as const;

function wordsOf(wordOrder: string): string[] {
  return wordOrder.split(/\s+/).filter(Boolean);
}

function wordOrderMatches(draft: ExampleDraft): boolean {
  return wordOrderMatchesText({
    text: draft.text,
    word_order: wordsOf(draft.wordOrder).map((word, index) => ({ word, index })),
  });
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-1">
      {children}
    </span>
  );
}

export function LearningItemEditForm({ item, planId, onCancel, onSaved }: LearningItemEditFormProps) {
  const isVocab = item.type === "VOCABULARY";
  const vocab = isVocab ? (item.metadata as VocabMetadata) : null;
  const structure = !isVocab ? (item.metadata as StructureMetadata) : null;

  const [lemma, setLemma] = useState(item.lemma);
  const [translation, setTranslation] = useState(item.metadata.translation ?? "");
  const [explanation, setExplanation] = useState(structure?.explanation ?? "");
  const [examples, setExamples] = useState<ExampleDraft[]>(() =>
    item.metadata.examples.map((example, index) => ({
      originalIndex: index,
      text: example.text,
      translation: example.translation,
      wordOrder:
        "word_order" in example
          ? [...example.word_order].sort((a, b) => a.index - b.index).map((w) => w.word).join(" ")
          : "",
    }))
  );
  const [saving, setSaving] = useState(false);

  const minExamples = MIN_EXAMPLES[item.type];

  const patchExample = (index: number, patch: Partial<ExampleDraft>) => {
    setExamples((prev) => prev.map((ex, i) => (i === index ? { ...ex, ...patch } : ex)));
  };

  const addExample = () => {
    setExamples((prev) => [...prev, { originalIndex: null, text: "", translation: "", wordOrder: "" }]);
  };

  const removeExample = (index: number) => {
    setExamples((prev) => prev.filter((_, i) => i !== index));
  };

  const mismatchedExamples = isVocab
    ? []
    : examples.flatMap((draft, index) => (draft.text.trim() && !wordOrderMatches(draft) ? [index] : []));

  const handleSave = async () => {
    setSaving(true);

    const metadata = isVocab
      ? ({
          ...vocab!,
          translation: translation.trim() || undefined,
          examples: examples.map((draft) => ({
            ...(draft.originalIndex !== null ? vocab!.examples[draft.originalIndex] : {}),
            text: draft.text,
            translation: draft.translation,
          })),
        } satisfies VocabMetadata)
      : ({
          ...structure!,
          translation: translation.trim() || undefined,
          explanation,
          examples: examples.map((draft) => {
            const original = draft.originalIndex !== null ? structure!.examples[draft.originalIndex] : null;
            // Exemplo sem banco de palavras preenchido usa as palavras da própria frase.
            const words = wordsOf(draft.wordOrder).length > 0 ? wordsOf(draft.wordOrder) : wordsOf(draft.text);
            return {
              ...original,
              text: draft.text,
              translation: draft.translation,
              // Preserva o `role` por posição; palavra nova entra como "word",
              // o papel neutro que os render modes já sabem tratar.
              word_order: words.map((word, index) => ({
                word,
                index,
                role: original?.word_order[index]?.role ?? "word",
              })),
            };
          }),
        } satisfies StructureMetadata);

    const result = await updateLearningItemAction({ itemId: item.id, planId, lemma, metadata });
    setSaving(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Item atualizado.");
    onSaved();
  };

  return (
    <div className="space-y-4">
      <label className="block">
        <Label>{isVocab ? "Termo em inglês" : "Nome da estrutura"}</Label>
        <input
          type="text"
          value={lemma}
          onChange={(e) => setLemma(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </label>

      <label className="block">
        <Label>Tradução (português)</Label>
        <input
          type="text"
          value={translation}
          onChange={(e) => setTranslation(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </label>

      {!isVocab && (
        <label className="block">
          <Label>Explicação</Label>
          <textarea
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
      )}

      <div>
        <Label>Exemplos</Label>
        <div className="space-y-3">
          {examples.map((example, index) => (
            <div key={index} className="rounded-lg border border-slate-200 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500">Exemplo {index + 1}</span>
                <button
                  type="button"
                  onClick={() => removeExample(index)}
                  disabled={examples.length <= minExamples}
                  title={
                    examples.length <= minExamples
                      ? `São necessários pelo menos ${minExamples} exemplos`
                      : "Remover exemplo"
                  }
                  className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 disabled:hover:text-slate-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <input
                type="text"
                value={example.text}
                onChange={(e) => patchExample(index, { text: e.target.value })}
                placeholder="Frase em inglês"
                lang="en"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                type="text"
                value={example.translation}
                onChange={(e) => patchExample(index, { translation: e.target.value })}
                placeholder="Tradução em português"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-500"
              />
              {!isVocab && (
                <div>
                  <Label>Palavras do &quot;monte a frase&quot; (em inglês, separadas por espaço)</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={example.wordOrder}
                      onChange={(e) => patchExample(index, { wordOrder: e.target.value })}
                      lang="en"
                      placeholder="vazio = usa as palavras da frase"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => patchExample(index, { wordOrder: wordsOf(example.text).join(" ") })}
                      className="shrink-0 text-[11px] font-semibold text-primary hover:text-primary/80"
                    >
                      Usar a frase
                    </button>
                  </div>
                  {mismatchedExamples.includes(index) && wordsOf(example.wordOrder).length > 0 && (
                    <p className="mt-1 text-[11px] text-rose-600">
                      As palavras não batem com a frase acima (mesmas palavras, na mesma ordem).
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addExample}
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80"
        >
          <Plus className="h-3.5 w-3.5" /> Adicionar exemplo
        </button>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving || mismatchedExamples.some((i) => wordsOf(examples[i].wordOrder).length > 0)}
        >
          {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
          Salvar
        </Button>
      </div>
    </div>
  );
}
