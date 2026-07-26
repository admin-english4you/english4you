import type { Metadata } from "next";
import { LandingNav } from "./(public)/_components/LandingNav";
import { HeroSection } from "./(public)/_components/HeroSection";
import { FeaturesSection } from "./(public)/_components/FeaturesSection";
import { TrustSection } from "./(public)/_components/TrustSection";
import { CtaSection } from "./(public)/_components/CtaSection";
import { LandingFooter } from "./(public)/_components/LandingFooter";

export const metadata: Metadata = {
  title: "English4You — Fluency Meets Innovation",
  description:
    "Experience premium English education tailored for Brazilian students. Live classes, interactive digital whiteboards, and AI-powered practice — all in one sophisticated platform.",
};

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <LandingNav />
      <main className="flex-1">
        <HeroSection />
        <FeaturesSection />
        <TrustSection />
        <CtaSection />
      </main>
      <LandingFooter />
    </div>
  );
}

