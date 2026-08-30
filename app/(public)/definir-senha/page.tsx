import type { Metadata } from "next";
import { SetPasswordForm } from "./_components/SetPasswordForm";

export const metadata: Metadata = {
  title: "Definir senha | English4You",
  description: "Crie a senha de acesso à sua conta na plataforma English4You.",
  // O link chega por e-mail e carrega um código de uso único: não deve ser
  // indexado nem seguido por robôs.
  robots: { index: false, follow: false },
};

interface SetPasswordPageProps {
  searchParams: Promise<{ oobCode?: string }>;
}

/**
 * Substitui a página de ação do Firebase (ver `lib/firebase-action-link.ts`).
 *
 * A validação do código acontece no CLIENTE, com o SDK do Firebase — é ele que
 * sabe dizer se o código expirou, já foi usado ou é inválido, e é ele que troca
 * a senha. O servidor aqui só entrega a tela.
 */
export default async function SetPasswordPage({ searchParams }: SetPasswordPageProps) {
  const { oobCode } = await searchParams;

  return (
    <div className="flex min-h-screen w-full bg-background">
      <SetPasswordForm oobCode={oobCode ?? null} />
    </div>
  );
}
