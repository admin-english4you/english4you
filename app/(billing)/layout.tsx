import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { getHomeRouteForRole } from "@/lib/rbac";
import { paymentService } from "@/modules/payment/payment.service";

/**
 * Grupo das telas de cobrança: `/onboarding` e `/fix-payment`.
 *
 * Vive FORA do `(hub)` de propósito. O `(hub)/layout.tsx` manda para cá todo
 * aluno que precisa contratar ou regularizar; se estas telas morassem lá dentro,
 * esse redirect entraria em laço infinito consigo mesmo.
 *
 * O portão aqui é o inverso do dele: quem já está em dia não tem o que fazer
 * nestas telas e volta pro hub. Não há `AppLayout`/sidebar — o aluno bloqueado
 * não navega pra lugar nenhum, só resolve a pendência ou sai.
 */
export default async function BillingLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Admin e professor não têm pacote nem assinatura — nunca passam por aqui.
  if (user.role !== "STUDENT") {
    redirect(getHomeRouteForRole(user.role));
  }

  const { state } = await paymentService.getAccessState(user.id);
  if (state === "OK") {
    redirect(getHomeRouteForRole(user.role));
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16">{children}</div>
    </div>
  );
}
