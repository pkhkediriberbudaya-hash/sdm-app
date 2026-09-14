import { NextResponse } from 'next/server';
import { readSheet } from '@/lib/googleSheets';
import { getPegawaiSession } from '@/lib/pegawaiAuth';

const SHEET_LOG = process.env.SHEET_LOG_KELUAR || 'LogKeluarKPM';

export async function GET(req) {
  try {
    const session = await getPegawaiSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let records = [];
    try {
      const data = await readSheet(SHEET_LOG);
      records = data.records.filter((r) => (r.NIP || '').trim() === session.nip);
    } catch {
      records = [];
    }
    return NextResponse.json({ records });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
