"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioReplayButtonProps {
  src: string;
  label?: string;
}

/** Player mínimo do áudio da lição, com repetições ilimitadas. */
export function AudioReplayButton({ src, label = "Ouça o áudio da aula" }: AudioReplayButtonProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const stop = () => setPlaying(false);
    audio.addEventListener("ended", stop);
    audio.addEventListener("pause", stop);
    return () => {
      audio.removeEventListener("ended", stop);
      audio.removeEventListener("pause", stop);
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play();
      setPlaying(true);
    } else {
      audio.pause();
    }
  };

  const restart = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    void audio.play();
    setPlaying(true);
  };

  return (
    <div className="mb-6 flex items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pausar áudio" : "Reproduzir áudio"}
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white transition-all hover:bg-indigo-700 active:scale-95",
          playing && "ring-4 ring-indigo-200"
        )}
      >
        {playing ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}
      </button>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-indigo-900">{label}</p>
        <button
          type="button"
          onClick={restart}
          className="text-xs font-medium text-indigo-600 hover:underline"
        >
          Ouvir desde o início
        </button>
      </div>

      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />
    </div>
  );
}
