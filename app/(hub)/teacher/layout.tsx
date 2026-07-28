import { getCurrentUser } from "@/lib/auth-server";
import { getHomeRouteForRole, hasRouteAccess } from "@/lib/rbac";
import { redirect } from "next/navigation";

export default async function TeacherHubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Verificar se o usuário possui acesso ao Hub de Professor
  if (!hasRouteAccess(user.role, "/teacher")) {
    const targetRoute = getHomeRouteForRole(user.role);
    redirect(targetRoute);
  }

  return <>{children}</>;
}
