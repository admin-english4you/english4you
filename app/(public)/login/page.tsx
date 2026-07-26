import type { Metadata } from "next";
import { LoginForm } from "./_components/LoginForm";

export const metadata: Metadata = {
  title: "Área do Aluno | English4You",
  description:
    "Acesse sua conta para assistir às aulas ao vivo, praticar com inteligência artificial e revisar seus decks de vocabulário.",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex bg-background">
      <LoginForm />
    </div>
  );
}
