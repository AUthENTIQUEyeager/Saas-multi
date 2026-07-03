import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from './lib/supabase/middleware';

const PUBLIC_PATHS = ['/login'];

/**
 * Garde de routes globale :
 * - non connecté -> /login
 * - connecté mais mauvais rôle pour la zone visitée -> redirigé vers sa propre zone
 * - boutique suspendue -> bloqué avec message (vérifié dans app/(app)/layout.tsx via requête DB,
 *   le middleware ne fait que la vérification de rôle pour rester léger)
 */
export async function middleware(request: NextRequest) {
  const { response, supabase, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (user && isPublic) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    const url = request.nextUrl.clone();
    url.pathname = profile?.role === 'super_admin' ? '/admin' : profile?.role === 'owner' ? '/owner' : '/app';
    return NextResponse.redirect(url);
  }

  if (user && !isPublic) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    const role = profile?.role;

    const zoneMap: Record<string, string> = { '/admin': 'super_admin', '/owner': 'owner', '/app': 'manager' };
    const zone = Object.keys(zoneMap).find((z) => pathname.startsWith(z));

    if (zone === '/admin' && role !== 'super_admin') {
      return NextResponse.redirect(new URL('/login?error=acces_refuse', request.url));
    }
    if (zone === '/owner' && role !== 'owner') {
      return NextResponse.redirect(new URL('/login?error=acces_refuse', request.url));
    }
    if (zone === '/app' && role !== 'manager' && role !== 'employee') {
      return NextResponse.redirect(new URL('/login?error=acces_refuse', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)']
};
