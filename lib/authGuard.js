import { NextResponse } from 'next/server';
import { verifySessionToken } from './auth';

export async function requireAdmin(req) {
  const token = req.cookies.get('admin_session')?.value;
  const session = await verifySessionToken(
    token,
    process.env.SESSION_SECRET || 'dev-secret'
  );
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}
