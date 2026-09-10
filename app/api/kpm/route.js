import { NextResponse } from 'next/server';
import { readSheet, updateRow } from '@/lib/googleSheets';
import { getPegawaiSession } from '@/lib/pegawaiAuth';

const SHEET_DESA = process.env.SHEET_DESA || 'DesaDampingan';

async function getMyDesaInKecamatan(nip, kecamatan) {
  const { records } = await readSheet(SHEET_DESA);
  return records
    .filter((d) => (d.NIP || '').trim() === nip && d.KECAMATAN === kecamatan)
    .map((d) => d.NAMA_DESA);
}

export async function GET(req) {
  try {
    const session = await getPegawaiSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const kecamatan = req.nextUrl.searchParams.get('kecamatan');
    if (!kecamatan) {
      return NextResponse.json({ error: 'Kecamatan wajib diisi' }, { status: 400 });
    }

    const myDesa = await getMyDesaInKecamatan(session.nip, kecamatan);
    if (myDesa.length === 0) {
      return NextResponse.json(
        { error: 'Anda tidak memiliki desa dampingan di kecamatan ini' },
        { status: 403 }
      );
    }

    const sheetName = `KPM_${kecamatan}`;
    let records = [];
    try {
      const data = await readSheet(sheetName);
      records = data.records.filter((r) => myDesa.includes(r.DESA));
    } catch {
      records = [];
    }

    // Jangan kirim _row ke client (detail internal sheet, tidak perlu & tidak aman)
    const clean = records.map(({ _row, ...rest }) => rest);

    return NextResponse.json({ records: clean, desaList: myDesa });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const session = await getPegawaiSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { kecamatan, nokk, KELOMPOK, STATUS_KEPESERTAAN, CATATAN } = await req.json();
    if (!kecamatan || !nokk) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    const myDesa = await getMyDesaInKecamatan(session.nip, kecamatan);
    const sheetName = `KPM_${kecamatan}`;
    const { headers, records } = await readSheet(sheetName);
    const record = records.find((r) => (r.NOKK || '').trim() === nokk.trim());

    if (!record) {
      return NextResponse.json({ error: 'KPM tidak ditemukan' }, { status: 404 });
    }
    if (!myDesa.includes(record.DESA)) {
      return NextResponse.json(
        { error: 'Anda tidak berwenang mengubah data KPM ini' },
        { status: 403 }
      );
    }

    const updated = {
      ...record,
      KELOMPOK: KELOMPOK ?? record.KELOMPOK,
      STATUS_KEPESERTAAN: STATUS_KEPESERTAAN ?? record.STATUS_KEPESERTAAN,
      CATATAN: CATATAN ?? record.CATATAN,
    };
    await updateRow(sheetName, record._row, headers, updated);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
