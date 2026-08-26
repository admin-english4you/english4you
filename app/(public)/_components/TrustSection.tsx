"use client";

import { motion } from "framer-motion";

const fadeInUp = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
};
const easing = [0.22, 1, 0.36, 1] as const;

const StarIcon = () => (
  <svg className="w-5 h-5 fill-yellow-400" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

const testimonials = [
  {
    stars: 5,
    quote:
      '"A plataforma é incrível. Tentei escolas tradicionais por anos, mas a combinação de aulas ao vivo e prática aqui finalmente me trouxe a fluência."',
    name: "Carolina M.",
    role: "Engenheira de Software, São Paulo",
    avatarId: 32,
    offset: "lg:translate-x-4",
  },
  {
    stars: 5,
    quote:
      '"Parece uma experiência premium. A aula dinâmica torna a gramática muito mais fácil de entender."',
    name: "Rafael T.",
    role: "Diretor de Marketing, Rio de Janeiro",
    avatarId: 11,
    offset: "lg:-translate-x-4",
  },
];

export function TrustSection() {
  return (
    <section
      id="testimonials"
      className="py-20 sm:py-28"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          {...fadeInUp}
          transition={{ duration: 0.6, ease: easing }}
          className="bg-gradient-to-br from-primary to-primary/80 rounded-[2.5rem] sm:rounded-[3rem] p-8 sm:p-12 lg:p-20 text-white relative overflow-hidden"
        >
          {/* Subtle overlay pattern */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "radial-gradient(circle, white 1.5px, transparent 1.5px)",
              backgroundSize: "28px 28px",
            }}
          />

          <div className="relative z-10 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left — Stats */}
            <motion.div
              {...fadeInUp}
              transition={{ duration: 0.5, ease: easing, delay: 0.1 }}
            >
              <h3 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
                Aprovado por brasileiros ambiciosos em todo o mundo.
              </h3>
              <p className="text-primary-foreground/70 text-base sm:text-lg mb-10 leading-relaxed">
                Seja para se preparar para uma carreira internacional, viajar ou apenas ganhar a confiança necessária, a English4You te leva lá mais rápido.
              </p>
              <div className="flex flex-wrap gap-10">
                <div>
                  <p className="text-4xl sm:text-5xl font-extrabold mb-1">
                    98%
                  </p>
                  <p className="text-sm font-medium text-primary-foreground/70">
                    De aprovação nos exames de Cambridge
                  </p>
                </div>
                <div>
                  <p className="text-4xl sm:text-5xl font-extrabold mb-1">
                    4.9/5
                  </p>
                  <p className="text-sm font-medium text-primary-foreground/70">
                    Avaliação média dos alunos
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Right — Testimonials */}
            <div className="flex flex-col gap-5">
              {testimonials.map((t, i) => (
                <motion.div
                  key={t.name}
                  {...fadeInUp}
                  transition={{ duration: 0.5, ease: easing, delay: 0.2 + i * 0.12 }}
                  className={`bg-white/10 backdrop-blur-md rounded-2xl p-5 sm:p-6 border border-white/20 shadow-xl ${t.offset}`}
                >
                  <div className="flex gap-1 mb-3">
                    {Array.from({ length: t.stars }).map((_, j) => (
                      <StarIcon key={j} />
                    ))}
                  </div>
                  <p className="text-base sm:text-lg font-medium mb-4 leading-relaxed">
                    {t.quote}
                  </p>
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://i.pravatar.cc/150?img=${t.avatarId}`}
                      alt={t.name}
                      className="w-10 h-10 rounded-full border border-white/30 object-cover"
                    />
                    <div>
                      <p className="font-bold text-sm">{t.name}</p>
                      <p className="text-xs text-primary-foreground/70">{t.role}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
