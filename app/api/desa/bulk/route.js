import { NextResponse } from 'next/server';
import { readSheet, appendRows } from '@/lib/googleSheets';
import { getPegawaiSession } from '@/lib/pegawaiAuth';

const SHEET = process.env.SHEET_DESA || 'DesaDampingan';

export async function POST(req) {
  try {
    const session = await getPegawaiSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { items } = await req.json();
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Tidak ada data untuk ditambahkan' }, { status: 400 });
    }

    const { headers } = await readSheet(SHEET);
    const now = new Date().toISOString().slice(0, 10);
    const rows = items.map((item, idx) => ({
      ...item,
      ID: 'D' + (Date.now() + idx),
      NIP: session.nip,
      TANGGAL_DITAMBAHKAN: now,
    }));

    await appendRows(SHEET, headers, rows);
    return NextResponse.json({ success: true, added: rows.length });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
