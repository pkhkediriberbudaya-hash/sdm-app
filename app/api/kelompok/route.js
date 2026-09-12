import { NextResponse } from 'next/server';
import { readSheet } from '@/lib/googleSheets';
import { getPegawaiSession } from '@/lib/pegawaiAuth';

const SHEET = process.env.SHEET_MASTER_KELOMPOK || 'MasterKelompok';

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

    const clean = records.map(({ _row, ...rest }) => rest);
    return NextResponse.json({ records: clean });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
