"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateMoreContentAction } from "@/modules/practice/practice.actions";
import type { GenerateMoreReport } from "@/modules/practice/practice.types";

/**
 * "Gerar mais" — acréscimo incremental, por tipo, sem duplicar o que existe.
 *
 * Separado do botão "Gerar com IA" (que é a geração inicial, do zero) porque
 * fazem coisas diferentes: aquele monta a lição inteira, este completa o que
 * ficou curto. Os campos são por tipo porque o déficit é por tipo — vocabulário
 * e quiz batem no teto de 10 exercícios/dia em quase toda lição, enquanto as
 * ESTRUTURAS (que alimentam sozinhas os dias 2 e 3, um exercício por item)
 * costumam ficar em 2-5.
 */
interface GenerateMorePanelProps {
  lessonId: string;
  planId: string;
  vocabTotal: number;
  structureTotal: number;
  quizTotal: number;
}

export function GenerateMorePanel({
  lessonId,
  planId,
  vocabTotal,
  structureTotal,
  quizTotal,
}: GenerateMorePanelProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [vocabCount, setVocabCount] = useState(0);
  const [structureCount, setStructureCount] = useState(0);
  const [quizCount, setQuizCount] = useState(0);
  const [report, setReport] = useState<GenerateMoreReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const total = vocabCount + structureCount + quizCount;

  const handleGenerate = () => {
    setError(null);
    setReport(null);
    startTransition(async () => {
      const result = await generateMoreContentAction({
        lessonId,
        planId,
        vocabCount,
        structureCount,
        quizCount,
      });
      if (result.success) {
        setReport(result.data ?? null);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  if (!open) {
    return (
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4 mr-1.5" />
        Gerar mais
      </Button>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          Gerar mais conteúdo
        </h4>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[11px] text-slate-500 hover:text-slate-700"
        >
          Fechar
        </button>
      </div>

      <p className="text-[11px] text-slate-500">
        Complementa o que já existe — a IA recebe a lista atual e é instruída a não repetir.
        Os dias de <strong>completar a frase</strong> e <strong>monte a frase</strong> usam só
        estruturas, um exercício por item.
      </p>

      <div className="grid grid-cols-3 gap-3">
        <CountField
          label="Vocabulário"
          hint={`${vocabTotal} hoje`}
          value={vocabCount}
          onChange={setVocabCount}
        />
        <CountField
          label="Estruturas"
          hint={`${structureTotal} hoje`}
          value={structureCount}
          onChange={setStructureCount}
        />
        <CountField
          label="Perguntas"
          hint={`${quizTotal} hoje`}
          value={quizCount}
          onChange={setQuizCount}
        />
      </div>

      <Button
        type="button"
        size="sm"
        onClick={handleGenerate}
        loading={pending}
        disabled={total === 0}
        className="w-full"
      >
        {pending ? "Gerando... até 60s" : total === 0 ? "Escolha uma quantidade" : `Gerar ${total} item(ns)`}
      </Button>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">{error}</div>
      )}

      {report && <ReportView report={report} />}
    </div>
  );
}

function CountField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
        {label}
      </span>
      <span className="text-[10px] text-slate-400 block mb-1">{hint}</span>
      <input
        type="number"
        min={0}
        max={20}
        value={value}
        onChange={(e) => onChange(Math.max(0, Math.min(20, Number(e.target.value) || 0)))}
        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-center"
      />
    </label>
  );
}

/**
 * Mostra pedido x recebido lado a lado.
 *
 * Vir menos do que se pediu é o caso COMUM, não a exceção: o modelo é
 * instruído a devolver menos em vez de inventar conteúdo que não está no texto
 * da aula. Esconder isso faria o admin clicar de novo achando que falhou.
 */
function ReportView({ report }: { report: GenerateMoreReport }) {
  const linhas = [
    { label: "Vocabulário", data: report.vocab },
    { label: "Estruturas", data: report.structure },
    { label: "Perguntas", data: report.quiz },
  ].filter((linha) => linha.data.requested > 0);

  const faltou = linhas.some((linha) => linha.data.inserted < linha.data.requested);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-1.5">
      {linhas.map(({ label, data }) => (
        <div key={label} className="flex items-center justify-between text-xs">
          <span className="text-slate-600">{label}</span>
          <span
            className={
              data.inserted >= data.requested ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"
            }
          >
            {data.inserted} de {data.requested}
            {data.duplicates > 0 && (
              <span className="font-normal text-slate-400"> · {data.duplicates} repetido(s) descartado(s)</span>
            )}
          </span>
        </div>
      ))}

      {faltou && (
        <p className="text-[11px] text-slate-500 pt-1.5 border-t border-slate-100">
          Veio menos do que o pedido. Isso costuma significar que o texto da aula não comporta
          mais conteúdo novo — a IA é instruída a devolver menos em vez de inventar. Para render
          mais, enriqueça o material da lição.
        </p>
      )}
    </div>
  );
}
