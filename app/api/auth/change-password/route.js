import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { readSheet, updateRow } from '@/lib/googleSheets';
import { getPegawaiSession } from '@/lib/pegawaiAuth';

const SHEET_CRED = process.env.SHEET_CREDENTIALS || 'Credentials';

export async function POST(req) {
  try {
    const session = await getPegawaiSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { oldPassword, newPassword } = await req.json();
    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password baru minimal 6 karakter' },
        { status: 400 }
      );
    }

    const { headers, records } = await readSheet(SHEET_CRED);
    const cred = records.find((r) => (r.NIP || '').trim() === session.nip);
    if (!cred) {
      return NextResponse.json({ error: 'Data akun tidak ditemukan' }, { status: 404 });
    }

    const valid = await bcrypt.compare(oldPassword || '', cred.PASSWORD_HASH || '');
    if (!valid) {
      return NextResponse.json({ error: 'Password lama salah' }, { status: 401 });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    const updated = {
      ...cred,
      PASSWORD_HASH: hash,
      MUST_CHANGE: 'FALSE',
      UPDATED_AT: new Date().toISOString(),
    };
    await updateRow(SHEET_CRED, cred._row, headers, updated);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
