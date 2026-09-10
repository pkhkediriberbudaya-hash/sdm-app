'use client';

import { useState } from 'react';
import { WILAYAH_KEDIRI } from '@/lib/wilayahKediri';
import { parseCsv, mapColumns, normalizeRows, guessTahap } from '@/lib/csvParser';

export default function KpmUploadPage() {
  const kecamatanList = Object.keys(WILAYAH_KEDIRI).sort();

  const [kecamatan, setKecamatan] = useState('');
  const [tahap, setTahap] = useState(guessTahap());
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState(null); // { headers, rows, mapping, missing }
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setResult(null);
    setFileName(file.name);

    // Tebakan kecamatan dari nama file kalau namanya mengandung nama kecamatan
    const guess = kecamatanList.find((k) =>
      file.name.toLowerCase().includes(k.toLowerCase())
    );
    if (guess) setKecamatan(guess);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target.result;
        const { headers, rows } = parseCsv(text);
        const { mapping, missing } = mapColumns(headers);
        setParsed({ headers, rows, mapping, missing });
      } catch {
        setError('Gagal membaca file. Pastikan formatnya CSV yang benar.');
        setParsed(null);
      }
    };
    reader.readAsText(file);
  }

  async function handleSubmit() {
    if (!kecamatan) {
      setError('Pilih kecamatan tujuan dulu.');
      return;
    }
    if (!parsed || parsed.missing.length > 0) {
      setError('Ada kolom wajib yang belum terpetakan. Periksa lagi file CSV-nya.');
      return;
    }
    setSubmitting(true);
    setError('');
    setResult(null);
    try {
      const normalizedRows = normalizeRows(parsed.rows, parsed.mapping);
      const res = await fetch('/api/admin/kpm-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kecamatan, tahap, rows: normalizedRows }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Gagal memproses import');
      } else {
        setResult(data);
        setParsed(null);
        setFileName('');
      }
    } catch {
      setError('Gagal terhubung ke server.');
    } finally {
      setSubmitting(false);
    }
  }

  const fieldLabels = {
    NOKK: 'NOKK (wajib)',
    NIK: 'NIK',
    NAMA: 'Nama (wajib)',
    BANK: 'Bank Penyalur',
    DESA: 'Desa/Kelurahan (wajib)',
    ALAMAT: 'Alamat',
    STATUS_PENYALURAN: 'Status Penyaluran',
    KODE_BATCH: 'Kode Batch',
  };

  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-xl font-bold text-navy-700 mb-1">📥 Upload Data KPM</h1>
      <p className="text-sm text-navy-400 mb-6">
        Upload file CSV hasil unduhan SIKS-NG per kecamatan. Data akan digabung ke tab{' '}
        <code>KPM_[Kecamatan]</code> — KPM baru ditambahkan, yang sudah ada diperbarui,
        yang tidak muncul lagi di file ini otomatis tidak terhitung aktif (datanya tetap
        tersimpan, tidak dihapus).
      </p>

      <div className="card p-5 max-w-2xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Kecamatan Tujuan</label>
            <select
              className="input"
              value={kecamatan}
              onChange={(e) => setKecamatan(e.target.value)}
            >
              <option value="">-- Pilih Kecamatan --</option>
              {kecamatanList.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Label Tahap</label>
            <input
              className="input"
              value={tahap}
              onChange={(e) => setTahap(e.target.value)}
              placeholder='Misal: TAHAP 4 (OKT-DES 2026)'
            />
            <p className="text-xs text-navy-400 mt-1">
              Tebakan otomatis dari tanggal hari ini — boleh diganti manual.
            </p>
          </div>
        </div>

        <div>
          <label className="label">File CSV</label>
          <input
            type="file"
            accept=".csv,.txt"
            onChange={handleFile}
            className="input"
          />
          {fileName && <p className="text-xs text-navy-400 mt-1">File: {fileName}</p>}
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {parsed && (
          <div className="border border-navy-100 rounded-lg p-4 space-y-3">
            <p className="text-sm text-navy-700 font-semibold">
              Terbaca {parsed.rows.length} baris, {parsed.headers.length} kolom.
            </p>

            <div>
              <p className="text-xs font-semibold text-navy-400 uppercase mb-1">
                Pemetaan Kolom
              </p>
              <ul className="text-sm space-y-1">
                {Object.entries(fieldLabels).map(([field, label]) => (
                  <li key={field} className="flex justify-between">
                    <span className="text-navy-600">{label}</span>
                    <span
                      className={
                        parsed.mapping[field] ? 'text-green-700' : 'text-red-600'
                      }
                    >
                      {parsed.mapping[field] || 'tidak ditemukan'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {parsed.missing.length > 0 && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                Kolom wajib belum ketemu: {parsed.missing.join(', ')}. Import tidak bisa
                dilanjutkan sampai ini teratasi (mungkin nama kolom di file berbeda dari
                yang dikenali sistem).
              </p>
            )}

            {parsed.rows.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-navy-400 uppercase mb-1">
                  Contoh 3 Baris Pertama
                </p>
                <div className="overflow-x-auto">
                  <table className="text-xs w-full">
                    <thead>
                      <tr>
                        {parsed.headers.map((h) => (
                          <th key={h} className="text-left pr-3 py-1 text-navy-600">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.rows.slice(0, 3).map((row, i) => (
                        <tr key={i}>
                          {parsed.headers.map((h) => (
                            <td key={h} className="pr-3 py-1 whitespace-nowrap">
                              {row[h]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {result && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
            Import selesai ke <b>{result.sheetName}</b>: {result.added} KPM baru,{' '}
            {result.updated} diperbarui, total sekarang {result.total} baris
            {result.skipped > 0 ? ` (${result.skipped} baris dilewati karena NOKK kosong)` : ''}.
          </p>
        )}

        <button
          className="btn-primary w-full"
          onClick={handleSubmit}
          disabled={!parsed || parsed.missing.length > 0 || !kecamatan || submitting}
        >
          {submitting ? 'Memproses...' : 'Proses Import'}
        </button>
      </div>
    </div>
  );
}
