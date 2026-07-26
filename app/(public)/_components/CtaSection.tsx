"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

const fadeInUp = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
};
const easing = [0.22, 1, 0.36, 1] as const;

export function CtaSection() {
  return (
    <section
      id="pricing"
      className="py-20 sm:py-28 bg-background"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <motion.h2
          {...fadeInUp}
          transition={{ duration: 0.5, ease: easing }}
          className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#07274f] mb-6 leading-tight"
        >
          Ready to speak with confidence?
        </motion.h2>

        <motion.p
          {...fadeInUp}
          transition={{ duration: 0.5, ease: easing, delay: 0.08 }}
          className="text-base sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto"
        >
          Join English4You today and transform the way you learn English. Book
          your first class in minutes.
        </motion.p>

        <motion.div
          {...fadeInUp}
          transition={{ duration: 0.5, ease: easing, delay: 0.16 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Button className="w-full sm:w-auto rounded-full px-8 py-6 text-base font-bold bg-[#016ad1] hover:bg-[#0255a9] text-white shadow-xl shadow-[#016ad1]/25 hover:shadow-[#016ad1]/40 hover:-translate-y-1 transition-all">
            View Pricing Plans
          </Button>
          <Button
            variant="secondary"
            className="w-full sm:w-auto rounded-full px-8 py-6 text-base font-bold text-[#016ad1] bg-[#f0f7ff] hover:bg-[#e0effe]"
          >
            Try a Free Class
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
