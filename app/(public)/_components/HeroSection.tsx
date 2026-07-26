"use client";

import { motion } from "framer-motion";
import { ArrowRight, PlayCircle, MonitorPlay, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const fadeInUp = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
};

const easing = [0.22, 1, 0.36, 1] as const;

export function HeroSection() {
  return (
    <section className="relative pt-16 pb-24 sm:pt-24 sm:pb-32 overflow-hidden">
      {/* Background blobs */}
      <div
        aria-hidden
        className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#f0f7ff] rounded-full blur-3xl opacity-70 -translate-y-1/2 translate-x-1/3 pointer-events-none"
      />
      <div
        aria-hidden
        className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#e0effe] rounded-full blur-3xl opacity-50 translate-y-1/3 -translate-x-1/3 pointer-events-none"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        {/* Left — Copy */}
        <div className="relative z-10">
          <motion.div
            {...fadeInUp}
            transition={{ duration: 0.5, ease: easing }}
          >
            <Badge className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#f0f7ff] text-[#016ad1] border border-[#bae0fd] text-sm font-semibold mb-6 hover:bg-[#f0f7ff]">
              <Sparkles size={14} />
              The new standard for learning English
            </Badge>
          </motion.div>

          <motion.h1
            {...fadeInUp}
            transition={{ duration: 0.55, ease: easing, delay: 0.08 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-[#07274f] leading-[1.08] mb-6"
          >
            Fluency meets{" "}
            <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-[#016ad1] to-[#38a5f8] bg-clip-text text-transparent">
              innovation.
            </span>
          </motion.h1>

          <motion.p
            {...fadeInUp}
            transition={{ duration: 0.55, ease: easing, delay: 0.14 }}
            className="text-lg sm:text-xl text-muted-foreground leading-relaxed mb-10 max-w-xl"
          >
            Experience premium English education tailored for Brazilian students.
            Live classes, interactive digital whiteboards, and AI-powered
            practice — all in one sophisticated platform.
          </motion.p>

          <motion.div
            {...fadeInUp}
            transition={{ duration: 0.55, ease: easing, delay: 0.2 }}
            className="flex flex-wrap items-center gap-4"
          >
            <Button className="rounded-full px-8 py-6 text-base font-bold bg-[#016ad1] hover:bg-[#0255a9] text-white shadow-xl shadow-[#016ad1]/25 hover:shadow-[#016ad1]/40 hover:-translate-y-1 transition-all flex items-center gap-2">
              Start Learning Today
              <ArrowRight size={20} />
            </Button>
            <Button
              variant="ghost"
              className="rounded-full px-8 py-6 text-base font-bold text-foreground border border-border hover:bg-muted flex items-center gap-2"
            >
              <PlayCircle size={20} className="text-[#016ad1]" />
              See How It Works
            </Button>
          </motion.div>

          {/* Social proof */}
          <motion.div
            {...fadeInUp}
            transition={{ duration: 0.55, ease: easing, delay: 0.28 }}
            className="mt-12 flex items-center gap-5"
          >
            <div className="flex -space-x-3">
              {[11, 12, 13, 14].map((i) => (
                <div
                  key={i}
                  className="w-10 h-10 rounded-full border-2 border-background bg-muted overflow-hidden ring-1 ring-border"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://i.pravatar.cc/100?img=${i}`}
                    alt="Student avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              Join{" "}
              <span className="font-bold text-[#07274f]">10,000+</span>{" "}
              Brazilian students
              <br />
              mastering English with us.
            </p>
          </motion.div>
        </div>

        {/* Right — Visual */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: easing }}
          className="relative z-10 lg:h-[580px] flex items-center justify-center"
        >
          {/* Decorative rotated card behind */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-4 bg-gradient-to-tr from-[#016ad1]/10 via-[#38a5f8]/5 to-transparent rounded-[3rem] -rotate-2 border border-[#016ad1]/10"
          />

          {/* Main card */}
          <div className="relative w-full max-h-[520px] rounded-[2.5rem] overflow-hidden shadow-2xl shadow-[#016ad1]/10 border-4 border-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&q=80"
              alt="Students learning in a modern classroom"
              className="w-full h-full object-cover"
            />

            {/* Glassmorphic floating card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.5, ease: easing }}
              className="absolute bottom-5 left-4 right-4 bg-white/80 backdrop-blur-xl rounded-2xl p-4 flex items-center gap-3 shadow-xl border border-white/60"
            >
              <div className="w-11 h-11 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0">
                <MonitorPlay size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#07274f]">
                  Live Class Starting
                </p>
                <p className="text-xs font-medium text-muted-foreground truncate">
                  Advanced Conversation with Sarah
                </p>
              </div>
              <Button
                size="sm"
                className="rounded-xl bg-[#07274f] text-white hover:bg-[#016ad1] shrink-0 px-4"
              >
                Join
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
