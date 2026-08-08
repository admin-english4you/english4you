"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/** A disponibilidade da API não muda em runtime; a subscrição é um no-op.
 *  useSyncExternalStore existe aqui só para dar um snapshot de servidor
 *  (`false`) e evitar divergência de hidratação. */
const noopSubscribe = () => () => {};
const hasSpeechSynthesis = () => typeof window !== "undefined" && "speechSynthesis" in window;
const speechUnsupportedOnServer = () => false;

interface UseSpeechOptions {
  /** Prefixo de idioma da voz desejada. Padrão: inglês. */
  lang?: string;
  rate?: number;
}

interface UseSpeechResult {
  speak: (text: string) => void;
  cancel: () => void;
  speaking: boolean;
  /** `false` quando o navegador não tem Web Speech API — quem chama deve degradar. */
  supported: boolean;
}

/**
 * Text-to-speech do navegador, usado pelos flashcards e pelo gap fill.
 *
 * Cuidados que este hook resolve:
 * - `speechSynthesis` não existe no servidor (SSR) nem em alguns WebViews;
 * - no Chrome as vozes carregam de forma assíncrona, via evento `voiceschanged`;
 * - falas empilham se não houver `cancel()` antes de cada `speak()`.
 *
 * O que ele NÃO resolve: o iOS Safari exige um gesto do usuário antes da
 * primeira fala. Por isso toda tela que depende de áudio precisa expor um
 * botão de "ouvir" explícito, e não só disparar no mount.
 */
export function useSpeech({ lang = "en", rate = 0.9 }: UseSpeechOptions = {}): UseSpeechResult {
  const supported = useSyncExternalStore(noopSubscribe, hasSpeechSynthesis, speechUnsupportedOnServer);
  const [speaking, setSpeaking] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) return;
      voiceRef.current =
        voices.find((v) => v.lang.toLowerCase().startsWith(`${lang}-us`)) ??
        voices.find((v) => v.lang.toLowerCase().startsWith(`${lang}-gb`)) ??
        voices.find((v) => v.lang.toLowerCase().startsWith(lang)) ??
        null;
    };

    pickVoice();
    window.speechSynthesis.addEventListener("voiceschanged", pickVoice);

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", pickVoice);
      window.speechSynthesis.cancel();
    };
  }, [lang]);

  const cancel = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      const trimmed = text.trim();
      if (!trimmed) return;

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(trimmed);
      utterance.rate = rate;
      utterance.lang = voiceRef.current?.lang ?? "en-US";
      if (voiceRef.current) utterance.voice = voiceRef.current;
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);

      setSpeaking(true);
      window.speechSynthesis.speak(utterance);
    },
    [rate]
  );

  return { speak, cancel, speaking, supported };
}
