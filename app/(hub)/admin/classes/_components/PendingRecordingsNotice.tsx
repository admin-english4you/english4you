"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Download, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { markRecordingArchivedAction } from "@/modules/class/class.actions";
import type { PendingRecordingView } from "@/modules/class/class.types";

interface PendingRecordingsNoticeProps {
  pending: PendingRecordingView[];
}

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

/**
 * Aviso de gravações que ainda não foram baixadas.
 *
 * O Stream apaga cada gravação 14 dias depois da aula e ninguém a recupera —
 * nem o suporte deles. Este aviso existe para transformar esse prazo invisível
 * numa pendência com dono: fica na tela até alguém confirmar que baixou.
 *
 * O botão de baixar e o de confirmar são SEPARADOS de propósito. O servidor não
 * tem como saber que um download terminou; dar a aula por arquivada no clique
 * do link marcaria como resolvida uma aula que ninguém guardou.
 */
export function PendingRecordingsNotice({ pending }: PendingRecordingsNoticeProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (pending.length === 0) return null;

  const handleConfirmar = (recordId: string) => {
    setError(null);
    setConfirmando(recordId);
    startTransition(async () => {
      const result = await markRecordingArchivedAction({ recordId });
      setConfirmando(null);
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  // A mais urgente define a cor do bloco inteiro: um vermelho por uma aula que
  // vence amanhã é mais útil do que um âmbar que representa a média.
  const menorPrazo = Math.min(...pending.map((p) => p.daysLeft));
  const critico = menorPrazo <= 3;

  return (
    <div
      className={cn(
        "rounded-2xl border p-5 shadow-sm",
        critico ? "border-rose-200 bg-rose-50" : "border-amber-200 bg-amber-50"
      )}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          className={cn("mt-0.5 h-5 w-5 shrink-0", critico ? "text-rose-600" : "text-amber-600")}
        />
        <div className="min-w-0 flex-1">
          <h2 className={cn("font-bold", critico ? "text-rose-900" : "text-amber-900")}>
            {pending.length === 1
              ? "1 gravação aguardando download"
              : `${pending.length} gravações aguardando download`}
          </h2>
          <p className={cn("mt-1 text-xs", critico ? "text-rose-800" : "text-amber-800")}>
            As gravações são apagadas <strong>14 dias após a aula</strong> e não há como
            recuperá-las depois. Baixe o arquivo, guarde no acervo da escola e confirme aqui —
            o aviso some quando todas estiverem arquivadas.
          </p>

          {error && (
            <div className="mt-3 rounded-xl border border-rose-200 bg-white p-3 text-xs text-rose-800">
              {error}
            </div>
          )}

          <ul className="mt-4 space-y-2">
            {pending.map((item) => {
              const vencida = item.daysLeft < 0;
              const urgente = item.daysLeft <= 3;

              return (
                <li
                  key={item.recordId}
                  className="flex flex-col gap-3 rounded-xl border border-white bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Video className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="truncate text-sm font-semibold text-slate-900">
                        {item.className}
                      </span>
                      <span className="truncate text-xs text-slate-500">{item.lessonTitle}</span>
                    </div>
                    <p
                      className={cn(
                        "mt-1 text-[11px] font-semibold",
                        vencida
                          ? "text-slate-500"
                          : urgente
                            ? "text-rose-700"
                            : "text-amber-700"
                      )}
                    >
                      {vencida
                        ? `Provavelmente já foi apagada (prazo era ${dateFormatter.format(item.availableUntil)})`
                        : item.daysLeft === 0
                          ? `Vence HOJE (${dateFormatter.format(item.availableUntil)})`
                          : `${item.daysLeft} ${item.daysLeft === 1 ? "dia restante" : "dias restantes"} — até ${dateFormatter.format(item.availableUntil)}`}
                      {item.recordingUrls.length > 1 && ` · ${item.recordingUrls.length} arquivos`}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {item.recordingUrls.map((url, i) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Baixar
                        {item.recordingUrls.length > 1 && ` ${i + 1}`}
                      </a>
                    ))}
                    <Button
                      size="sm"
                      variant="outline"
                      loading={isPending && confirmando === item.recordId}
                      onClick={() => handleConfirmar(item.recordId)}
                    >
                      {!(isPending && confirmando === item.recordId) && (
                        <Check className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Já baixei
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
