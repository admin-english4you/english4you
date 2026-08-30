"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  GraduationCap,
  Lock,
  Mail,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/firebase-client";
import { requestPasswordResetAction } from "@/modules/user/user.actions";

/**
 * Estados da tela. `expirado` é o motivo de ela existir: a página do Firebase
 * mostrava um erro seco e sem saída, e o aluno ligava para a secretaria.
 */
type Estado = "verificando" | "pronto" | "expirado" | "salvando" | "concluido";

const SENHA_MINIMA = 6;

export function SetPasswordForm({ oobCode }: { oobCode: string | null }) {
  const router = useRouter();
  // Link sem código já nasce expirado — é o mesmo beco sem saída, e resolver no
  // estado inicial evita um render extra só para descobrir isso.
  const [estado, setEstado] = useState<Estado>(oobCode ? "verificando" : "expirado");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [novoLinkEnviado, setNovoLinkEnviado] = useState(false);

  // Valida o código UMA vez, ao abrir. `verifyPasswordResetCode` devolve o
  // e-mail do dono do código, o que evita pedir ao aluno um dado que já
  // sabemos — e deixa claro na tela de qual conta é a senha.
  useEffect(() => {
    if (!oobCode) return;

    let cancelado = false;
    verifyPasswordResetCode(auth, oobCode)
      .then((emailDoCodigo) => {
        if (cancelado) return;
        setEmail(emailDoCodigo);
        setEstado("pronto");
      })
      .catch(() => {
        // Expirado, já usado ou inválido caem no mesmo lugar de propósito: para
        // o aluno, os três significam "peça outro link".
        if (!cancelado) setEstado("expirado");
      });

    return () => {
      cancelado = true;
    };
  }, [oobCode]);

  const handleDefinirSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (senha.length < SENHA_MINIMA) {
      setErro(`A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`);
      return;
    }
    if (senha !== confirmacao) {
      setErro("As senhas não conferem.");
      return;
    }

    setEstado("salvando");
    try {
      await confirmPasswordReset(auth, oobCode!, senha);
      setEstado("concluido");
      setTimeout(() => router.push("/login"), 2500);
    } catch (err) {
      const code = (err as { code?: string })?.code;
      // O código pode expirar entre abrir a tela e enviar o formulário.
      if (code === "auth/expired-action-code" || code === "auth/invalid-action-code") {
        setEstado("expirado");
        return;
      }
      setEstado("pronto");
      setErro(
        code === "auth/weak-password"
          ? "Senha muito fraca. Escolha uma combinação mais difícil de adivinhar."
          : "Não foi possível definir a senha. Tente novamente em alguns instantes."
      );
    }
  };

  const handlePedirNovoLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    // A Action nunca revela se o e-mail existe — o sucesso aqui significa
    // "pedido aceito", não "conta encontrada".
    const result = await requestPasswordResetAction({ email });
    if (result.success) {
      setNovoLinkEnviado(true);
    } else {
      setErro(result.error);
    }
  };

  return (
    <div className="flex w-full items-center justify-center p-6 sm:p-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 text-white shadow-lg">
              <GraduationCap size={24} strokeWidth={2.5} />
            </div>
            <span className="text-2xl font-bold tracking-tight text-primary">English4You</span>
          </Link>
        </div>

        <div className="rounded-[2rem] bg-card p-7 shadow-2xl shadow-slate-200/50 sm:p-9">
          {estado === "verificando" && (
            <div className="py-8 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />
              <p className="mt-4 text-sm text-muted-foreground">Verificando seu link...</p>
            </div>
          )}

          {estado === "expirado" && (
            <>
              <div className="mb-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50">
                  <Clock className="h-6 w-6 text-amber-600" />
                </div>
                <h1 className="text-2xl font-extrabold text-primary">Link expirado</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Este link de definição de senha não vale mais — eles expiram por segurança, e
                  cada um só pode ser usado uma vez.
                </p>
              </div>

              {novoLinkEnviado ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                  <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-emerald-600" />
                  <p className="text-sm font-semibold text-emerald-900">Link novo enviado!</p>
                  <p className="mt-1 text-xs text-emerald-800">
                    Confira sua caixa de entrada (e o spam). O link chega em alguns instantes.
                  </p>
                </div>
              ) : (
                <form onSubmit={handlePedirNovoLink} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-bold">
                      Seu e-mail
                    </Label>
                    <div className="relative">
                      <Mail
                        size={17}
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                      />
                      <Input
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={(ev) => setEmail(ev.target.value)}
                        placeholder="seu@email.com"
                        className="h-12 rounded-2xl bg-muted/60 pl-10"
                      />
                    </div>
                  </div>

                  {erro && (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
                      {erro}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="h-12 w-full rounded-2xl bg-primary text-base font-bold hover:bg-primary/80"
                  >
                    Receber um link novo
                  </Button>
                </form>
              )}

              <Link
                href="/login"
                className={cn(buttonVariants({ variant: "ghost" }), "mt-4 w-full text-sm")}
              >
                Voltar para o login
              </Link>
            </>
          )}

          {(estado === "pronto" || estado === "salvando") && (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-extrabold text-primary">Defina sua senha</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Você está criando a senha de <strong className="text-foreground">{email}</strong>.
                </p>
              </div>

              {erro && (
                <div className="mb-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800">
                  <AlertCircle size={18} className="mt-0.5 shrink-0 text-rose-600" />
                  <span>{erro}</span>
                </div>
              )}

              <form onSubmit={handleDefinirSenha} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="senha" className="text-sm font-bold">
                    Nova senha
                  </Label>
                  <div className="relative">
                    <Lock
                      size={17}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      id="senha"
                      type={mostrarSenha ? "text" : "password"}
                      required
                      value={senha}
                      onChange={(ev) => setSenha(ev.target.value)}
                      placeholder="Mínimo de 6 caracteres"
                      className="h-12 rounded-2xl bg-muted/60 pl-10 pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarSenha((v) => !v)}
                      aria-label={mostrarSenha ? "Esconder senha" : "Mostrar senha"}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {mostrarSenha ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmacao" className="text-sm font-bold">
                    Confirme a senha
                  </Label>
                  <div className="relative">
                    <Lock
                      size={17}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      id="confirmacao"
                      type={mostrarSenha ? "text" : "password"}
                      required
                      value={confirmacao}
                      onChange={(ev) => setConfirmacao(ev.target.value)}
                      placeholder="Repita a senha"
                      className="h-12 rounded-2xl bg-muted/60 pl-10"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  loading={estado === "salvando"}
                  className="h-12 w-full rounded-2xl bg-primary text-base font-bold hover:bg-primary/80"
                >
                  Salvar senha e entrar
                </Button>
              </form>
            </>
          )}

          {estado === "concluido" && (
            <div className="py-6 text-center">
              <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-emerald-600" />
              <h1 className="text-2xl font-extrabold text-primary">Senha criada!</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Estamos te levando para a tela de login...
              </p>
              <Link
                href="/login"
                className={cn(buttonVariants({ variant: "outline" }), "mt-5 w-full rounded-2xl")}
              >
                Ir agora
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
