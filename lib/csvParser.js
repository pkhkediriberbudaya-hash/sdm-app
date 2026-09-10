// Parser CSV yang fleksibel: mendeteksi delimiter otomatis (file SIKS-NG biasanya
// pakai '|' meski berekstensi .csv, tapi bisa juga koma/titik-koma) dan mencocokkan
// nama kolom dari beberapa kemungkinan penulisan yang berbeda-beda.

const DELIMITER_CANDIDATES = ['|', ',', ';', '\t'];

function detectDelimiter(firstLine) {
  let best = ',';
  let bestCount = 0;
  for (const d of DELIMITER_CANDIDATES) {
    const count = firstLine.split(d).length;
    if (count > bestCount) {
      bestCount = count;
      best = d;
    }
  }
  return best;
}

function parseLine(line, delimiter) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map((v) => v.trim());
}

export function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseLine(lines[0], delimiter);
  const rows = lines.slice(1).map((line) => {
    const values = parseLine(line, delimiter);
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = values[i] ?? '';
    });
    return obj;
  });

  return { headers, rows, delimiter };
}

// Kemungkinan nama kolom untuk tiap field baku KPM (case-insensitive, spasi/underscore diabaikan)
const COLUMN_ALIASES = {
  NOKK: ['nokk', 'no_kk', 'nokk_kpm', 'nomorkk'],
  NIK: ['nik'],
  NAMA: ['nama_penerima', 'nama', 'namakpm', 'nama_kpm'],
  BANK: ['penyaluran_oleh', 'bank', 'nama_bank'],
  KECAMATAN_SUMBER: ['kec_name', 'kecamatan'],
  DESA: ['kel_name', 'desa', 'kelurahan', 'nama_desa'],
  ALAMAT: ['alamat'],
  STATUS_PENYALURAN: ['status', 'status_penyaluran'],
  KODE_BATCH: ['kode_batch_penyaluran', 'kode_batch', 'batch'],
};

const REQUIRED_FIELDS = ['NOKK', 'NAMA', 'DESA'];

function normalize(s) {
  return s.trim().toLowerCase().replace(/[\s_]+/g, '');
}

/**
 * Mencocokkan header CSV asli ke field baku KPM.
 * Return { mapping: { NOKK: 'NOKK asli di file', ... }, missing: [field yg tak ketemu] }
 */
export function mapColumns(headers) {
  const normalizedHeaders = headers.map((h) => ({ original: h, norm: normalize(h) }));
  const mapping = {};

  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    const found = normalizedHeaders.find((h) => aliases.includes(h.norm));
    if (found) mapping[field] = found.original;
  }

  const missing = REQUIRED_FIELDS.filter((f) => !mapping[f]);
  return { mapping, missing };
}

/** Mengubah baris CSV mentah menjadi objek field baku KPM, siap dikirim ke API. */
export function normalizeRows(rows, mapping) {
  return rows.map((row) => ({
    NOKK: mapping.NOKK ? row[mapping.NOKK] : '',
    NIK: mapping.NIK ? row[mapping.NIK] : '',
    NAMA: mapping.NAMA ? row[mapping.NAMA] : '',
    BANK: mapping.BANK ? row[mapping.BANK] : '',
    DESA: mapping.DESA ? row[mapping.DESA] : '',
    ALAMAT: mapping.ALAMAT ? row[mapping.ALAMAT] : '',
    STATUS_PENYALURAN: mapping.STATUS_PENYALURAN ? row[mapping.STATUS_PENYALURAN] : '',
    KODE_BATCH: mapping.KODE_BATCH ? row[mapping.KODE_BATCH] : '',
  }));
}

/** Menebak label Tahap berjalan dari tanggal hari ini (kuartal Jan-Mar=1, dst). */
export function guessTahap(date = new Date()) {
  const month = date.getMonth() + 1; // 1-12
  const year = date.getFullYear();
  if (month <= 3) return `TAHAP 1 (JAN-MAR ${year})`;
  if (month <= 6) return `TAHAP 2 (APR-JUN ${year})`;
  if (month <= 9) return `TAHAP 3 (JUL-SEP ${year})`;
  return `TAHAP 4 (OKT-DES ${year})`;
}
