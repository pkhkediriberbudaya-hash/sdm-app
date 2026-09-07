import { NextResponse } from 'next/server';
import { readSheet, appendRow } from '@/lib/googleSheets';
import { getPegawaiSession } from '@/lib/pegawaiAuth';

const SHEET = process.env.SHEET_DESA || 'DesaDampingan';

export async function GET(req) {
  try {
    const session = await getPegawaiSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const nip = req.nextUrl.searchParams.get('nip');
    if (nip && nip.trim() !== session.nip) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { headers, records } = await readSheet(SHEET);
    const filtered = records.filter((r) => (r.NIP || '').trim() === session.nip);
    return NextResponse.json({ headers, records: filtered });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await getPegawaiSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { headers } = await readSheet(SHEET);
    const id = 'D' + Date.now();
    const row = {
      ...body,
      ID: id,
      NIP: session.nip,
      TANGGAL_DITAMBAHKAN: new Date().toISOString().slice(0, 10),
    };
    await appendRow(SHEET, headers, row);
    return NextResponse.json({ success: true, id });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
