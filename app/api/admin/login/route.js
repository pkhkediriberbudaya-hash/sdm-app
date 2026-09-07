import { NextResponse } from 'next/server';
import { createSessionToken } from '@/lib/auth';

export async function POST(req) {
  try {
    const { username, password } = await req.json();
    const validUser = process.env.ADMIN_USERNAME;
    const validPass = process.env.ADMIN_PASSWORD;

    if (!validUser || !validPass) {
      return NextResponse.json(
        { error: 'ADMIN_USERNAME / ADMIN_PASSWORD belum diatur di server.' },
        { status: 500 }
      );
    }

    if (username === validUser && password === validPass) {
      const token = await createSessionToken(
        { username, iat: Date.now() },
        process.env.SESSION_SECRET || 'dev-secret'
      );
      const res = NextResponse.json({ success: true });
      res.cookies.set('admin_session', token, {
        httpOnly: true,
        path: '/',
        maxAge: 60 * 60 * 8,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
      return res;
    }
    return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
