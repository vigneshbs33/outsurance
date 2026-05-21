import { type NextRequest, NextResponse } from 'next/server';
import { createSupabaseMiddlewareClient } from './lib/supabase-server';

const PROTECTED_ROUTES = ['/dashboard', '/assessment', '/profile', '/saved', '/explorer', '/buy', '/admin'];
const AUTH_ROUTES = ['/login', '/register'];
const PUBLIC_ROUTES = ['/auth'];

export async function middleware(request: NextRequest) {
  const { client, response } = createSupabaseMiddlewareClient(request);
  const { data: { user } } = await client.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_ROUTES.some(r => path === r || path.startsWith(r + '/'));
  if (isPublic) return response;

  const isProtected = PROTECTED_ROUTES.some(r => path === r || path.startsWith(r + '/'));
  const isAuthRoute = AUTH_ROUTES.some(r => path === r || path.startsWith(r + '/'));

  if (isProtected && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', path);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|ico)$).*)',
  ],
};
