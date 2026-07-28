import { getCurrentUser } from "@/lib/auth-server";
import { getHomeRouteForRole, hasRouteAccess } from "@/lib/rbac";
import { redirect } from "next/navigation";

export default async function AdminHubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Verificar se o usuário possui acesso ao Hub de Admin
  if (!hasRouteAccess(user.role, "/admin")) {
    const targetRoute = getHomeRouteForRole(user.role);
    redirect(targetRoute);
  }

  return <>{children}</>;
}
