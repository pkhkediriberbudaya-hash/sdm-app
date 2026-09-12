'use client';

import { useState } from 'react';
import { WILAYAH_KEDIRI } from '@/lib/wilayahKediri';
import { parseCsv, mapColumns, normalizeRows } from '@/lib/csvParser';

const TAHAP_MONTHS = { 1: 'JAN-MAR', 2: 'APR-JUN', 3: 'JUL-SEP', 4: 'OKT-DES' };

function currentDefaults() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const tahapNum = month <= 3 ? 1 : month <= 6 ? 2 : month <= 9 ? 3 : 4;
  return { tahapNum, year: now.getFullYear() };
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

export default function KpmUploadPage() {
  const kecamatanList = Object.keys(WILAYAH_KEDIRI).sort();
  const defaults = currentDefaults();

  const [kecamatan, setKecamatan] = useState('');
  const [tahapNum, setTahapNum] = useState(defaults.tahapNum);
  const [tahunTahap, setTahunTahap] = useState(defaults.year);
  const tahapLabel = `TAHAP ${tahapNum} (${TAHAP_MONTHS[tahapNum]} ${tahunTahap})`;

  const [fileResults, setFileResults] = useState([]); // [{name, headers, rows, mapping, missing}]
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const yearOptions = [tahunTahap - 1, tahunTahap, tahunTahap + 1];

  async function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setError('');
    setResult(null);

    const guess = kecamatanList.find((k) =>
      files.some((f) => f.name.toLowerCase().includes(k.toLowerCase()))
    );
    if (guess) setKecamatan(guess);

    try {
      const results = await Promise.all(
        files.map(async (file) => {
          const text = await readFileAsText(file);
          const { headers, rows } = parseCsv(text);
          const { mapping, missing } = mapColumns(headers);
          return { name: file.name, headers, rows, mapping, missing };
        })
      );
      setFileResults(results);
    } catch {
      setError('Gagal membaca salah satu file. Pastikan semua file berformat CSV yang benar.');
      setFileResults([]);
    }
  }

  const validFiles = fileResults.filter((f) => f.missing.length === 0);
  const invalidFiles = fileResults.filter((f) => f.missing.length > 0);
  const totalRows = validFiles.reduce((sum, f) => sum + f.rows.length, 0);

  async function handleSubmit() {
    if (!kecamatan) {
      setError('Pilih kecamatan tujuan dulu.');
      return;
    }
    if (validFiles.length === 0) {
      setError('Tidak ada file valid untuk diproses.');
      return;
    }
    setSubmitting(true);
    setError('');
    setResult(null);
    try {
      const combinedRows = validFiles.flatMap((f) => normalizeRows(f.rows, f.mapping));
      const res = await fetch('/api/admin/kpm-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kecamatan, tahap: tahapLabel, rows: combinedRows }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Gagal memproses import');
      } else {
        setResult(data);
        setFileResults([]);
      }
    } catch {
      setError('Gagal terhubung ke server.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-xl font-bold text-brand-800 mb-1">📥 Upload Data KPM</h1>
      <p className="text-sm text-brand-400 mb-6">
        Bisa upload lebih dari satu file CSV sekaligus untuk kecamatan yang sama (misal per bank
        penyalur / per batch) — semua akan digabung jadi satu sebelum disimpan.
      </p>

      <div className="card p-5 max-w-2xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-1">
            <label className="label">Kecamatan Tujuan</label>
            <select className="input" value={kecamatan} onChange={(e) => setKecamatan(e.target.value)}>
              <option value="">-- Pilih --</option>
              {kecamatanList.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Tahap</label>
            <select
              className="input"
              value={tahapNum}
              onChange={(e) => setTahapNum(Number(e.target.value))}
            >
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  Tahap {n} ({TAHAP_MONTHS[n]})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Tahun</label>
            <select
              className="input"
              value={tahunTahap}
              onChange={(e) => setTahunTahap(Number(e.target.value))}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-xs text-brand-400 -mt-2">
          Label yang tersimpan: <b>{tahapLabel}</b>
        </p>

        <div>
          <label className="label">File CSV (boleh pilih beberapa sekaligus)</label>
          <input type="file" accept=".csv,.txt" multiple onChange={handleFiles} className="input" />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {fileResults.length > 0 && (
          <div className="border border-brand-100 rounded-lg p-4 space-y-3">
            <p className="text-sm text-brand-800 font-semibold">
              {fileResults.length} file terbaca, total {totalRows} baris siap diproses dari{' '}
              {validFiles.length} file valid.
            </p>
            <ul className="text-sm space-y-2">
              {fileResults.map((f) => (
                <li key={f.name} className="border-b border-brand-50 pb-2 last:border-0">
                  <p className="font-medium text-brand-700">{f.name}</p>
                  <p className="text-xs text-brand-400">{f.rows.length} baris</p>
                  {f.missing.length > 0 ? (
                    <p className="text-xs text-red-600">
                      ❌ Kolom wajib tidak ketemu: {f.missing.join(', ')} — file ini dilewati
                    </p>
                  ) : (
                    <p className="text-xs text-green-700">✓ Kolom lengkap, siap diproses</p>
                  )}
                </li>
              ))}
            </ul>
            {invalidFiles.length > 0 && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                {invalidFiles.length} file dilewati karena kolom wajib tidak lengkap. File lainnya
                tetap bisa diproses.
              </p>
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
          disabled={validFiles.length === 0 || !kecamatan || submitting}
        >
          {submitting ? 'Memproses...' : `Proses Import (${validFiles.length} file)`}
        </button>
      </div>
    </div>
  );
}
