import { NextResponse } from 'next/server';
import { readSheet, updateRow } from '@/lib/googleSheets';

const SHEET = process.env.SHEET_SDM || 'SDM';
const READONLY_FIELDS = ['NO', 'NIP', 'NIK', 'STATUS DATA'];

export async function GET(req, { params }) {
  const nip = decodeURIComponent(params.nip || '').trim();
  try {
    const { headers, records } = await readSheet(SHEET);
    const record = records.find((r) => (r.NIP || '').trim() === nip);
    if (!record) {
      return NextResponse.json({ error: 'NIP tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ headers, record, readonlyFields: READONLY_FIELDS });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  const nip = decodeURIComponent(params.nip || '').trim();
  try {
    const body = await req.json();
    const { headers, records } = await readSheet(SHEET);
    const record = records.find((r) => (r.NIP || '').trim() === nip);
    if (!record) {
      return NextResponse.json({ error: 'NIP tidak ditemukan' }, { status: 404 });
    }
    const updated = { ...record };
    for (const key of Object.keys(body)) {
      if (READONLY_FIELDS.includes(key)) continue;
      if (headers.includes(key)) updated[key] = body[key];
    }
    await updateRow(SHEET, record._row, headers, updated);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
