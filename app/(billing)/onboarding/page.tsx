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
  if (state === "DEACTIVATED") redirect("/conta-desativada");
  // Inadimplente não "contrata de novo": ele conserta o cartão da assinatura
  // que já existe. O layout do grupo só barra quem está em dia.
  if (state === "BLOCKED") redirect("/fix-payment");

  // A sessão é um snapshot em cookie e não carrega CPF/endereço — o assinador
  // precisa dos dados frescos do banco.
  //
  // Sequencial, e não `Promise.all`: `getOnboardingState` chama
  // `contractService.getMyContracts`, que LANÇA se o userId da sessão não
  // existir mais no banco (conta apagada/recriada). Rodar em paralelo faz
  // essa exceção vencer a corrida e derrubar a página antes do
  // `if (!user) redirect` abaixo conseguir agir.
  const user = await userService.getUserById(currentUser.id);
  if (!user) redirect("/api/session/invalidate");

  const onboarding = await paymentService.getOnboardingState(currentUser.id);

  return <OnboardingWizard user={user} onboarding={onboarding} />;
}
