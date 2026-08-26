"use client";

import { motion } from "framer-motion";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const fadeInUp = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
};
const easing = [0.22, 1, 0.36, 1] as const;

export function CtaSection() {
  return (
    <section className="py-20 sm:py-28 bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <motion.h2
          {...fadeInUp}
          transition={{ duration: 0.5, ease: easing }}
          className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-primary mb-6 leading-tight"
        >
          Pronto para falar com confiança?
        </motion.h2>

        <motion.p
          {...fadeInUp}
          transition={{ duration: 0.5, ease: easing, delay: 0.08 }}
          className="text-base sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto"
        >
          Junte-se à English4You hoje e transforme a maneira como aprende inglês. Agende sua primeira aula em poucos minutos.
        </motion.p>

        <motion.div
          {...fadeInUp}
          transition={{ duration: 0.5, ease: easing, delay: 0.16 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <a
            href="https://wa.me/5511999999999"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: "default" }),
              "w-full sm:w-64 h-14 rounded-full text-base font-bold bg-primary hover:bg-primary/80 text-white shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-1 transition-all flex items-center justify-center"
            )}
          >
            Ver Planos de Assinatura
          </a>
          <a
            href="https://wa.me/5511999999999"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: "secondary" }),
              "w-full sm:w-64 h-14 rounded-full text-base font-bold text-primary bg-primary/10 hover:bg-primary/15 flex items-center justify-center"
            )}
          >
            Experimentar Aula Grátis
          </a>
        </motion.div>
      </div>
    </section>
  );
}
