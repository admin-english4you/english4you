"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { toDayKey } from "@/lib/date";
import type { StudentClassRecordDetail } from "@/modules/class/class.types";
import type { CallAccess } from "@/lib/stream-server";
import { subscribeToBoardContent } from "@/lib/realtime-board";
import { ClassRoomTopBar } from "./ClassRoomTopBar";
import { LessonReader } from "@/components/lesson/LessonReader";
import { VideoPanel } from "./VideoPanel";

interface LiveClassRoomProps {
  record: StudentClassRecordDetail;
  initialCallAccess: CallAccess | null;
  selfId: string;
  selfName: string;
  selfAvatarUrl: string | null;
  todayKey: string;
}

export function LiveClassRoom({
  record,
  initialCallAccess,
  selfId,
  selfName,
  selfAvatarUrl,
  todayKey,
}: LiveClassRoomProps) {
  // No mobile a chamada vira uma gaveta recolhível no topo, para o conteúdo
  // da lição não ficar espremido em telas pequenas.
  const [videoOpenMobile, setVideoOpenMobile] = useState(false);
  // Fonte de verdade pra "há uma chamada pra entrar agora" (reportada pelo
  // poll do VideoPanel, não pelo `record.completed` estático do carregamento
  // da página) — enquanto não há call ativa, a gaveta inteira some no
  // mobile: sem isto, o aluno via uma caixa grande de "aguardando o
  // professor"/"chamada encerrada" atravancando a leitura da lição mesmo
  // fora de qualquer aula. No desktop o painel lateral sempre aparece
  // (tem espaço de sobra), então isto não afeta nada lá.
  const [isCallActive, setIsCallActive] = useState(false);

  const lesson = record.lesson;
  const isLive = toDayKey(record.date) === todayKey;

  // Ponto de partida: o que já estava salvo (`boardContent`, ou o material
  // canônico se o professor nunca editou nada ainda) — dali em diante, o
  // canal ao vivo do RTDB assume (ver BoardEditor.tsx, que publica lá a cada
  // edição do professor). Sem infra de realtime além disso: se o RTDB não
  // estiver configurado, `subscribeToBoardContent` simplesmente não emite
  // nada, e o aluno continua vendo este valor inicial normalmente.
  const [liveContent, setLiveContent] = useState(record.boardContent || lesson?.content || "");

  useEffect(() => {
    return subscribeToBoardContent(record.id, setLiveContent);
  }, [record.id]);

  return (
    <div className="flex h-screen flex-col">
      <ClassRoomTopBar
        title={lesson?.title ?? "Aula"}
        level={lesson?.level ?? record.classGroup.level}
        teacherName={record.effectiveTeacher?.name ?? null}
        date={record.date}
        todayKey={todayKey}
        isLive={isLive}
      />

      {/* `min-h-0` no grid E nos dois filhos é obrigatório: sem ele o
          overflow-y-auto não rola dentro da linha do grid e a página estoura
          a viewport. */}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-4">
        {/* Conteúdo da lição — 3/4 da largura, altura total, rolagem própria */}
        <section className="order-2 min-h-0 overflow-y-auto bg-white lg:order-1 lg:col-span-3">
          <LessonReader
            title={lesson?.title ?? "Aula"}
            level={lesson?.level ?? record.classGroup.level}
            html={liveContent}
            audioUrl={lesson?.audioUrl ?? null}
            videoUrl={lesson?.videoUrl ?? null}
          />
        </section>

        {/* Chamada de vídeo — 1/4 da largura, altura total. No mobile só
            ocupa espaço quando `isCallActive` (ver comentário acima); no
            desktop (`lg:block`) sempre aparece, independente disso. */}
        <aside
          className={cn(
            "order-1 min-h-0 border-slate-800 lg:order-2 lg:col-span-1 lg:block lg:h-full lg:border-l",
            isCallActive ? "block border-b" : "hidden"
          )}
        >
          <button
            type="button"
            onClick={() => setVideoOpenMobile((v) => !v)}
            aria-expanded={videoOpenMobile}
            className="flex w-full items-center justify-between bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-300 lg:hidden"
          >
            <span className="flex items-center gap-2">
              Chamada de vídeo
              {/* Sem `record.completed` aqui de propósito: é um snapshot
                  estático do carregamento da página, e esta barra só existe
                  quando `isCallActive` (fresco, via poll) já garante que há
                  mesmo uma chamada ao vivo agora — usar o valor estático
                  podia mostrar "Encerrada" com a call já reaberta. */}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold text-rose-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />
                Ao vivo
              </span>
            </span>
            {videoOpenMobile ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {/*
            `hidden`/`block` sozinhos não bastam aqui: o filho da VideoPanel
            usa `h-full` (e por dentro, `flex-1`) esperando um ancestral com
            altura DEFINIDA — mas no mobile este `<div>` não tinha altura
            nenhuma declarada (só "block"), então a cadeia de porcentagens
            resolvia como "auto" e o resultado virava imprevisível: às vezes
            uma caixa vazia enorme mesmo recolhida, às vezes esticava além da
            viewport e empurrava os controles da chamada pra fora da tela.
            `h-0`/`h-[Xvh]` são alturas EXPLÍCITAS — resolvem a cadeia
            corretamente nos dois estados, sem esse limbo. No desktop
            (`lg:h-full`), nada muda: mesmo comportamento de sempre.
          */}
          <div
            className={cn(
              "overflow-hidden lg:h-full lg:overflow-visible",
              videoOpenMobile ? "h-[65vh]" : "h-0"
            )}
          >
            <VideoPanel
              classRecordId={record.id}
              initialCallAccess={initialCallAccess}
              callStarted={Boolean(record.callStartedAt)}
              callEnded={record.completed}
              recordingUrls={record.recordingUrls}
              teacherName={record.effectiveTeacher?.name ?? null}
              teacherUserId={record.effectiveTeacher?.id ?? null}
              participants={record.classmates}
              selfId={selfId}
              selfName={selfName}
              selfAvatarUrl={selfAvatarUrl}
              onCallActiveChange={setIsCallActive}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
