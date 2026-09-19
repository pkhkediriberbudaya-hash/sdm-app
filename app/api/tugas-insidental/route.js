import { NextResponse } from 'next/server';
import { readSheet } from '@/lib/googleSheets';
import { getPegawaiSession } from '@/lib/pegawaiAuth';

const SHEET = process.env.SHEET_TUGAS_INSIDENTAL || 'TugasInsidental';

export async function GET(req) {
  try {
    const session = await getPegawaiSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let records = [];
    try {
      const data = await readSheet(SHEET);
      records = data.records;
    } catch {
      records = [];
    }
    return NextResponse.json({ records });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
