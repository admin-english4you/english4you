"use client";

import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const fadeInUp = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
};
const easing = [0.22, 1, 0.36, 1] as const;

const includedItems = [
  "Aulas ao vivo, duas vezes por semana",
  "Plataforma exclusiva de estudos",
  "Aulas gravadas caso perca alguma aula ao vivo",
  "Exercícios interativos para praticar durante a semana",
  "Decks inteligentes de vocabulário",
  "Método que integra gramática, vocabulário e comunicação desde a primeira aula",
  "Do básico ao avançado em um programa estruturado de 2 anos",
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-20 sm:py-28 bg-muted/30 border-y border-border">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <motion.div
          {...fadeInUp}
          transition={{ duration: 0.5, ease: easing }}
          className="text-center mb-14"
        >
          <p className="text-xs font-bold text-primary tracking-widest uppercase mb-3">
            Investimento
          </p>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-primary">
            Um único plano, acesso completo.
          </h2>
        </motion.div>

        <motion.div
          {...fadeInUp}
          transition={{ duration: 0.5, ease: easing, delay: 0.1 }}
          className="rounded-3xl bg-primary border border-slate-700 shadow-xl relative overflow-hidden p-8 sm:p-12"
        >
          <div
            aria-hidden
            className="absolute top-0 right-0 w-48 h-48 bg-primary rounded-full blur-3xl opacity-40 -translate-y-1/2 translate-x-1/2"
          />

          <div className="relative z-10">
            <h3 className="text-2xl font-bold text-white mb-2">Plano Completo</h3>
            <p className="text-slate-300 mb-8">
              Tudo o que você precisa para alcançar a fluência
            </p>

            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-5xl font-extrabold text-white">R$ 199</span>
              <span className="text-slate-300 font-medium">/mês</span>
            </div>
            <p className="text-slate-400 text-sm mb-8">
              Um único plano com acesso completo a uma experiência de aprendizado dinâmica e
              eficiente.
            </p>

            <ul className="space-y-3 mb-10">
              {includedItems.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-sm sm:text-base font-medium text-slate-200"
                >
                  <CheckCircle2 size={18} className="text-primary-foreground/80 shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>

            <a
              href="https://wa.me/5511999999999"
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ variant: "default" }),
                "w-full h-14 rounded-full text-base font-bold bg-white text-primary hover:bg-slate-100 shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center"
              )}
            >
              Começar hoje
            </a>

            <p className="text-center text-slate-400 text-xs mt-4">
              Sem taxa de matrícula. Sem custos ocultos.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
