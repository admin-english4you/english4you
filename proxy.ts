import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decodeSession, SESSION_COOKIE } from "@/lib/session";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rotas públicas que não requerem verificação de sessão
  const publicRoutes = ["/", "/login", "/staff/login", "/forgot-password", "/definir-senha", "/instalar", "/manifest.webmanifest", "/sw.js"];
  const isPublicRoute = publicRoutes.some((route) => pathname === route || pathname.startsWith("/_next") || pathname.startsWith("/api"));

  // Sessão VERIFICADA (assinatura + validade, ver lib/session.ts) — um cookie
  // adulterado, expirado ou no formato antigo conta como "sem sessão".
  const rawCookie = request.cookies.get(SESSION_COOKIE)?.value;
  const session = decodeSession(rawCookie);

  // Se tentar acessar rotas protegidas (do grupo (hub): /admin, /teacher, /student) sem sessão
  if (!session && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    const response = NextResponse.redirect(loginUrl);
    // Descarta o cookie inválido para não carregá-lo em toda request.
    if (rawCookie) response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  // Se já estiver autenticado e tentar acessar rotas de auth (/login, /staff/login)
  if (session && (pathname === "/login" || pathname === "/staff/login")) {
    const userRole = session.user.role;
    let targetRoute = "/student";

    if (userRole === "ADMIN") targetRoute = "/admin";
    else if (userRole === "TEACHER") targetRoute = "/teacher";

    return NextResponse.redirect(new URL(targetRoute, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, assets)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

export default proxy;
