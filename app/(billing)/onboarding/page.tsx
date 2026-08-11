import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { userService } from "@/modules/user/user.service";
import { paymentService } from "@/modules/payment/payment.service";
import { OnboardingWizard } from "./_components/OnboardingWizard";

export const metadata: Metadata = {
  title: "Concluir matrícula | English4You",
  description: "Assine o contrato e configure o pagamento para começar a estudar.",
};

export default async function OnboardingPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const { state } = await paymentService.getAccessState(currentUser.id);
  // Inadimplente não "contrata de novo": ele conserta o cartão da assinatura
  // que já existe. O layout do grupo só barra quem está em dia.
  if (state === "BLOCKED") redirect("/fix-payment");

  // A sessão é um snapshot em cookie e não carrega CPF/endereço — o assinador
  // precisa dos dados frescos do banco.
  const [user, onboarding] = await Promise.all([
    userService.getUserById(currentUser.id),
    paymentService.getOnboardingState(currentUser.id),
  ]);

  if (!user) redirect("/login");

  return <OnboardingWizard user={user} onboarding={onboarding} />;
}
