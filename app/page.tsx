import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { getHomeRouteForRole } from "@/lib/rbac";
import { LandingNav } from "./(public)/_components/LandingNav";
import { HeroSection } from "./(public)/_components/HeroSection";
import { FeaturesSection } from "./(public)/_components/FeaturesSection";
import { TrustSection } from "./(public)/_components/TrustSection";
import { PricingSection } from "./(public)/_components/PricingSection";
import { CtaSection } from "./(public)/_components/CtaSection";
import { LandingFooter } from "./(public)/_components/LandingFooter";

export const metadata: Metadata = {
  title: "English4You — A fluência encontra a inovação",
  description:
    "Experimente o ensino de inglês premium feito para estudantes brasileiros. Aulas ao vivo, lousas digitais interativas e prática com inteligência artificial — tudo em uma plataforma sofisticada.",
};

interface LandingPageProps {
  searchParams: Promise<{ pwa?: string }>;
}

/**
 * Landing pública — mas só para visitante anônimo vindo do navegador.
 *
 * Quem já tem sessão vai direto pro hub do seu papel: depois de logado, a
 * página de marketing não é mais um destino útil.
 *
 * Quem abre pelo app instalado (`?pwa=1`, cravado no `start_url` do
 * manifest) e ainda não tem sessão cai no login, não na landing — abrir um
 * app instalado e ver página de vendas não parece um app.
 *
 * Nota: ler a sessão torna esta rota dinâmica, então a landing deixa de ser
 * estática. É o custo de decidir o destino no servidor, sem flash de tela
 * errada como aconteceria com um redirect no cliente.
 */
export default async function LandingPage({ searchParams }: LandingPageProps) {
  const [{ pwa }, user] = await Promise.all([searchParams, getCurrentUser()]);

  if (user) {
    redirect(getHomeRouteForRole(user.role));
  }

  if (pwa === "1") {
    redirect("/login");
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <LandingNav />
      <main className="flex-1">
        <HeroSection />
        <FeaturesSection />
        <TrustSection />
        <PricingSection />
        <CtaSection />
      </main>
      <LandingFooter />
    </div>
  );
}
