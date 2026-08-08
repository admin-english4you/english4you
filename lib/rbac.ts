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
 *
 * A permissão vem do mapa ROUTE_PERMISSIONS acima — antes esta função
 * duplicava a regra com igualdade exata de papel e contradizia o mapa,
 * bloqueando ADMIN em /student e /teacher. Uma fonte de verdade só.
 */
export function hasRouteAccess(userRole: Role | undefined | null, pathname: string): boolean {
  if (!userRole) return false;

  const matchedPrefix = Object.keys(ROUTE_PERMISSIONS).find((prefix) => pathname.startsWith(prefix));
  if (!matchedPrefix) return true;

  return ROUTE_PERMISSIONS[matchedPrefix].includes(userRole);
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
