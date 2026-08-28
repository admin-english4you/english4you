import { getCurrentUser } from "@/lib/auth-server";
import { paymentService } from "@/modules/payment/payment.service";
import { userService } from "@/modules/user/user.service";
import { SessionProvider } from "@/components/layout/SessionProvider";
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
    if (state === "DEACTIVATED") redirect("/conta-desativada");
    if (state === "NEEDS_ONBOARDING") redirect("/onboarding");
    if (state === "BLOCKED") redirect("/fix-payment");
  }

  // Lido do banco, e não do cookie: é a mesma leitura fresca que o `AppHeader`
  // fazia por conta própria depois de hidratar (`getMeAction`). Trazê-la para
  // cá elimina o round-trip pós-render — e com ele o flash do nome de exemplo.
  const freshUser = await userService.getUserById(user.id);

  return (
    <SessionProvider
      user={{
        id: user.id,
        name: freshUser?.name ?? user.name,
        email: freshUser?.email ?? user.email,
        role: freshUser?.role ?? user.role,
        avatarUrl: freshUser?.avatarUrl ?? null,
      }}
    >
      {children}
    </SessionProvider>
  );
}
