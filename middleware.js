import { NextResponse } from 'next/server';
import { verifySessionToken } from './lib/auth';

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  const isAdminPublic =
    pathname === '/admin/login' || pathname === '/api/admin/login';

  const needsAdminAuth =
    (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) &&
    !isAdminPublic;

  if (needsAdminAuth) {
    const token = req.cookies.get('admin_session')?.value;
    const session = await verifySessionToken(
      token,
      process.env.SESSION_SECRET || 'dev-secret'
    );
    if (!session) {
      if (pathname.startsWith('/api/admin')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const url = req.nextUrl.clone();
      url.pathname = '/admin/login';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  const pegawaiPageMatch = pathname.match(/^\/pegawai\/([^/]+)/);
  const pegawaiApiMatch = pathname.match(/^\/api\/pegawai\/([^/]+)/);
  const match = pegawaiPageMatch || pegawaiApiMatch;

  if (match) {
    const nipParam = decodeURIComponent(match[1]);
    const token = req.cookies.get('pegawai_session')?.value;
    const session = await verifySessionToken(
      token,
      process.env.SESSION_SECRET || 'dev-secret'
    );
    if (!session || session.nip !== nipParam) {
      if (pegawaiApiMatch) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const url = req.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/pegawai/:path*',
    '/api/pegawai/:path*',
  ],
};
