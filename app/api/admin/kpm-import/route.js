import { NextResponse } from 'next/server';
import {
  readSheet,
  ensureSheetExists,
  clearSheetRange,
  writeSheetBulk,
  appendRow,
} from '@/lib/googleSheets';

const KPM_HEADERS = [
  'NOKK',
  'NIK',
  'NAMA',
  'BANK',
  'KECAMATAN',
  'DESA',
  'ALAMAT',
  'STATUS_PENYALURAN',
  'KODE_BATCH',
  'TAHAP_TERAKHIR',
  'TANGGAL_UPDATE',
  'KELOMPOK',
  'STATUS_KEPESERTAAN',
  'CATATAN',
];

const SHEET_MENUS = process.env.SHEET_MENUS || 'Menus';

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

async function ensureMenuRegistered(kecamatan, sheetName) {
  try {
    const { headers, records } = await readSheet(SHEET_MENUS);
    const key = `kpm_${slugify(kecamatan)}`;
    const already = records.some((r) => r.KEY === key);
    if (!already) {
      const maxOrder = records.reduce((m, r) => Math.max(m, Number(r.ORDER) || 0), 0);
      await appendRow(SHEET_MENUS, headers, {
        KEY: key,
        LABEL: `KPM ${kecamatan}`,
        SHEET_NAME: sheetName,
        PRIMARY_KEY: 'NOKK',
        ICON: '🧾',
        ORDER: maxOrder + 1,
      });
    }
  } catch {
    // Kalau sheet Menus belum ada / gagal dibaca, lewati saja pendaftaran menu
    // (import KPM tetap boleh jalan tanpa ini).
  }
}

export async function POST(req) {
  try {
    const { kecamatan, tahap, rows } = await req.json();

    if (!kecamatan || !tahap) {
      return NextResponse.json(
        { error: 'Kecamatan dan Tahap wajib diisi' },
        { status: 400 }
      );
    }
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'Tidak ada baris data untuk diproses' }, { status: 400 });
    }

    const sheetName = `KPM_${kecamatan}`;
    await ensureSheetExists(sheetName);

    const { headers: existingHeaders, records: existingRecords } = await readSheet(sheetName);
    const headers = existingHeaders.length ? existingHeaders : KPM_HEADERS;

    const byNokk = new Map(existingRecords.map((r) => [(r.NOKK || '').trim(), r]));
    const today = new Date().toISOString().slice(0, 10);

    let added = 0;
    let updated = 0;
    let skipped = 0;

    for (const row of rows) {
      const nokk = (row.NOKK || '').trim();
      if (!nokk) {
        skipped++;
        continue;
      }
      const existing = byNokk.get(nokk);
      if (existing) {
        existing.NIK = row.NIK || existing.NIK || '';
        existing.NAMA = row.NAMA || existing.NAMA || '';
        existing.BANK = row.BANK || existing.BANK || '';
        existing.KECAMATAN = kecamatan;
        existing.DESA = row.DESA || existing.DESA || '';
        existing.ALAMAT = row.ALAMAT || existing.ALAMAT || '';
        existing.STATUS_PENYALURAN = row.STATUS_PENYALURAN || existing.STATUS_PENYALURAN || '';
        existing.KODE_BATCH = row.KODE_BATCH || existing.KODE_BATCH || '';
        existing.TAHAP_TERAKHIR = tahap;
        existing.TANGGAL_UPDATE = today;
        // KELOMPOK, STATUS_KEPESERTAAN, CATATAN sengaja TIDAK disentuh —
        // itu wilayah kelola manual pendamping.
        updated++;
      } else {
        byNokk.set(nokk, {
          NOKK: nokk,
          NIK: row.NIK || '',
          NAMA: row.NAMA || '',
          BANK: row.BANK || '',
          KECAMATAN: kecamatan,
          DESA: row.DESA || '',
          ALAMAT: row.ALAMAT || '',
          STATUS_PENYALURAN: row.STATUS_PENYALURAN || '',
          KODE_BATCH: row.KODE_BATCH || '',
          TAHAP_TERAKHIR: tahap,
          TANGGAL_UPDATE: today,
          KELOMPOK: '',
          STATUS_KEPESERTAAN: 'Aktif',
          CATATAN: '',
        });
        added++;
      }
    }

    const finalRecords = Array.from(byNokk.values());

    await clearSheetRange(sheetName);
    await writeSheetBulk(sheetName, headers, finalRecords);
    await ensureMenuRegistered(kecamatan, sheetName);

    return NextResponse.json({
      success: true,
      sheetName,
      added,
      updated,
      skipped,
      total: finalRecords.length,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
