"use client";

import { motion } from "framer-motion";
import { Users, LayoutDashboard, Sparkles, CheckCircle2 } from "lucide-react";

const fadeInUp = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
};
const easing = [0.22, 1, 0.36, 1] as const;

const features = [
  {
    icon: Users,
    title: "Aulas Interativas ao Vivo",
    description:
      "Aprenda diretamente com professores certificados em pequenos grupos. Obtenha feedback em tempo real, desenvolva pronúncia autêntica e faça prática dinâmica de conversação.",
    perks: ["Máximo de 12 alunos por turma", "Agendamento flexível"],
    dark: false,
  },
  {
    icon: LayoutDashboard,
    title: "Aula dinâmica e interativa",
    description:
      "Nossa plataforma moderna torna o aprendizado visual e colaborativo. Faça anotações e compartilhe com seus colegas e professor em tempo real.",
    perks: ["Colaboração em tempo real", "Materiais com design moderno"],
    dark: false,
  },
  {
    icon: Sparkles,
    title: "Aprendizado pensado para você",
    description:
      "Cada aluno aprende de um jeito. Por isso, nossas aulas e materiais são adaptados às suas necessidades, dificuldades e objetivos, tornando o aprendizado mais leve, eficiente e conectado à sua realidade.",
    perks: [],
    dark: true,
  },
  {
    icon: Sparkles,
    title: "Aprimore sua pronúncia com confiança",
    description:
      "Receba orientações claras para desenvolver uma pronúncia mais natural ao longo das aulas e pratique sempre que quiser com os recursos disponíveis na plataforma.",
    perks: [],
    dark: true,
  },
];

export function FeaturesSection() {
  return (
    <section
      id="methodology"
      className="py-20 sm:py-28 relative border-y border-border bg-muted/30"
    >
      {/* subtle dot pattern */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle, #016ad1 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        {/* Header */}
        <motion.div
          {...fadeInUp}
          transition={{ duration: 0.5, ease: easing }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <p className="text-xs font-bold text-[#016ad1] tracking-widest uppercase mb-3">
            Nossa Metodologia
          </p>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-[#07274f] mb-5">
            Projetada para a fluência real.
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground">
            Combinamos a proximidade de uma escola tradicional com o poder da tecnologia para entregar um aprendizado de conversação mais rápido e confiante.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              {...fadeInUp}
              transition={{ duration: 0.5, ease: easing, delay: i * 0.08 }}
              whileHover={{ y: -6 }}
              className={`rounded-2xl p-5 sm:p-6 transition-shadow flex flex-col ${
                f.dark
                  ? "bg-[#07274f] border border-slate-700 shadow-xl relative overflow-hidden"
                  : "bg-card border border-border shadow-sm hover:shadow-md"
              }`}
            >
              {f.dark && (
                <div
                  aria-hidden
                  className="absolute top-0 right-0 w-24 h-24 bg-[#016ad1] rounded-full blur-3xl opacity-40 -translate-y-1/2 translate-x-1/2"
                />
              )}
              <div className="relative z-10 flex flex-col flex-1">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${
                    f.dark
                      ? "bg-white/10 border border-white/20 text-white"
                      : "bg-[#f0f7ff] text-[#016ad1]"
                  }`}
                >
                  <f.icon size={20} />
                </div>

                <h3
                  className={`text-base sm:text-lg font-bold mb-2 leading-snug ${
                    f.dark ? "text-white" : "text-[#07274f]"
                  }`}
                >
                  {f.title}
                </h3>

                <p
                  className={`leading-relaxed text-xs sm:text-sm ${
                    f.dark ? "text-slate-300" : "text-muted-foreground"
                  } ${f.perks.length > 0 ? "mb-5" : ""}`}
                >
                  {f.description}
                </p>

                {f.perks.length > 0 && (
                  <ul className="space-y-1.5 mt-auto pt-1">
                    {f.perks.map((perk) => (
                      <li
                        key={perk}
                        className={`flex items-center gap-2 text-xs sm:text-sm font-medium ${
                          f.dark ? "text-slate-200" : "text-foreground"
                        }`}
                      >
                        <CheckCircle2
                          size={14}
                          className={`shrink-0 ${f.dark ? "text-[#38a5f8]" : "text-green-500"}`}
                        />
                        {perk}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
