import { getCurrentUser } from "@/lib/auth-server";
import { paymentService } from "@/modules/payment/payment.service";
import { redirect } from "next/navigation";

export default async function HubBaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // Se tentar acessar qualquer rota interna do hub sem estar logado
  if (!user) {
    redirect("/login");
  }

  // Portão financeiro: nenhum aluno usa a plataforma sem contrato assinado e
  // mensalidade em dia. Fica AQUI, e não em cada página, porque é o único ponto
  // por onde todo o hub passa — as telas de destino (/onboarding, /fix-payment)
  // moram no grupo (billing), fora daqui, senão o redirect entraria em laço.
  //
  // Admin e professor não têm pacote nem assinatura: nem consultamos.
  if (user.role === "STUDENT") {
    const { state } = await paymentService.getAccessState(user.id);
    if (state === "NEEDS_ONBOARDING") redirect("/onboarding");
    if (state === "BLOCKED") redirect("/fix-payment");
  }

  return <>{children}</>;
}
