import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { readSheet, updateRow, appendRow } from '@/lib/googleSheets';

const SHEET_SDM = process.env.SHEET_SDM || 'SDM';
const SHEET_CRED = process.env.SHEET_CREDENTIALS || 'Credentials';
const CRED_HEADERS_FALLBACK = ['NIP', 'PASSWORD_HASH', 'MUST_CHANGE', 'UPDATED_AT'];

export async function POST(req) {
  try {
    const { nip } = await req.json();
    if (!nip) return NextResponse.json({ error: 'NIP wajib diisi' }, { status: 400 });
    const nipTrim = nip.trim();

    const { records: sdmRecords } = await readSheet(SHEET_SDM);
    const pegawai = sdmRecords.find((r) => (r.NIP || '').trim() === nipTrim);
    if (!pegawai) {
      return NextResponse.json(
        { error: 'NIP tidak ditemukan di data SDM' },
        { status: 404 }
      );
    }
    const nik = (pegawai.NIK || '').trim();
    if (!nik) {
      return NextResponse.json(
        { error: 'Pegawai ini tidak punya NIK tercatat, tidak bisa reset otomatis' },
        { status: 400 }
      );
    }

    const { headers, records } = await readSheet(SHEET_CRED);
    const cred = records.find((r) => (r.NIP || '').trim() === nipTrim);
    const hash = await bcrypt.hash(nik, 10);

    if (cred) {
      const updated = {
        ...cred,
        PASSWORD_HASH: hash,
        MUST_CHANGE: 'TRUE',
        UPDATED_AT: new Date().toISOString(),
      };
      await updateRow(SHEET_CRED, cred._row, headers, updated);
    } else {
      const newRow = {
        NIP: nipTrim,
        PASSWORD_HASH: hash,
        MUST_CHANGE: 'TRUE',
        UPDATED_AT: new Date().toISOString(),
      };
      await appendRow(SHEET_CRED, headers.length ? headers : CRED_HEADERS_FALLBACK, newRow);
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
