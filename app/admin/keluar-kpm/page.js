'use client';

import { useEffect, useState, useMemo } from 'react';

export default function KeluarKpmPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('Graduasi Mandiri');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/admin/data/LogKeluarKPM')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError('Sheet "LogKeluarKPM" belum ada — akan otomatis dibuat setelah ada submit pertama dari pendamping.');
        } else {
          setRecords(data.records || []);
        }
      })
      .catch(() => setError('Gagal memuat data.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = records.filter((r) => r.JENIS === tab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          (r.NAMA_KPM || '').toLowerCase().includes(q) ||
          (r.NAMA_PENDAMPING || '').toLowerCase().includes(q) ||
          (r.KECAMATAN || '').toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => new Date(b.TANGGAL) - new Date(a.TANGGAL));
  }, [records, tab, search]);

  const countGraduasi = records.filter((r) => r.JENIS === 'Graduasi Mandiri').length;
  const countPpse = records.filter((r) => r.JENIS === 'PPSE').length;

  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-xl font-bold text-brand-800 mb-1">📤 PPSE & Graduasi</h1>
      <p className="text-sm text-brand-400 mb-6">
        Rekap submit Graduasi Mandiri dan PPSE dari seluruh pendamping, real-time begitu mereka
        submit lewat aplikasi.
      </p>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('Graduasi Mandiri')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            tab === 'Graduasi Mandiri' ? 'bg-brand-600 text-white' : 'bg-white border border-brand-100 text-brand-700'
          }`}
        >
          Graduasi Mandiri ({countGraduasi})
        </button>
        <button
          onClick={() => setTab('PPSE')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            tab === 'PPSE' ? 'bg-brand-600 text-white' : 'bg-white border border-brand-100 text-brand-700'
          }`}
        >
          PPSE ({countPpse})
        </button>
      </div>

      <input
        className="input max-w-sm mb-4"
        placeholder="Cari nama KPM / pendamping / kecamatan..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {error && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      <div className="card overflow-x-auto">
        {loading ? (
          <p className="p-6 text-brand-400">Memuat...</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-brand-400">Belum ada data.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-100 text-left">
                <th className="px-4 py-3 font-semibold text-brand-800 whitespace-nowrap">Tanggal</th>
                <th className="px-4 py-3 font-semibold text-brand-800 whitespace-nowrap">Nama KPM</th>
                <th className="px-4 py-3 font-semibold text-brand-800 whitespace-nowrap">NOKK</th>
                <th className="px-4 py-3 font-semibold text-brand-800 whitespace-nowrap">Kecamatan</th>
                <th className="px-4 py-3 font-semibold text-brand-800 whitespace-nowrap">Desa</th>
                <th className="px-4 py-3 font-semibold text-brand-800 whitespace-nowrap">Pendamping</th>
                <th className="px-4 py-3 font-semibold text-brand-800 whitespace-nowrap">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.ID} className="border-b border-brand-50 hover:bg-brand-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {new Date(r.TANGGAL).toLocaleString('id-ID')}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap font-medium text-brand-800">{r.NAMA_KPM}</td>
                  <td className="px-4 py-3 whitespace-nowrap font-mono text-xs">{r.NOKK}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{r.KECAMATAN}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{r.DESA}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{r.NAMA_PENDAMPING}</td>
                  <td className="px-4 py-3 max-w-[220px] truncate">{r.KETERANGAN || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
