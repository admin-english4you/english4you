import { Role } from "@/modules/user/user.types";

/**
 * Mapeamento de rotas e permissões exigidas por cada hub da plataforma.
 */
export const ROUTE_PERMISSIONS: Record<string, Role[]> = {
  "/admin": ["ADMIN"],
  "/teacher": ["TEACHER", "ADMIN"],
  "/student": ["STUDENT", "TEACHER", "ADMIN"],
};

/**
 * Verifica se um papel de usuário (Role) possui acesso à rota informada.
 */
export function hasRouteAccess(userRole: Role | undefined | null, pathname: string): boolean {
  if (!userRole) return false;

  if (pathname.startsWith("/admin")) {
    return userRole === "ADMIN";
  }

  if (pathname.startsWith("/teacher")) {
    return userRole === "TEACHER";
  }

  if (pathname.startsWith("/student")) {
    return userRole === "STUDENT";
  }

  return true;
}

/**
 * Retorna a rota inicial padrão do hub de acordo com o perfil do usuário.
 */
export function getHomeRouteForRole(role: Role | undefined | null): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "TEACHER":
      return "/teacher";
    case "STUDENT":
      return "/student";
    default:
      return "/login";
  }
}
