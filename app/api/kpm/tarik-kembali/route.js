import { NextResponse } from 'next/server';
import { readSheet, updateRow, appendRow, ensureSheetExists } from '@/lib/googleSheets';
import { getPegawaiSession } from '@/lib/pegawaiAuth';
import { normalizeDesaName } from '@/lib/normalize';

const SHEET_DESA = process.env.SHEET_DESA || 'DesaDampingan';
const SHEET_SDM = process.env.SHEET_SDM || 'SDM';
const SHEET_LOG = process.env.SHEET_LOG_KELUAR || 'LogKeluarKPM';
const LOG_HEADERS = [
  'ID', 'TANGGAL', 'NIP', 'NAMA_PENDAMPING', 'KECAMATAN', 'DESA', 'NOKK', 'NAMA_KPM', 'JENIS', 'TAHAP', 'KETERANGAN',
];

export async function POST(req) {
  try {
    const session = await getPegawaiSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { kecamatan, nokk } = await req.json();
    if (!kecamatan || !nokk) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    const { records: desaRecords } = await readSheet(SHEET_DESA);
    const myDesa = desaRecords
      .filter((d) => (d.NIP || '').trim() === session.nip && d.KECAMATAN === kecamatan)
      .map((d) => d.NAMA_DESA);
    const myDesaNorm = new Set(myDesa.map(normalizeDesaName));

    const sheetName = `KPM_${kecamatan}`;
    const { headers, records } = await readSheet(sheetName);
    const record = records.find((r) => (r.NOKK || '').trim() === nokk.trim());
    if (!record) return NextResponse.json({ error: 'KPM tidak ditemukan' }, { status: 404 });
    if (!myDesaNorm.has(normalizeDesaName(record.DESA))) {
      return NextResponse.json({ error: 'Anda tidak berwenang mengubah data KPM ini' }, { status: 403 });
    }

    const statusSebelumnya = record.STATUS_KEPESERTAAN || 'Aktif';
    const updated = { ...record, STATUS_KEPESERTAAN: 'Aktif' };
    await updateRow(sheetName, record._row, headers, updated);

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
      JENIS: 'Dibatalkan',
      TAHAP: `Ditarik dari: ${statusSebelumnya}`,
      KETERANGAN: 'Ditarik kembali oleh pendamping karena kekeliruan.',
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
