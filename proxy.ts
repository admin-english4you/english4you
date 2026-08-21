import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rotas públicas que não requerem verificação de sessão
  const publicRoutes = ["/", "/login", "/staff/login", "/forgot-password", "/manifest.webmanifest", "/sw.js"];
  const isPublicRoute = publicRoutes.some((route) => pathname === route || pathname.startsWith("/_next") || pathname.startsWith("/api"));

  // Verificar se o usuário possui cookie de sessão
  const sessionCookie = request.cookies.get("e4y_session");

  // Se tentar acessar rotas protegidas (do grupo (hub): /admin, /teacher, /student) sem sessão
  if (!sessionCookie && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Se já estiver autenticado e tentar acessar rotas de auth (/login, /staff/login)
  if (sessionCookie && (pathname === "/login" || pathname === "/staff/login")) {
    try {
      const sessionData = JSON.parse(sessionCookie.value);
      const userRole = sessionData?.user?.role;
      let targetRoute = "/student";

      if (userRole === "ADMIN") targetRoute = "/admin";
      else if (userRole === "TEACHER") targetRoute = "/teacher";

      return NextResponse.redirect(new URL(targetRoute, request.url));
    } catch {
      // Se houver erro de parsing no cookie, apenas limpa e continua para o login
    }
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
