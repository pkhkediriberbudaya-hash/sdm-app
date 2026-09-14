'use client';

import { useEffect, useState, useCallback } from 'react';

export default function GraduasiPage() {
  const [desaRecords, setDesaRecords] = useState([]);
  const [kecamatanOptions, setKecamatanOptions] = useState([]);
  const [selectedKecamatan, setSelectedKecamatan] = useState('');

  const [kpmRecords, setKpmRecords] = useState([]);
  const [loadingKpm, setLoadingKpm] = useState(false);

  const [keluarNama, setKeluarNama] = useState('');
  const [keluarJenis, setKeluarJenis] = useState('Graduasi Mandiri');
  const [keluarKeterangan, setKeluarKeterangan] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const [riwayat, setRiwayat] = useState([]);
  const [loadingRiwayat, setLoadingRiwayat] = useState(true);

  useEffect(() => {
    fetch('/api/desa')
      .then((r) => r.json())
      .then((d) => {
        const list = d.records || [];
        setDesaRecords(list);
        const kecs = Array.from(new Set(list.map((x) => x.KECAMATAN))).sort();
        setKecamatanOptions(kecs);
        if (kecs.length > 0) setSelectedKecamatan(kecs[0]);
      });

    loadRiwayat();
  }, []);

  const loadRiwayat = useCallback(() => {
    setLoadingRiwayat(true);
    fetch('/api/kpm/riwayat-keluar')
      .then((r) => r.json())
      .then((d) => setRiwayat(d.records || []))
      .finally(() => setLoadingRiwayat(false));
  }, []);

  const loadKpm = useCallback(async (kecamatan) => {
    if (!kecamatan) return;
    setLoadingKpm(true);
    try {
      const res = await fetch(`/api/kpm?kecamatan=${encodeURIComponent(kecamatan)}`);
      const data = await res.json();
      setKpmRecords(data.records || []);
    } catch {
      setKpmRecords([]);
    } finally {
      setLoadingKpm(false);
    }
  }, []);

  useEffect(() => {
    if (selectedKecamatan) loadKpm(selectedKecamatan);
  }, [selectedKecamatan, loadKpm]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!keluarNama.trim()) return;
    const match = kpmRecords.find(
      (r) => r.NAMA.toLowerCase() === keluarNama.trim().toLowerCase()
    );
    if (!match) {
      setMessage({ type: 'error', text: 'Nama tidak ditemukan di data KPM kecamatan ini. Buka Data KPM dan unduh dulu kalau belum.' });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/kpm/keluar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kecamatan: selectedKecamatan,
          nokk: match.NOKK,
          jenis: keluarJenis,
          keterangan: keluarKeterangan,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Gagal submit.' });
      } else {
        setMessage({ type: 'success', text: `${match.NAMA} berhasil disubmit sebagai ${keluarJenis}.` });
        setKeluarNama('');
        setKeluarKeterangan('');
        loadKpm(selectedKecamatan);
        loadRiwayat();
      }
    } catch {
      setMessage({ type: 'error', text: 'Butuh koneksi internet untuk submit (belum bisa offline).' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="px-4 py-6 pb-16 max-w-3xl mx-auto space-y-6">
      <div className="card p-5">
        <h2 className="text-brand-800 font-bold mb-1">📤 Submit Graduasi Mandiri / PPSE</h2>
        <p className="text-sm text-brand-400 mb-4">
          Langsung terkirim ke server dan tercatat di rekap admin. Butuh koneksi internet.
        </p>

        <div className="mb-3">
          <label className="label">Kecamatan</label>
          <select
            className="input"
            value={selectedKecamatan}
            onChange={(e) => setSelectedKecamatan(e.target.value)}
          >
            {kecamatanOptions.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input
            className="input sm:col-span-2"
            list="graduasi-nama-suggestions"
            placeholder={loadingKpm ? 'Memuat data KPM...' : 'Ketik nama KPM...'}
            value={keluarNama}
            onChange={(e) => setKeluarNama(e.target.value)}
          />
          <datalist id="graduasi-nama-suggestions">
            {kpmRecords.map((r) => (
              <option key={r.NOKK} value={r.NAMA} />
            ))}
          </datalist>
          <select className="input" value={keluarJenis} onChange={(e) => setKeluarJenis(e.target.value)}>
            <option value="Graduasi Mandiri">Graduasi Mandiri</option>
            <option value="PPSE">PPSE</option>
          </select>
          <button className="btn-accent" disabled={submitting || !keluarNama.trim()}>
            {submitting ? 'Mengirim...' : 'Submit'}
          </button>
          <input
            className="input sm:col-span-4"
            placeholder="Keterangan (opsional)"
            value={keluarKeterangan}
            onChange={(e) => setKeluarKeterangan(e.target.value)}
          />
        </form>

        {message && (
          <p
            className={`text-sm mt-3 rounded-lg px-3 py-2 border ${
              message.type === 'success'
                ? 'text-green-700 bg-green-50 border-green-100'
                : 'text-red-600 bg-red-50 border-red-100'
            }`}
          >
            {message.text}
          </p>
        )}
      </div>

      <div className="card p-5">
        <h2 className="text-brand-800 font-bold mb-4">Riwayat Submit Saya</h2>
        {loadingRiwayat ? (
          <p className="text-sm text-brand-400">Memuat...</p>
        ) : riwayat.length === 0 ? (
          <p className="text-sm text-brand-400">Belum pernah submit.</p>
        ) : (
          <ul className="divide-y divide-brand-100">
            {riwayat
              .sort((a, b) => new Date(b.TANGGAL) - new Date(a.TANGGAL))
              .map((r) => (
                <li key={r.ID} className="py-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-brand-800">{r.NAMA_KPM}</p>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        r.JENIS === 'PPSE' ? 'bg-brand-100 text-brand-600' : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {r.JENIS}
                    </span>
                  </div>
                  <p className="text-xs text-brand-400">
                    {r.DESA}, {r.KECAMATAN} · {new Date(r.TANGGAL).toLocaleString('id-ID')}
                  </p>
                  {r.KETERANGAN && <p className="text-xs text-brand-500 mt-1">{r.KETERANGAN}</p>}
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}
