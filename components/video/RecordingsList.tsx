"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, PlayCircle } from "lucide-react";

interface RecordingsListProps {
  /** `class_records.recordingUrls` — um segmento por sessão da chamada (a mesma aula pode ter várias, se foi reaberta). */
  urls: string[];
}

/**
 * Lista compacta de gravações de UMA aula. Como o professor pode reabrir a
 * chamada quantas vezes precisar (internet/energia caindo no meio), uma
 * mesma aula pode ter mais de um segmento — todos ficam aqui, na ordem em
 * que foram gravados.
 */
export function RecordingsList({ urls }: RecordingsListProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(urls.length === 1 ? 0 : null);

  if (urls.length === 0) return null;

  return (
    <div>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        Gravações desta aula ({urls.length})
      </p>
      <div className="space-y-2">
        {urls.map((url, index) => {
          const isOpen = openIndex === index;
          return (
            <div key={url} className="overflow-hidden rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="flex w-full items-center justify-between gap-2 bg-slate-800/60 px-3 py-2 text-left text-xs font-medium text-slate-300 hover:bg-slate-800"
              >
                <span className="flex items-center gap-1.5">
                  <PlayCircle className="h-3.5 w-3.5" />
                  Sessão {index + 1}
                </span>
                {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
              {isOpen && (
                <video src={url} controls preload="metadata" className="w-full bg-black" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
