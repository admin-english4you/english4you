import { getCurrentUser } from "@/lib/auth-server";
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

  return <>{children}</>;
}
