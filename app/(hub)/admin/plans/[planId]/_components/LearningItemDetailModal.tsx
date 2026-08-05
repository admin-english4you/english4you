"use client";

import { Modal } from "@/components/ui/modal";
import { LearningItem, VocabMetadata, StructureMetadata } from "@/modules/practice/practice.types";

interface LearningItemDetailModalProps {
  item: LearningItem | null;
  onClose: () => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-0.5">{label}</span>
      <div className="text-sm text-slate-800">{children}</div>
    </div>
  );
}

function VocabDetails({ metadata }: { metadata: VocabMetadata }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Classe Gramatical">{metadata.type}</Field>
        <Field label="Nível">{metadata.level}</Field>
        <Field label="Fonética">{metadata.phonetic}</Field>
        <Field label="Tradução">{metadata.translation || "—"}</Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Visual?">{metadata.is_visual ? "Sim" : "Não"}</Field>
        <Field label="Palavras-chave para imagem">{metadata.key_image_words}</Field>
      </div>

      <Field label="Significados">
        <ul className="space-y-1.5">
          {metadata.meanings.map((m, i) => (
            <li key={i} className="text-slate-700">
              <span className="font-medium">{m.definition}</span>
              <span className="text-slate-400"> — {m.translation}</span>
            </li>
          ))}
        </ul>
      </Field>

      {(metadata.forms.past || metadata.forms.participle || metadata.forms.plural) && (
        <Field label="Formas">
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-2 py-1 bg-slate-100 rounded">base: {metadata.forms.base}</span>
            {metadata.forms.past && <span className="px-2 py-1 bg-slate-100 rounded">passado: {metadata.forms.past}</span>}
            {metadata.forms.participle && <span className="px-2 py-1 bg-slate-100 rounded">particípio: {metadata.forms.participle}</span>}
            {metadata.forms.plural && <span className="px-2 py-1 bg-slate-100 rounded">plural: {metadata.forms.plural}</span>}
          </div>
        </Field>
      )}

      <Field label="Exemplos">
        <ul className="space-y-1.5">
          {metadata.examples.map((ex, i) => (
            <li key={i} className="border-l-2 border-indigo-200 pl-3">
              <p className="text-slate-800">{ex.text}</p>
              <p className="text-slate-400 text-xs">{ex.translation}</p>
            </li>
          ))}
        </ul>
      </Field>

      {metadata.synonyms && metadata.synonyms.length > 0 && (
        <Field label="Sinônimos">
          <div className="flex flex-wrap gap-1.5">
            {metadata.synonyms.map((s) => (
              <span key={s} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-xs">
                {s}
              </span>
            ))}
          </div>
        </Field>
      )}
    </div>
  );
}

function StructureDetails({ metadata }: { metadata: StructureMetadata }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Tipo de Estrutura">{metadata.structure_type}</Field>
        <Field label="Nível">{metadata.level}</Field>
        {metadata.syntactic_pattern && <Field label="Padrão Sintático">{metadata.syntactic_pattern}</Field>}
        {metadata.translation && <Field label="Tradução">{metadata.translation}</Field>}
      </div>

      <Field label="Explicação">
        <p className="text-slate-700 leading-relaxed">{metadata.explanation}</p>
      </Field>

      <Field label="Exemplos">
        <ul className="space-y-3">
          {metadata.examples.map((ex, i) => (
            <li key={i} className="border-l-2 border-violet-200 pl-3">
              <p className="text-slate-800">{ex.text}</p>
              <p className="text-slate-400 text-xs mb-1.5">{ex.translation}</p>
              <div className="flex flex-wrap gap-1">
                {ex.word_order.map((w, j) => (
                  <span key={j} className="px-1.5 py-0.5 bg-violet-50 text-violet-700 border border-violet-200 rounded text-[11px]">
                    {w.word} <span className="text-violet-400">({w.role})</span>
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </Field>
    </div>
  );
}

export function LearningItemDetailModal({ item, onClose }: LearningItemDetailModalProps) {
  return (
    <Modal isOpen={Boolean(item)} onClose={onClose} title={item?.lemma ?? ""}>
      {item && (
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <span
            className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded border mb-4 ${
              item.type === "VOCABULARY"
                ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                : "bg-violet-50 text-violet-700 border-violet-200"
            }`}
          >
            {item.type === "VOCABULARY" ? "Vocabulário" : "Estrutura"}
          </span>

          {item.type === "VOCABULARY" ? (
            <VocabDetails metadata={item.metadata as VocabMetadata} />
          ) : (
            <StructureDetails metadata={item.metadata as StructureMetadata} />
          )}
        </div>
      )}
    </Modal>
  );
}
