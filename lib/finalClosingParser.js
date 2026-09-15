const KOMPONEN_FIELDS = ['AUD', 'SD', 'SMP', 'SMA', 'DISABILITAS', 'LANSIA', 'HAMIL', 'HAM'];

function findKey(keys, candidates) {
  return keys.find((k) => candidates.includes(k.trim().toUpperCase()));
}

function extractNokk(text) {
  const match = (text || '').toString().match(/\d{16}/);
  return match ? match[0] : '';
}

/**
 * Parse SATU file Excel "Final Closing". Mendukung beberapa variasi format:
 * - Kolom NAMA & NOKK terpisah
 * - Digabung 1 sel (kolom "PENGURUS"), dipisah baris baru (enter) ATAU spasi
 */
function parseSheet(rows) {
  const byNokk = {};

  rows.forEach((row) => {
    const keys = Object.keys(row);
    let nama = '';
    let nokk = '';

    const nokkKey = findKey(keys, ['NOKK', 'NO KK', 'NO_KK', 'NOMOR KK', 'NOMOR_KK']);
    const namaKey = findKey(keys, ['NAMA', 'NAMA PENGURUS', 'NAMA_PENGURUS']);

    if (nokkKey && namaKey) {
      // Format kolom terpisah
      nama = (row[namaKey] || '').toString().trim();
      nokk = extractNokk(row[nokkKey]);
    } else {
      // Format digabung 1 sel (kolom PENGURUS)
      const pengurusKey = findKey(keys, ['PENGURUS']);
      const raw = pengurusKey ? (row[pengurusKey] || '').toString() : '';
      const lineParts = raw.split('\n').map((p) => p.trim()).filter(Boolean);

      if (lineParts.length >= 2) {
        // dipisah enter: baris 1 = nama, baris 2 = NOKK
        nama = lineParts[0];
        nokk = extractNokk(lineParts[1]);
      } else {
        // dipisah spasi (atau cuma 1 baris): cari token 16 digit sebagai NOKK,
        // sisanya digabung jadi nama
        const tokens = raw.split(/\s+/).filter(Boolean);
        const nokkToken = tokens.find((t) => /^\d{16}$/.test(t));
        if (nokkToken) {
          nokk = nokkToken;
          nama = tokens.filter((t) => t !== nokkToken).join(' ');
        } else {
          nama = raw.trim();
        }
      }
    }

    if (!nokk) return;

    const komponenAktif = KOMPONEN_FIELDS.filter((f) => {
      const key = findKey(keys, [f]);
      const val = key ? row[key] : 0;
      return Number(val) > 0;
    }).map((f) => {
      const key = findKey(keys, [f]);
      return { nama: f, jumlah: Number(row[key]) };
    });

    const nominalKey = findKey(keys, ['NOMINAL']);

    byNokk[nokk] = {
      NAMA: nama,
      komponen: komponenAktif,
      nominal: nominalKey ? (row[nominalKey] || '').toString() : '',
    };
  });

  return byNokk;
}

/**
 * Parse satu file Final Closing dari ArrayBuffer, semua sheet di dalamnya digabung.
 *
 * CATATAN PERFORMA: library `xlsx` (~500KB-1MB) sengaja di-import secara dinamis
 * di sini (bukan di top-level file) supaya TIDAK ikut ter-bundle ke JS halaman
 * manapun yang meng-import file ini. Library baru benar-benar di-download oleh
 * browser saat fungsi ini dipanggil (klik "Import Final Closing"), bukan setiap
 * kali halaman Data KPM dibuka. Ini penting karena halaman itu paling sering
 * diakses pendamping dari HP dengan koneksi terbatas di lapangan.
 */
export async function parseFinalClosingWorkbook(arrayBuffer) {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  let combined = {};
  wb.SheetNames.forEach((sheetName) => {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });
    combined = { ...combined, ...parseSheet(rows) };
  });
  return combined;
}

/** Gabungkan beberapa hasil parse (dari beberapa file sekaligus) jadi satu. */
export function mergeFinalClosingMaps(maps) {
  return maps.reduce((acc, m) => ({ ...acc, ...m }), {});
}

export const KOMPONEN_ICON_MAP = {
  AUD: '👶',
  SD: '🎒',
  SMP: '📘',
  SMA: '🎓',
  DISABILITAS: '♿',
  LANSIA: '👵',
  HAMIL: '🤰',
  HAM: '👤',
};
