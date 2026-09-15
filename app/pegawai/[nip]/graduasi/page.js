'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';

const ASSESSMENT_STATUS = 'Calon PPSE (Assessment SIKSMO)';

export default function GraduasiPage() {
  const [desaRecords, setDesaRecords] = useState([]);
  const [kecamatanOptions, setKecamatanOptions] = useState([]);
  const [selectedKecamatan, setSelectedKecamatan] = useState('');

  const [kpmRecords, setKpmRecords] = useState([]);
  const [loadingKpm, setLoadingKpm] = useState(false);

  const [search, setSearch] = useState('');
  const [selectedKpm, setSelectedKpm] = useState(null);

  const [jenis, setJenis] = useState('Graduasi Mandiri');
  const [keterangan, setKeterangan] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const [riwayat, setRiwayat] = useState([]);
  const [loadingRiwayat, setLoadingRiwayat] = useState(true);
  const [tarikLoadingId, setTarikLoadingId] = useState(null);

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

  const filteredKpm = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return kpmRecords
      .filter(
        (r) =>
          (r.NAMA || '').toLowerCase().includes(q) ||
          (r.NOKK || '').toLowerCase().includes(q) ||
          (r.DESA || '').toLowerCase().includes(q)
      )
      .slice(0, 15);
  }, [kpmRecords, search]);

  function selectKpm(r) {
    setSelectedKpm(r);
    setSearch('');
    setMessage(null);
    setJenis('Graduasi Mandiri');
  }

  async function handleSubmit(tahap) {
    if (!selectedKpm) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/kpm/keluar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kecamatan: selectedKecamatan,
          nokk: selectedKpm.NOKK,
          jenis,
          tahap,
          keterangan,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Gagal submit.' });
      } else {
        setMessage({ type: 'success', text: `${selectedKpm.NAMA} berhasil diperbarui.` });
        setSelectedKpm({ ...selectedKpm, STATUS_KEPESERTAAN: data.status });
        setKeterangan('');
        loadKpm(selectedKecamatan);
        loadRiwayat();
      }
    } catch {
      setMessage({ type: 'error', text: 'Butuh koneksi internet untuk submit (belum bisa offline).' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTarikKembali(row) {
    if (!confirm(`Tarik kembali submission untuk ${row.NAMA_KPM}? Status akan dikembalikan ke Aktif.`)) return;
    setTarikLoadingId(row.ID);
    try {
      await fetch('/api/kpm/tarik-kembali', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kecamatan: row.KECAMATAN, nokk: row.NOKK }),
      });
      loadRiwayat();
      if (selectedKecamatan === row.KECAMATAN) loadKpm(selectedKecamatan);
    } finally {
      setTarikLoadingId(null);
    }
  }

  const isAssessed = selectedKpm?.STATUS_KEPESERTAAN === ASSESSMENT_STATUS;

  return (
    <div className="px-4 py-6 pb-16 max-w-3xl mx-auto space-y-6">
      <div className="card p-5">
        <h2 className="text-brand-800 font-bold mb-1">📤 Submit Graduasi Mandiri / PPSE</h2>
        <p className="text-sm text-brand-400 mb-4">
          Cari lalu pilih KPM dari tabel (bukan cuma nama) supaya tidak salah orang — banyak nama
          yang sama.
        </p>

        {kecamatanOptions.length > 1 && (
          <div className="mb-3">
            <label className="label">Kecamatan</label>
            <select
              className="input"
              value={selectedKecamatan}
              onChange={(e) => {
                setSelectedKecamatan(e.target.value);
                setSelectedKpm(null);
              }}
            >
              {kecamatanOptions.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
        )}

        {!selectedKpm ? (
          <>
            <input
              className="input mb-3"
              placeholder={loadingKpm ? 'Memuat data KPM...' : 'Cari nama / NOKK / desa...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={loadingKpm}
            />
            {search.trim() && (
              <div className="border border-brand-100 rounded-lg overflow-hidden">
                {filteredKpm.length === 0 ? (
                  <p className="p-3 text-sm text-brand-400">Tidak ditemukan.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-brand-50 text-left">
                        <th className="px-3 py-2 font-semibold text-brand-700">Nama</th>
                        <th className="px-3 py-2 font-semibold text-brand-700">NOKK</th>
                        <th className="px-3 py-2 font-semibold text-brand-700">Desa</th>
                        <th className="px-3 py-2 font-semibold text-brand-700">Kelompok</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredKpm.map((r) => (
                        <tr key={r.NOKK} className="border-t border-brand-50 hover:bg-brand-50">
                          <td className="px-3 py-2 font-medium text-brand-800">{r.NAMA}</td>
                          <td className="px-3 py-2 font-mono text-xs">{r.NOKK}</td>
                          <td className="px-3 py-2">{r.DESA}</td>
                          <td className="px-3 py-2">{r.KELOMPOK || '-'}</td>
                          <td className="px-3 py-2 text-right">
                            <button
                              className="btn-ghost text-xs px-2 py-1"
                              onClick={() => selectKpm(r)}
                            >
                              Pilih
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div className="bg-brand-50 rounded-lg p-4 flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-brand-800">{selectedKpm.NAMA}</p>
                <p className="text-xs text-brand-500">
                  NOKK: {selectedKpm.NOKK} · {selectedKpm.DESA}
                  {selectedKpm.KELOMPOK ? ` · ${selectedKpm.KELOMPOK}` : ''}
                </p>
                <p className="text-xs text-brand-500 mt-1">
                  Status saat ini: <b>{selectedKpm.STATUS_KEPESERTAAN || 'Aktif'}</b>
                </p>
              </div>
              <button className="btn-ghost text-xs shrink-0" onClick={() => setSelectedKpm(null)}>
                Ganti Pilihan
              </button>
            </div>

            <div>
              <label className="label">Jenis</label>
              <select className="input" value={jenis} onChange={(e) => setJenis(e.target.value)}>
                <option value="Graduasi Mandiri">Graduasi Mandiri</option>
                <option value="PPSE">PPSE</option>
              </select>
            </div>

            <div>
              <label className="label">Keterangan (opsional)</label>
              <textarea
                className="input"
                rows={2}
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
              />
            </div>

            {jenis === 'Graduasi Mandiri' ? (
              <button
                className="btn-accent w-full"
                onClick={() => handleSubmit('Final')}
                disabled={submitting}
              >
                {submitting ? 'Mengirim...' : 'Submit Graduasi Mandiri'}
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-brand-400">
                  PPSE punya 2 langkah — langkah 2 baru aktif setelah langkah 1 selesai.
                </p>
                <button
                  className={`w-full rounded-lg py-2.5 font-semibold text-sm ${
                    isAssessed
                      ? 'bg-green-100 text-green-700 cursor-default'
                      : 'btn-accent'
                  }`}
                  onClick={() => !isAssessed && handleSubmit('Assessment SIKSMO')}
                  disabled={submitting || isAssessed}
                >
                  {isAssessed ? '✓ 1. Sudah Assessment SIKSMO' : '1. Sudah Assessment SIKSMO'}
                </button>
                <button
                  className="btn-primary w-full"
                  onClick={() => handleSubmit('Realisasi Penyaluran')}
                  disabled={submitting || !isAssessed}
                >
                  {submitting ? 'Mengirim...' : '2. Realisasi Penyaluran (Resmi Graduasi)'}
                </button>
                {!isAssessed && (
                  <p className="text-xs text-amber-700">
                    Selesaikan langkah 1 dulu sebelum bisa submit Realisasi Penyaluran.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

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
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-brand-800">{r.NAMA_KPM}</p>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 ${
                        r.JENIS === 'Dibatalkan'
                          ? 'bg-red-100 text-red-700'
                          : r.JENIS === 'PPSE'
                          ? 'bg-brand-100 text-brand-600'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {r.JENIS}
                    </span>
                  </div>
                  <p className="text-xs text-brand-400">
                    {r.DESA}, {r.KECAMATAN} · {r.TAHAP} ·{' '}
                    {new Date(r.TANGGAL).toLocaleString('id-ID')}
                  </p>
                  {r.KETERANGAN && <p className="text-xs text-brand-500 mt-1">{r.KETERANGAN}</p>}
                  {r.JENIS !== 'Dibatalkan' && (
                    <button
                      className="text-xs text-red-600 underline mt-1"
                      onClick={() => handleTarikKembali(r)}
                      disabled={tarikLoadingId === r.ID}
                    >
                      {tarikLoadingId === r.ID ? 'Memproses...' : '↩ Tarik Kembali'}
                    </button>
                  )}
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}
