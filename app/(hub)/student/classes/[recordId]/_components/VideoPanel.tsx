"use client";

import { useState } from "react";
import { Camera, Mic, PhoneOff, Users, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { getInitials } from "@/components/ui/avatar";
import type { ClassmateSummary } from "@/modules/class/class.types";

interface VideoPanelProps {
  classRecordId: string;
  /** Id da chamada quando a integração existir. Hoje é sempre null. */
  callId: string | null;
  teacherName: string | null;
  participants: ClassmateSummary[];
  selfName: string;
}

/**
 * Painel de vídeo da sala de aula — PLACEHOLDER.
 *
 * Deliberadamente sem nenhum import de `@stream-io/video-react-sdk`: a
 * integração entra depois e não deve arrastar o bundle nem o layout agora.
 *
 * PONTO DE TROCA: quando a chamada for implementada, este componente passa a
 * receber um `callId` real e troca a grade de tiles estáticos por
 * `<StreamVideo>/<StreamCall>` + `useCallStateHooks()`. A interface de props
 * já é a definitiva; o layout ao redor não precisa mudar.
 *
 * Nota: os participantes listados aqui são o ROSTER da turma, não quem está
 * de fato conectado — `class_records.attendance` nunca é escrito. Presença
 * real virá do Stream quando a integração existir.
 */
export function VideoPanel({ callId, teacherName, participants, selfName }: VideoPanelProps) {
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const isConnected = Boolean(callId);

  return (
    <div className="flex h-full flex-col bg-slate-900">
      <div className="hidden shrink-0 items-center justify-between border-b border-slate-800 px-4 py-3 lg:flex">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Chamada de vídeo
        </span>
        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
          Em breve
        </span>
      </div>

      {/* Conteúdo do painel */}
      <div className="flex flex-row items-center gap-3 p-3 min-h-0 overflow-y-auto lg:flex-col lg:items-stretch lg:space-y-4 lg:gap-0 lg:p-4">
        {/* Tile do professor — Esquerda no Mobile, Topo no Desktop */}
        <div className="flex-1 min-w-0">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 hidden lg:block">
            Professor
          </p>
          <div className="relative flex aspect-video max-h-36 sm:max-h-44 w-full items-center justify-center overflow-hidden rounded-xl border border-slate-800 bg-slate-950/90 shadow-md lg:max-h-none">
            <span className="text-xl font-bold text-slate-600 lg:text-3xl">
              {teacherName ? getInitials(teacherName) : <Video className="h-6 w-6 lg:h-7 lg:w-7" />}
            </span>
            {teacherName && (
              <span className="absolute bottom-1.5 left-1.5 max-w-[80%] truncate rounded bg-slate-950/80 px-1.5 py-0.5 text-[9px] font-medium text-slate-200 backdrop-blur-sm lg:bottom-2 lg:left-2 lg:px-2 lg:text-[10px]">
                {teacherName}
              </span>
            )}
          </div>
        </div>

        {/* Controles no Mobile — Coluna Vertical no Lado Direito */}
        <div className="flex shrink-0 flex-col items-center justify-center gap-2 lg:hidden">
          <ControlButton
            label="Microfone"
            disabled={!isConnected}
            active={micOn}
            onClick={() => setMicOn((v) => !v)}
            icon={<Mic className="h-4 w-4" />}
          />
          <ControlButton
            label="Câmera"
            disabled={!isConnected}
            active={camOn}
            onClick={() => setCamOn((v) => !v)}
            icon={<Camera className="h-4 w-4" />}
          />
          <ControlButton
            label="Sair da chamada"
            disabled={!isConnected}
            tone="danger"
            icon={<PhoneOff className="h-4 w-4" />}
          />
        </div>

        {/* Tiles dos colegas — Apenas no Desktop */}
        <div className="hidden lg:block">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Colegas
            </p>
            <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
              <Users className="h-3 w-3" />
              {participants.length}
            </span>
          </div>

          {participants.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {participants.map((person) => (
                <div
                  key={person.id}
                  className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-slate-800 bg-slate-800/60"
                  title={person.name}
                >
                  <span className="text-xs font-bold text-slate-500">
                    {getInitials(person.name)}
                  </span>
                  {person.name === selfName && (
                    <span className="absolute bottom-1 left-1 rounded bg-slate-950/70 px-1 py-0.5 text-[9px] text-slate-400">
                      Você
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-slate-800 px-3 py-4 text-center text-xs text-slate-500">
              Nenhum colega na turma ainda.
            </p>
          )}
        </div>
      </div>

      {/* Controles no Desktop — Barra Horizontal na Base */}
      <div className="hidden shrink-0 items-center justify-center gap-3 border-t border-slate-800/80 p-3 bg-slate-900 lg:flex">
        <ControlButton
          label="Microfone"
          disabled={!isConnected}
          active={micOn}
          onClick={() => setMicOn((v) => !v)}
          icon={<Mic className="h-4 w-4" />}
        />
        <ControlButton
          label="Câmera"
          disabled={!isConnected}
          active={camOn}
          onClick={() => setCamOn((v) => !v)}
          icon={<Camera className="h-4 w-4" />}
        />
        <ControlButton
          label="Sair da chamada"
          disabled={!isConnected}
          tone="danger"
          icon={<PhoneOff className="h-4 w-4" />}
        />
      </div>
    </div>
  );
}

interface ControlButtonProps {
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  active?: boolean;
  tone?: "default" | "danger";
  onClick?: () => void;
}

function ControlButton({ label, icon, disabled, active, tone = "default", onClick }: ControlButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={disabled ? `${label} — disponível quando a chamada for liberada` : label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-40",
        tone === "danger"
          ? "bg-rose-500/15 text-rose-400 hover:bg-rose-500/25"
          : active
            ? "bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30"
            : "bg-slate-800 text-slate-400 hover:bg-slate-700"
      )}
    >
      {icon}
    </button>
  );
}
