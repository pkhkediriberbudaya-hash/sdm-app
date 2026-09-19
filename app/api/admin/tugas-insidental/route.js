import { NextResponse } from 'next/server';
import { readSheet, appendRow, ensureValidHeaders } from '@/lib/googleSheets';

const SHEET = process.env.SHEET_TUGAS_INSIDENTAL || 'TugasInsidental';
const HEADERS_FALLBACK = ['ID', 'JUDUL', 'DEADLINE', 'LINK', 'DESKRIPSI', 'DIBUAT_TANGGAL'];

export async function GET() {
  try {
    await ensureValidHeaders(SHEET, HEADERS_FALLBACK);
    const data = await readSheet(SHEET);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    if (!body.JUDUL || !body.LINK) {
      return NextResponse.json({ error: 'Judul dan Link Tugas wajib diisi' }, { status: 400 });
    }

    await ensureValidHeaders(SHEET, HEADERS_FALLBACK);
    const { headers } = await readSheet(SHEET);
    await appendRow(SHEET, headers.length ? headers : HEADERS_FALLBACK, {
      ID: 'TI' + Date.now(),
      JUDUL: body.JUDUL,
      DEADLINE: body.DEADLINE || '',
      LINK: body.LINK,
      DESKRIPSI: body.DESKRIPSI || '',
      DIBUAT_TANGGAL: new Date().toISOString().slice(0, 10),
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
