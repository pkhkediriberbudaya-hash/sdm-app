import { NextResponse } from 'next/server';
import { readSheet, updateRow } from '@/lib/googleSheets';
import { getPegawaiSession } from '@/lib/pegawaiAuth';
import { normalizeDesaName } from '@/lib/normalize';

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
      const myDesaNorm = new Set(myDesa.map(normalizeDesaName));
      records = data.records.filter((r) => myDesaNorm.has(normalizeDesaName(r.DESA)));
    } catch {
      records = [];
    }

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

    const { kecamatan, nokk, KELOMPOK, STATUS_KEPESERTAAN, CATATAN, IS_KETUA, ALAMAT, JENIS_USAHA } =
      await req.json();
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
    const myDesaNorm = new Set(myDesa.map(normalizeDesaName));
    if (!myDesaNorm.has(normalizeDesaName(record.DESA))) {
      return NextResponse.json(
        { error: 'Anda tidak berwenang mengubah data KPM ini' },
        { status: 403 }
      );
    }

    const wantsKetua = IS_KETUA === true || IS_KETUA === 'TRUE' || IS_KETUA === 'true';
    const kelompokBaru = KELOMPOK ?? record.KELOMPOK;

    // Kalau KPM ini ditandai jadi ketua, lepas status ketua dari KPM lain di
    // kelompok+desa yang sama (supaya cuma ada 1 ketua per kelompok).
    if (wantsKetua && kelompokBaru) {
      const others = records.filter((r) => {
        if ((r.NOKK || '').trim() === nokk.trim()) return false;
        if (normalizeDesaName(r.DESA) !== normalizeDesaName(record.DESA)) return false;
        if ((r.KELOMPOK || '') !== kelompokBaru) return false;
        const isKetua = r.IS_KETUA === true || r.IS_KETUA === 'TRUE' || r.IS_KETUA === 'true';
        return isKetua;
      });
      for (const other of others) {
        await updateRow(sheetName, other._row, headers, { ...other, IS_KETUA: 'FALSE' });
      }
    }

    const updated = {
      ...record,
      KELOMPOK: kelompokBaru,
      STATUS_KEPESERTAAN: STATUS_KEPESERTAAN ?? record.STATUS_KEPESERTAAN,
      CATATAN: CATATAN ?? record.CATATAN,
      IS_KETUA: wantsKetua ? 'TRUE' : 'FALSE',
      ALAMAT: ALAMAT ?? record.ALAMAT,
      JENIS_USAHA: JENIS_USAHA ?? record.JENIS_USAHA ?? '',
    };
    await updateRow(sheetName, record._row, headers, updated);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
