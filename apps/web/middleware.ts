import { NextRequest, NextResponse } from 'next/server';

/**
 * Decodifica el payload de un JWT sin verificar la firma.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(base64, 'base64').toString('utf-8');
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Rutas que requieren un rol específico y se verifican en el servidor.
 * Solo rutas donde el SSR necesita saber el rol (dashboards).
 * Las rutas de datos (/solicitudes, /donaciones) se protegen en el cliente.
 */
const ROLE_REQUIRED: Record<string, string> = {
  '/refugio/dashboard': 'refugio',
  '/admin/dashboard': 'admin',
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get('access_token')?.value ?? null;
  const payload = token ? decodeJwtPayload(token) : null;
  const isAuthenticated = payload !== null;
  const userRole = typeof payload?.role === 'string' ? payload.role : null;

  for (const [route, requiredRole] of Object.entries(ROLE_REQUIRED)) {
    if (pathname.startsWith(route)) {
      if (!isAuthenticated) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
      }
      if (userRole !== requiredRole) {
        return NextResponse.redirect(new URL('/', request.url));
      }
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/refugio/dashboard/:path*', '/admin/dashboard/:path*'],
};
