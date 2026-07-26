import type { Metadata } from "next";
import { ForgotPasswordForm } from "./_components/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Recuperar Senha | English4You",
  description:
    "Esqueceu sua senha? Insira seu e-mail para receber as instruções de redefinição de senha e voltar a estudar.",
};

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex bg-background w-full">
      <ForgotPasswordForm />
    </div>
  );
}
