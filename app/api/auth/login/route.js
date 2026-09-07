import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { readSheet, appendRow } from '@/lib/googleSheets';
import { createSessionToken } from '@/lib/auth';

const SHEET_SDM = process.env.SHEET_SDM || 'SDM';
const SHEET_CRED = process.env.SHEET_CREDENTIALS || 'Credentials';
const CRED_HEADERS_FALLBACK = ['NIP', 'PASSWORD_HASH', 'MUST_CHANGE', 'UPDATED_AT'];

export async function POST(req) {
  try {
    const { nip, password } = await req.json();
    if (!nip || !password) {
      return NextResponse.json({ error: 'NIP dan password wajib diisi' }, { status: 400 });
    }
    const nipTrim = nip.trim();

    const { records: sdmRecords } = await readSheet(SHEET_SDM);
    const pegawai = sdmRecords.find((r) => (r.NIP || '').trim() === nipTrim);
    if (!pegawai) {
      return NextResponse.json({ error: 'NIP tidak ditemukan' }, { status: 404 });
    }

    const { headers: credHeaders, records: credRecords } = await readSheet(SHEET_CRED);
    const cred = credRecords.find((r) => (r.NIP || '').trim() === nipTrim);

    let mustChange = false;

    if (!cred) {
      // Login pertama kali: password default harus sama dengan NIK
      const nik = (pegawai.NIK || '').trim();
      if (!nik || password !== nik) {
        return NextResponse.json({ error: 'NIP atau password salah' }, { status: 401 });
      }
      const hash = await bcrypt.hash(nik, 10);
      const newRow = {
        NIP: nipTrim,
        PASSWORD_HASH: hash,
        MUST_CHANGE: 'TRUE',
        UPDATED_AT: new Date().toISOString(),
      };
      await appendRow(
        SHEET_CRED,
        credHeaders.length ? credHeaders : CRED_HEADERS_FALLBACK,
        newRow
      );
      mustChange = true;
    } else {
      const valid = await bcrypt.compare(password, cred.PASSWORD_HASH || '');
      if (!valid) {
        return NextResponse.json({ error: 'NIP atau password salah' }, { status: 401 });
      }
      mustChange = (cred.MUST_CHANGE || '').toString().trim().toUpperCase() === 'TRUE';
    }

    const token = await createSessionToken(
      { nip: nipTrim, iat: Date.now() },
      process.env.SESSION_SECRET || 'dev-secret'
    );
    const res = NextResponse.json({ success: true, mustChange, nip: nipTrim });
    res.cookies.set('pegawai_session', token, {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 12,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
    return res;
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
