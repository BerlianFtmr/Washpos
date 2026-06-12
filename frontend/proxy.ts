import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login'];

// Admin-only paths (pegawai gets redirected to /)
const ADMIN_PATHS = [
  '/users',
  '/services/new',
  '/payments/',
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip proxy for static files, API routes, etc.
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Read token from cookies (synced from localStorage via auth.ts)
  const token = request.cookies.get('washpos_token')?.value;
  const userRole = request.cookies.get('washpos_role')?.value;
  const isAuthenticated = !!token;

  // Redirect authenticated users away from login
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // Redirect unauthenticated users to login
  if (!isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin-only route protection for pegawai users
  if (userRole === 'pegawai') {
    const isAdminPath = ADMIN_PATHS.some(
      (adminPath) => pathname === adminPath || pathname.startsWith(adminPath + '/')
    );
    // Also check edit paths for services: /services/:id/edit
    const isServiceEdit = /^\/services\/\d+\/edit/.test(pathname);

    if (isAdminPath || isServiceEdit) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
