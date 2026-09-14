import { NextResponse } from 'next/server';
import { readSheet, updateRow, appendRow, ensureSheetExists } from '@/lib/googleSheets';
import { getPegawaiSession } from '@/lib/pegawaiAuth';
import { normalizeDesaName } from '@/lib/normalize';

const SHEET_DESA = process.env.SHEET_DESA || 'DesaDampingan';
const SHEET_SDM = process.env.SHEET_SDM || 'SDM';
const SHEET_LOG = process.env.SHEET_LOG_KELUAR || 'LogKeluarKPM';
const LOG_HEADERS = [
  'ID',
  'TANGGAL',
  'NIP',
  'NAMA_PENDAMPING',
  'KECAMATAN',
  'DESA',
  'NOKK',
  'NAMA_KPM',
  'JENIS',
  'KETERANGAN',
];

const JENIS_TO_STATUS = {
  'Graduasi Mandiri': 'Sukses Graduasi Mandiri',
  PPSE: 'Sukses PPSE',
};

export async function POST(req) {
  try {
    const session = await getPegawaiSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { kecamatan, nokk, jenis, keterangan } = await req.json();
    if (!kecamatan || !nokk || !jenis || !JENIS_TO_STATUS[jenis]) {
      return NextResponse.json({ error: 'Data tidak lengkap atau jenis tidak valid' }, { status: 400 });
    }

    const { records: desaRecords } = await readSheet(SHEET_DESA);
    const myDesa = desaRecords
      .filter((d) => (d.NIP || '').trim() === session.nip && d.KECAMATAN === kecamatan)
      .map((d) => d.NAMA_DESA);
    const myDesaNorm = new Set(myDesa.map(normalizeDesaName));

    const sheetName = `KPM_${kecamatan}`;
    const { headers, records } = await readSheet(sheetName);
    const record = records.find((r) => (r.NOKK || '').trim() === nokk.trim());
    if (!record) {
      return NextResponse.json({ error: 'KPM tidak ditemukan' }, { status: 404 });
    }
    if (!myDesaNorm.has(normalizeDesaName(record.DESA))) {
      return NextResponse.json(
        { error: 'Anda tidak berwenang mengubah data KPM ini' },
        { status: 403 }
      );
    }

    const updated = { ...record, STATUS_KEPESERTAAN: JENIS_TO_STATUS[jenis] };
    await updateRow(sheetName, record._row, headers, updated);

    // Catat ke log terpusat supaya admin bisa pantau tanpa buka tiap tab kecamatan
    await ensureSheetExists(SHEET_LOG);
    const { headers: logHeaders } = await readSheet(SHEET_LOG);
    const { records: sdmRecords } = await readSheet(SHEET_SDM);
    const pendamping = sdmRecords.find((s) => (s.NIP || '').trim() === session.nip);

    await appendRow(SHEET_LOG, logHeaders.length ? logHeaders : LOG_HEADERS, {
      ID: 'LK' + Date.now(),
      TANGGAL: new Date().toISOString(),
      NIP: session.nip,
      NAMA_PENDAMPING: pendamping?.NAMA || session.nip,
      KECAMATAN: kecamatan,
      DESA: record.DESA,
      NOKK: nokk,
      NAMA_KPM: record.NAMA,
      JENIS: jenis,
      KETERANGAN: keterangan || '',
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
