"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, Mail, ArrowRight, CheckCircle2, ArrowLeft } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { requestPasswordResetAction } from "@/modules/user/user.actions";

const easing = [0.22, 1, 0.36, 1] as const;

const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
};

const perks = [
  "Insira seu e-mail cadastrado para receber o link de redefinição.",
  "Verifique sua caixa de entrada e siga o passo a passo enviado.",
  "Redefina sua senha com segurança e volte a assistir suas aulas.",
];

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    // A Action sempre devolve sucesso quando o e-mail é válido — exista ou
    // não a conta, pra não virar um jeito de descobrir e-mails cadastrados.
    // Um `success: false` aqui só acontece por erro de formato do e-mail.
    const result = await requestPasswordResetAction({ email });

    setIsLoading(false);
    if (result.success) {
      setIsSent(true);
    } else {
      setErrorMessage(result.error);
    }
  };

  return (
    <>
      {/* ─── Left Panel ─────────────────────────────────────────────── */}
      <div className="hidden lg:flex w-1/2 relative bg-[#07274f] flex-col overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0 z-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=900&q=80"
            alt="Estudante estudando"
            className="w-full h-full object-cover opacity-75"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#07274f] via-[#07274f]/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-br from-[#016ad1]/30 to-transparent" />
        </div>

        {/* Content */}
        <div className="relative z-10 p-12 flex flex-col h-full justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 text-white hover:opacity-80 transition-opacity w-fit"
          >
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <GraduationCap size={22} strokeWidth={2.5} />
            </div>
            <span className="text-xl font-bold tracking-tight">English4You</span>
          </Link>

          {/* Bottom copy */}
          <motion.div
            {...fadeInUp}
            transition={{ duration: 0.6, ease: easing }}
            className="max-w-md text-white mb-8"
          >
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-7 leading-tight">
              Recupere o acesso à sua conta facilmente.
            </h2>
            <ul className="space-y-4">
              {perks.map((perk) => (
                <li key={perk} className="flex items-start gap-3">
                  <CheckCircle2
                    className="text-[#7dc5fb] mt-0.5 shrink-0"
                    size={18}
                  />
                  <p className="text-slate-300 font-medium leading-relaxed text-sm">
                    {perk}
                  </p>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>

      {/* ─── Right Panel ─────────────────────────────────────────────── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-10 lg:p-12 relative overflow-hidden bg-muted/20 lg:bg-background">
        {/* Decorative blob */}
        <div
          aria-hidden
          className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#f0f7ff] rounded-full blur-3xl opacity-60 -translate-y-1/2 translate-x-1/2 pointer-events-none hidden lg:block"
        />

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: easing }}
          className="w-full max-w-md relative z-10"
        >
          {/* Mobile Logo */}
          <div className="flex lg:hidden justify-center mb-8">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#016ad1] to-[#38a5f8] flex items-center justify-center text-white shadow-lg">
                <GraduationCap size={24} strokeWidth={2.5} />
              </div>
              <span className="text-2xl font-bold tracking-tight text-[#07274f]">
                English4You
              </span>
            </Link>
          </div>

          {/* Card wrapper */}
          <div className="bg-card lg:bg-transparent p-7 sm:p-9 rounded-[2rem] shadow-2xl shadow-slate-200/50 lg:shadow-none lg:p-0 min-h-[380px] flex flex-col justify-center">
            <AnimatePresence mode="wait">
              {!isSent ? (
                <motion.div
                  key="form-step"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.35, ease: easing }}
                >
                  <div className="mb-9 text-center lg:text-left">
                    <h1 className="text-3xl font-extrabold text-[#07274f] mb-2">
                      Recuperar Senha
                    </h1>
                    <p className="text-muted-foreground font-medium text-sm">
                      Insira o seu e-mail cadastrado e enviaremos instruções de redefinição de senha.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    {errorMessage && (
                      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
                        {errorMessage}
                      </div>
                    )}

                    {/* Email */}
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-bold text-foreground">
                        Endereço de E-mail
                      </Label>
                      <div className="relative">
                        <Mail
                          size={17}
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                        />
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="aluno@exemplo.com"
                          required
                          className="pl-10 h-12 rounded-2xl bg-muted/60 border-border focus-visible:border-[#016ad1] focus-visible:ring-[#016ad1]/20 text-foreground"
                        />
                      </div>
                    </div>

                    {/* Submit */}
                    <div className="pt-2">
                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-12 rounded-2xl font-bold text-base bg-[#016ad1] hover:bg-[#0255a9] text-white shadow-lg shadow-[#016ad1]/20 hover:shadow-[#016ad1]/35 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                      >
                        {isLoading ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                            className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                          />
                        ) : (
                          <>
                            Enviar Instruções
                            <ArrowRight size={18} />
                          </>
                        )}
                      </Button>
                    </div>
                  </form>

                  {/* Back to Login link */}
                  <div className="mt-7 text-center">
                    <Link
                      href="/login"
                      className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-[#016ad1] transition-colors"
                    >
                      <ArrowLeft size={16} />
                      Voltar para o Login
                    </Link>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="success-step"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, ease: easing }}
                  className="text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-[#f0f7ff] text-[#016ad1] flex items-center justify-center mx-auto mb-6 border border-[#bae0fd]">
                    <CheckCircle2 size={32} />
                  </div>

                  <h2 className="text-2xl font-extrabold text-[#07274f] mb-3">
                    Link Enviado!
                  </h2>
                  <p className="text-muted-foreground font-medium text-sm mb-8 leading-relaxed max-w-sm mx-auto">
                    Se o e-mail <strong className="text-foreground">{email}</strong> estiver cadastrado na plataforma, você receberá um link seguro para redefinir sua senha em instantes.
                  </p>

                  <Link
                    href="/login"
                    className={cn(
                      buttonVariants({ variant: "default" }),
                      "w-full h-12 rounded-2xl font-bold text-base bg-[#016ad1] hover:bg-[#0255a9] text-white shadow-lg shadow-[#016ad1]/20 hover:shadow-[#016ad1]/35 hover:-translate-y-0.5 transition-all text-center flex items-center justify-center"
                    )}
                  >
                    Ir para o Login
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </>
  );
}
