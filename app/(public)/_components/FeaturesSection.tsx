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
    title: "Live Interactive Classes",
    description:
      "Learn directly from native and certified bilingual teachers in small groups. Real-time feedback, authentic pronunciation, and dynamic conversation practice.",
    perks: ["Max 6 students per class", "Flexible scheduling"],
    dark: false,
  },
  {
    icon: LayoutDashboard,
    title: "Digital Whiteboard",
    description:
      "Our proprietary classroom interface makes learning visual and collaborative. Annotate, drag-and-drop vocabulary, and solve exercises together in real-time.",
    perks: ["Real-time collaboration", "Beautifully designed materials"],
    dark: false,
  },
  {
    icon: Sparkles,
    title: "AI-Powered Practice",
    description:
      "Don't let your English rust between classes. Our smart AI tutor analyzes your weaknesses and generates custom speaking and writing exercises just for you.",
    perks: ["24/7 pronunciation feedback", "Personalized vocabulary decks"],
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
            Our Methodology
          </p>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-[#07274f] mb-5">
            Designed for real fluency.
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground">
            We combine the warmth of a traditional language school with the
            power of modern technology to deliver faster, more confident
            speaking.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              {...fadeInUp}
              transition={{ duration: 0.5, ease: easing, delay: i * 0.1 }}
              whileHover={{ y: -6 }}
              className={`rounded-3xl p-7 sm:p-8 transition-shadow ${
                f.dark
                  ? "bg-[#07274f] border border-slate-700 shadow-xl relative overflow-hidden"
                  : "bg-card border border-border shadow-sm hover:shadow-md"
              }`}
            >
              {f.dark && (
                <div
                  aria-hidden
                  className="absolute top-0 right-0 w-32 h-32 bg-[#016ad1] rounded-full blur-3xl opacity-40 -translate-y-1/2 translate-x-1/2"
                />
              )}
              <div className="relative z-10">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${
                    f.dark
                      ? "bg-white/10 border border-white/20 text-white"
                      : "bg-[#f0f7ff] text-[#016ad1]"
                  }`}
                >
                  <f.icon size={26} />
                </div>

                <h3
                  className={`text-xl font-bold mb-3 ${
                    f.dark ? "text-white" : "text-[#07274f]"
                  }`}
                >
                  {f.title}
                </h3>

                <p
                  className={`leading-relaxed mb-6 text-sm sm:text-base ${
                    f.dark ? "text-slate-300" : "text-muted-foreground"
                  }`}
                >
                  {f.description}
                </p>

                <ul className="space-y-2">
                  {f.perks.map((perk) => (
                    <li
                      key={perk}
                      className={`flex items-center gap-2 text-sm font-medium ${
                        f.dark ? "text-slate-200" : "text-foreground"
                      }`}
                    >
                      <CheckCircle2
                        size={15}
                        className={f.dark ? "text-[#38a5f8]" : "text-green-500"}
                      />
                      {perk}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
