import { NextResponse } from 'next/server';
import { readSheet, appendRow, ensureSheetExists } from '@/lib/googleSheets';
import { getPegawaiSession } from '@/lib/pegawaiAuth';

const SHEET = process.env.SHEET_JADWAL_P2K2 || 'JadwalP2K2';
const HEADERS_FALLBACK = ['ID', 'NIP', 'KECAMATAN', 'DESA', 'KELOMPOK', 'TANGGAL', 'TEMPAT', 'MODUL', 'SESI'];

export async function GET(req) {
  try {
    const session = await getPegawaiSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let records = [];
    try {
      const data = await readSheet(SHEET);
      records = data.records.filter((r) => (r.NIP || '').trim() === session.nip);
    } catch {
      records = [];
    }
    return NextResponse.json({ records });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await getPegawaiSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    await ensureSheetExists(SHEET);
    const { headers } = await readSheet(SHEET);
    const id = 'JP' + Date.now();
    await appendRow(SHEET, headers.length ? headers : HEADERS_FALLBACK, {
      ...body,
      ID: id,
      NIP: session.nip,
    });
    return NextResponse.json({ success: true, id });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
