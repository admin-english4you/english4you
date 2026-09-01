"use client";

import { Headphones } from "lucide-react";
import { LessonContentView } from "@/components/lesson/LessonContentView";

interface LessonReaderProps {
  title: string;
  level: string;
  html: string;
  audioUrl: string | null;
  videoUrl: string | null;
}

export function LessonReader({ title, level, html, audioUrl, videoUrl }: LessonReaderProps) {
  const hasContent = html.trim().length > 0 && html.trim() !== "<p></p>";

  return (
    <article className="mx-auto max-w-3xl px-5 py-4 sm:px-8 scrollbar-hide">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">
        Material da aula · {level}
      </p>
      <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h2>

      {videoUrl && (
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-slate-900">
          <video src={videoUrl} controls preload="metadata" className="w-full" />
        </div>
      )}

      {audioUrl && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <Headphones className="h-3.5 w-3.5" />
            Áudio da aula
          </p>
          <audio src={audioUrl} controls preload="metadata" className="w-full" />
        </div>
      )}

      <hr className="my-6 border-slate-200" />

      {hasContent ? (
        // O material da aula é escrito em inglês pelo professor (com apoio em
        // português no meio). É conteúdo de estudo: tradutor automático
        // ligado transformava a aula inteira em português e o aluno lia a
        // tradução em vez do original. Ver `app/layout.tsx`.
        <div translate="no">
          <LessonContentView html={html} />
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
          O professor ainda não publicou o material desta aula.
        </p>
      )}
    </article>
  );
}
