import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { paymentService } from "@/modules/payment/payment.service";
import { DeactivatedAccountView } from "./_components/DeactivatedAccountView";

export const metadata: Metadata = {
  title: "Conta desativada | English4You",
  description: "Sua conta na plataforma está desativada.",
};

/**
 * Fim de linha para quem teve a conta desativada pela escola.
 *
 * Diferente de `/onboarding` e `/fix-payment`, aqui NÃO existe autoatendimento:
 * só um administrador reverte, então a tela não oferece nenhum botão que
 * pudesse devolver o acesso — apenas explica e deixa sair.
 */
export default async function DeactivatedAccountPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  // Reativado enquanto a aba estava aberta: não prender ninguém aqui.
  const { state } = await paymentService.getAccessState(currentUser.id);
  if (state !== "DEACTIVATED") redirect("/student");

  return <DeactivatedAccountView />;
}
