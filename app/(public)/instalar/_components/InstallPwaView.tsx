"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Download,
  Share,
  SquarePlus,
  MoreVertical,
  CheckCircle2,
  Smartphone,
  Monitor,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Platform = "ios" | "android" | "desktop";

/**
 * Evento não-padrão do Chrome/Edge/Android — não existe em lib.dom.d.ts,
 * então é tipado à mão. `prompt()` abre o diálogo nativo de instalação;
 * `userChoice` resolve depois que o usuário aceita ou recusa.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function detectPlatform(): Platform {
  const ua = window.navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) && !("MSStream" in window)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari não expõe display-mode; usa a propriedade proprietária.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * Tela de instalação do PWA, pensada pra ser mandada por link direto (o
 * admin compartilha `/instalar` no WhatsApp/e-mail de matrícula) — sem
 * exigir login nem explicar o que é "PWA": o aluno só precisa seguir os
 * passos da própria plataforma que já está usando.
 */
export function InstallPwaView() {
  // Init preguiçoso (função, não valor) — roda uma vez no primeiro render,
  // não dentro de um efeito, pra não disparar `setState` síncrono logo de
  // cara. `window` só existe no cliente; no SSR fica `null`/`false` até a
  // hidratação, daí o guard de "platform === null" mais abaixo.
  const [platform] = useState<Platform | null>(() => (typeof window === "undefined" ? null : detectPlatform()));
  const [installed, setInstalled] = useState(() => (typeof window === "undefined" ? false : isStandalone()));
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Chrome/Edge/Android seguram o prompt nativo até a gente pedir — sem
    // capturar esse evento, o navegador mostraria a barrinha dele sozinho
    // (ou nada, dependendo da heurística), fora do nosso controle visual.
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    const handleAppInstalled = () => setInstalled(true);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    setIsInstalling(true);
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setIsInstalling(false);
  };

  // Evita piscar as instruções erradas antes do `useEffect` rodar.
  if (platform === null) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/10 to-white px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-md text-center">
        <Image
          src="/android/launchericon-192x192.png"
          alt="English4You"
          width={88}
          height={88}
          className="mx-auto rounded-2xl"
        />

        <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-primary sm:text-3xl">
          Instale a English4You
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Acesse suas aulas mais rápido, direto da tela inicial — como um aplicativo, sem precisar abrir o
          navegador toda vez.
        </p>

        {installed ? (
          <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            <p className="text-sm font-semibold text-emerald-800">
              O app já está instalado neste aparelho.
            </p>
            <Link
              href="/login"
              className="text-sm font-bold text-primary hover:underline"
            >
              Ir para o login
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {deferredPrompt && (
              <Button
                onClick={handleInstallClick}
                loading={isInstalling}
                className="h-12 w-full rounded-2xl bg-primary text-base font-bold text-white shadow-lg shadow-primary/25 hover:bg-primary/80"
              >
                <Download className="mr-2 h-5 w-5" />
                Instalar agora
              </Button>
            )}

            {platform === "ios" && <IosInstructions />}
            {platform === "android" && !deferredPrompt && <AndroidFallbackInstructions />}
            {platform === "desktop" && !deferredPrompt && <DesktopFallbackInstructions />}
          </div>
        )}

        <p className="mt-10 text-xs text-slate-400">
          Já tem uma conta?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Fazer login
          </Link>
        </p>
      </div>
    </div>
  );
}

function StepCard({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-sm text-slate-600">{children}</p>
    </div>
  );
}

function IosInstructions() {
  return (
    <div className="space-y-2.5">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
        <Smartphone className="h-3.5 w-3.5" /> No iPhone/iPad, use o Safari e siga:
      </p>
      <StepCard icon={Share}>
        Toque no ícone de <strong>Compartilhar</strong> na barra do navegador.
      </StepCard>
      <StepCard icon={SquarePlus}>
        Escolha <strong>&quot;Adicionar à Tela de Início&quot;</strong>.
      </StepCard>
      <StepCard icon={CheckCircle2}>
        Toque em <strong>&quot;Adicionar&quot;</strong> — pronto, o ícone aparece na sua tela inicial.
      </StepCard>
    </div>
  );
}

function AndroidFallbackInstructions() {
  return (
    <div className="space-y-2.5">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
        <Smartphone className="h-3.5 w-3.5" /> Instalação manual:
      </p>
      <StepCard icon={MoreVertical}>
        Toque nos <strong>três pontinhos</strong> no canto do navegador.
      </StepCard>
      <StepCard icon={SquarePlus}>
        Escolha <strong>&quot;Instalar aplicativo&quot;</strong> ou{" "}
        <strong>&quot;Adicionar à tela inicial&quot;</strong>.
      </StepCard>
    </div>
  );
}

function DesktopFallbackInstructions() {
  return (
    <div className="space-y-2.5">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
        <Monitor className="h-3.5 w-3.5" /> No Chrome ou Edge:
      </p>
      <StepCard icon={Download}>
        Clique no ícone de <strong>instalação</strong> na barra de endereço (ou no menu ⋮ →{" "}
        <strong>&quot;Instalar English4You&quot;</strong>).
      </StepCard>
    </div>
  );
}
