import { NextResponse } from 'next/server';
import { readSheet, updateRow, deleteRow } from '@/lib/googleSheets';
import { getPegawaiSession } from '@/lib/pegawaiAuth';

const SHEET = process.env.SHEET_DESA || 'DesaDampingan';

export async function PUT(req, { params }) {
  try {
    const session = await getPegawaiSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const id = decodeURIComponent(params.id);
    const body = await req.json();
    const { headers, records } = await readSheet(SHEET);
    const record = records.find((r) => r.ID === id);
    if (!record) {
      return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 });
    }
    if ((record.NIP || '').trim() !== session.nip) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const updated = { ...record, ...body, ID: record.ID, NIP: record.NIP };
    await updateRow(SHEET, record._row, headers, updated);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const session = await getPegawaiSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const id = decodeURIComponent(params.id);
    const { records } = await readSheet(SHEET);
    const record = records.find((r) => r.ID === id);
    if (!record) {
      return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 });
    }
    if ((record.NIP || '').trim() !== session.nip) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await deleteRow(SHEET, record._row);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
