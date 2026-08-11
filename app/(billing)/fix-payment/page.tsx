import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { paymentService } from "@/modules/payment/payment.service";
import { financeService } from "@/modules/finance/finance.service";
import { FixPaymentView } from "./_components/FixPaymentView";

export const metadata: Metadata = {
  title: "Regularizar pagamento | English4You",
  description: "Atualize seu cartão para voltar a acessar a plataforma.",
};

export default async function FixPaymentPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const { state, subscription, lastFailure } = await paymentService.getAccessState(currentUser.id);
  // Quem nunca contratou não tem cartão para consertar — vai assinar primeiro.
  if (state === "NEEDS_ONBOARDING") redirect("/onboarding");

  const pkg = subscription ? await financeService.getPackageById(subscription.packageId) : undefined;

  return (
    <FixPaymentView
      subscription={subscription}
      lastFailure={lastFailure}
      packageName={pkg?.name ?? null}
    />
  );
}
