import * as XLSX from 'xlsx';

const KOMPONEN_FIELDS = ['AUD', 'SD', 'SMP', 'SMA', 'DISABILITAS', 'LANSIA', 'HAMIL', 'HAM'];

/**
 * Parse file Excel "Final Closing" yang formatnya: kolom PENGURUS berisi
 * "NAMA\nNOKK" (digabung 1 sel), lalu kolom komponen (AUD/SD/SMP/SMA/dst) dan
 * NOMINAL. Return objek { [NOKK]: { NAMA, komponen: [...], NOMINAL } }.
 */
export function parseFinalClosingWorkbook(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  const byNokk = {};

  rows.forEach((row) => {
    const pengurusKey = Object.keys(row).find((k) => k.trim().toUpperCase() === 'PENGURUS');
    const raw = pengurusKey ? row[pengurusKey].toString() : '';
    const parts = raw
      .split('\n')
      .map((p) => p.trim())
      .filter(Boolean);
    const nama = parts[0] || '';
    const nokk = (parts[1] || '').replace(/\D/g, '');
    if (!nokk) return;

    const komponenAktif = KOMPONEN_FIELDS.filter((f) => {
      const key = Object.keys(row).find((k) => k.trim().toUpperCase() === f);
      const val = key ? row[key] : 0;
      return Number(val) > 0;
    }).map((f) => {
      const key = Object.keys(row).find((k) => k.trim().toUpperCase() === f);
      return { nama: f, jumlah: Number(row[key]) };
    });

    const nominalKey = Object.keys(row).find((k) => k.trim().toUpperCase() === 'NOMINAL');

    byNokk[nokk] = {
      NAMA: nama,
      komponen: komponenAktif,
      nominal: nominalKey ? row[nominalKey].toString() : '',
    };
  });

  return byNokk;
}
