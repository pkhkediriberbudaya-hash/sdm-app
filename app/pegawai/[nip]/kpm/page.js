'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  saveKpmCache,
  loadKpmCache,
  queueChange,
  getQueue,
  flushQueue,
  applyChangeToCache,
} from '@/lib/offlineStorage';

const STATUS_OPTIONS = [
  'Aktif',
  'Pengaduan',
  'Calon Graduasi Mandiri',
  'Calon PPSE',
  'Sukses Graduasi Mandiri',
  'Sukses PPSE',
];

const STATUS_CHIPS = [
  { key: 'Aktif', label: 'Aktif', match: (s) => s === 'Aktif' || !s },
  { key: 'Pengaduan', label: 'Pengaduan', match: (s) => s === 'Pengaduan' },
  { key: 'Graduasi', label: 'Graduasi', match: (s) => (s || '').includes('Graduasi') },
  { key: 'PPSE', label: 'PPSE', match: (s) => (s || '').includes('PPSE') },
];

export default function DataKpmPage() {
  const params = useParams();
  const router = useRouter();
  const nip = decodeURIComponent(params.nip);

  const [desaRecords, setDesaRecords] = useState([]);
  const [loadingDesa, setLoadingDesa] = useState(true);
  const [selectedKecamatan, setSelectedKecamatan] = useState('');

  const [records, setRecords] = useState([]);
  const [loadingKpm, setLoadingKpm] = useState(false);
  const [syncedAt, setSyncedAt] = useState(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const [masterKelompok, setMasterKelompok] = useState([]);

  const [search, setSearch] = useState('');
  const [desaFilter, setDesaFilter] = useState('');
  const [kelompokFilter, setKelompokFilter] = useState('');
  const [statusChip, setStatusChip] = useState(null);

  const [selectedKpm, setSelectedKpm] = useState(null);
  const [editForm, setEditForm] = useState({ KELOMPOK: '', STATUS_KEPESERTAAN: '', CATATAN: '' });
  const [saving, setSaving] = useState(false);

  const [queueCount, setQueueCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  const kecamatanOptions = useMemo(
    () => Array.from(new Set(desaRecords.map((d) => d.KECAMATAN))).sort(),
    [desaRecords]
  );

  const refreshQueueCount = useCallback(() => {
    setQueueCount(getQueue().length);
  }, []);

  useEffect(() => {
    fetch(`/api/desa?nip=${encodeURIComponent(nip)}`)
      .then((res) => res.json())
      .then((data) => {
        const list = data.records || [];
        setDesaRecords(list);
        if (list.length > 0) setSelectedKecamatan(list[0].KECAMATAN);
      })
      .finally(() => setLoadingDesa(false));

    fetch('/api/kelompok')
      .then((res) => res.json())
      .then((data) => setMasterKelompok(data.records || []))
      .catch(() => {});

    refreshQueueCount();
  }, [nip, refreshQueueCount]);

  const loadData = useCallback(async (kecamatan) => {
    if (!kecamatan) return;
    setLoadingKpm(true);
    setError('');
    setDesaFilter('');
    setKelompokFilter('');
    try {
      const res = await fetch(`/api/kpm?kecamatan=${encodeURIComponent(kecamatan)}`);
      if (!res.ok) throw new Error('offline-or-error');
      const data = await res.json();
      setRecords(data.records || []);
      setIsFromCache(false);
      setSyncedAt(new Date().toISOString());
      saveKpmCache(kecamatan, data.records || [], data.desaList || []);
    } catch {
      const cached = loadKpmCache(kecamatan);
      if (cached) {
        setRecords(cached.records || []);
        setSyncedAt(cached.syncedAt);
        setIsFromCache(true);
      } else {
        setError(
          'Tidak ada koneksi dan belum ada data tersimpan untuk kecamatan ini. Sambungkan internet dulu untuk mengunduh data.'
        );
        setRecords([]);
      }
    } finally {
      setLoadingKpm(false);
    }
  }, []);

  useEffect(() => {
    if (selectedKecamatan) loadData(selectedKecamatan);
  }, [selectedKecamatan, loadData]);

  useEffect(() => {
    function handleOnline() {
      handleSync();
    }
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDownload() {
    setDownloading(true);
    await loadData(selectedKecamatan);
    setDownloading(false);
  }

  async function handleSync() {
    setSyncing(true);
    setSyncMessage('');
    const result = await flushQueue();
    refreshQueueCount();
    if (result.success > 0) {
      setSyncMessage(`${result.success} perubahan berhasil disinkronkan.`);
      loadData(selectedKecamatan);
    } else if (result.remaining > 0) {
      setSyncMessage('Belum ada koneksi — perubahan tetap tersimpan, akan dicoba lagi nanti.');
    }
    setSyncing(false);
  }

  function openDetail(kpm) {
    setSelectedKpm(kpm);
    setEditForm({
      KELOMPOK: kpm.KELOMPOK || '',
      STATUS_KEPESERTAAN: kpm.STATUS_KEPESERTAAN || 'Aktif',
      CATATAN: kpm.CATATAN || '',
    });
  }

  async function handleSaveDetail(e) {
    e.preventDefault();
    if (!selectedKpm) return;
    setSaving(true);
    const change = { kecamatan: selectedKecamatan, nokk: selectedKpm.NOKK, ...editForm };
    try {
      if (!navigator.onLine) throw new Error('offline');
      const res = await fetch('/api/kpm', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(change),
      });
      if (!res.ok) throw new Error('failed');
      applyChangeToCache(selectedKecamatan, selectedKpm.NOKK, editForm);
      setRecords((prev) =>
        prev.map((r) => (r.NOKK === selectedKpm.NOKK ? { ...r, ...editForm } : r))
      );
      setSyncMessage('Perubahan tersimpan & langsung tersinkron ke server.');
    } catch {
      queueChange(change);
      setRecords((prev) =>
        prev.map((r) => (r.NOKK === selectedKpm.NOKK ? { ...r, ...editForm } : r))
      );
      refreshQueueCount();
      setSyncMessage('Belum ada koneksi — perubahan disimpan di HP, akan otomatis dikirim nanti.');
    } finally {
      setSaving(false);
      setSelectedKpm(null);
    }
  }

  const desaOptions = useMemo(
    () => Array.from(new Set(records.map((r) => r.DESA).filter(Boolean))).sort(),
    [records]
  );

  const kelompokOptions = useMemo(() => {
    const source = desaFilter ? records.filter((r) => r.DESA === desaFilter) : records;
    return Array.from(new Set(source.map((r) => r.KELOMPOK).filter(Boolean))).sort();
  }, [records, desaFilter]);

  // Daftar kelompok resmi (dari MasterKelompok) untuk desa yang sedang diedit —
  // dipakai sebagai saran di form edit supaya penamaan kelompok konsisten
  const masterKelompokForDesa = useCallback(
    (desa) => masterKelompok.filter((k) => k.DESA_DAMPINGAN === desa),
    [masterKelompok]
  );

  const filtered = useMemo(() => {
    let list = records;
    if (statusChip) {
      const chip = STATUS_CHIPS.find((c) => c.key === statusChip);
      list = list.filter((r) => chip.match(r.STATUS_KEPESERTAAN));
    }
    if (desaFilter) list = list.filter((r) => r.DESA === desaFilter);
    if (kelompokFilter) list = list.filter((r) => r.KELOMPOK === kelompokFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          (r.NAMA || '').toLowerCase().includes(q) ||
          (r.NOKK || '').toLowerCase().includes(q) ||
          (r.DESA || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [records, statusChip, desaFilter, kelompokFilter, search]);

  const summary = useMemo(() => {
    const s = { aktif: 0, pengaduan: 0, graduasi: 0, ppse: 0 };
    records.forEach((r) => {
      const status = r.STATUS_KEPESERTAAN || 'Aktif';
      if (status === 'Aktif') s.aktif++;
      else if (status === 'Pengaduan') s.pengaduan++;
      else if (status.includes('Graduasi')) s.graduasi++;
      else if (status.includes('PPSE')) s.ppse++;
    });
    return s;
  }, [records]);

  function toggleChip(key) {
    setStatusChip((prev) => (prev === key ? null : key));
  }

  if (loadingDesa) {
    return (
      <div className="min-h-full flex items-center justify-center py-20">
        <p className="text-brand-600">Memuat...</p>
      </div>
    );
  }

  if (desaRecords.length === 0) {
    return (
      <div className="min-h-full flex items-center justify-center py-20 px-4">
        <div className="card p-6 max-w-sm text-center">
          <p className="text-brand-800 mb-4">
            Anda belum punya desa dampingan tercatat. Tambahkan dulu di halaman data diri.
          </p>
          <button
            className="btn-primary"
            onClick={() => router.push(`/pegawai/${encodeURIComponent(nip)}`)}
          >
            Kembali ke Data Diri
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 pb-16 max-w-5xl mx-auto space-y-6">
      {queueCount > 0 && (
        <div className="card p-4 bg-amber-50 border border-amber-200 flex items-center justify-between gap-3">
          <p className="text-sm text-amber-800">{queueCount} perubahan belum tersinkron ke server.</p>
          <button className="btn-accent text-sm shrink-0" onClick={handleSync} disabled={syncing}>
            {syncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}
          </button>
        </div>
      )}
      {syncMessage && (
        <p className="text-sm text-brand-600 bg-brand-100 rounded-lg px-3 py-2">{syncMessage}</p>
      )}

      <div className="card p-5">
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div className="flex-1 min-w-[160px]">
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
          <button className="btn-primary shrink-0" onClick={handleDownload} disabled={downloading}>
            {downloading ? 'Mengunduh...' : '⬇ Unduh untuk Offline'}
          </button>
        </div>

        {syncedAt && (
          <p className="text-xs text-brand-400 mb-3">
            {isFromCache ? 'Data tersimpan (offline)' : 'Data terbaru'} — sinkron terakhir{' '}
            {new Date(syncedAt).toLocaleString('id-ID')}
          </p>
        )}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">
            {error}
          </p>
        )}

        {/* Ringkasan yang bisa diklik sebagai filter status */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {STATUS_CHIPS.map((chip) => (
            <button
              key={chip.key}
              onClick={() => toggleChip(chip.key)}
              className={`rounded-lg p-3 text-center transition ${
                statusChip === chip.key
                  ? 'bg-brand-600 text-white'
                  : 'bg-brand-50 text-brand-800 hover:bg-brand-100'
              }`}
            >
              <p className="text-lg font-bold">
                {chip.key === 'Aktif'
                  ? summary.aktif
                  : chip.key === 'Pengaduan'
                  ? summary.pengaduan
                  : chip.key === 'Graduasi'
                  ? summary.graduasi
                  : summary.ppse}
              </p>
              <p className={`text-xs ${statusChip === chip.key ? 'text-brand-100' : 'text-brand-400'}`}>
                {chip.label}
              </p>
            </button>
          ))}
        </div>

        {/* Filter pencarian & dropdown desa/kelompok */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
          <input
            className="input"
            placeholder="Cari nama / NOKK..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="input"
            value={desaFilter}
            onChange={(e) => {
              setDesaFilter(e.target.value);
              setKelompokFilter('');
            }}
          >
            <option value="">Semua Desa</option>
            {desaOptions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={kelompokFilter}
            onChange={(e) => setKelompokFilter(e.target.value)}
          >
            <option value="">Semua Kelompok</option>
            {kelompokOptions.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>

        {loadingKpm ? (
          <p className="text-sm text-brand-400 py-4 text-center">Memuat data KPM...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-brand-400 py-4 text-center">Tidak ada data.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-100 text-left">
                  <th className="px-3 py-2 font-semibold text-brand-800 whitespace-nowrap">Nama</th>
                  <th className="px-3 py-2 font-semibold text-brand-800 whitespace-nowrap">Alamat</th>
                  <th className="px-3 py-2 font-semibold text-brand-800 whitespace-nowrap">Desa</th>
                  <th className="px-3 py-2 font-semibold text-brand-800 whitespace-nowrap">Kelompok</th>
                  <th className="px-3 py-2 font-semibold text-brand-800 whitespace-nowrap">Status</th>
                  <th className="px-3 py-2 font-semibold text-brand-800 text-right whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.NOKK} className="border-b border-brand-50 hover:bg-brand-50">
                    <td className="px-3 py-2 whitespace-nowrap font-medium text-brand-800">{r.NAMA}</td>
                    <td className="px-3 py-2 max-w-[180px] truncate">{r.ALAMAT}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{r.DESA}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{r.KELOMPOK || '-'}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full ${
                          r.STATUS_KEPESERTAAN === 'Pengaduan'
                            ? 'bg-red-100 text-red-700'
                            : (r.STATUS_KEPESERTAAN || '').includes('Sukses')
                            ? 'bg-brand-100 text-brand-600'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {r.STATUS_KEPESERTAAN || 'Aktif'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <button
                        className="text-brand-600 underline text-sm"
                        onClick={() => openDetail(r)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedKpm && (
        <div className="fixed inset-0 bg-brand-900/50 flex items-end sm:items-center justify-center p-4 z-50">
          <div className="card w-full max-w-md">
            <div className="px-6 py-4 border-b border-brand-100 flex items-center justify-between">
              <h2 className="font-bold text-brand-800">{selectedKpm.NAMA}</h2>
              <button
                className="text-brand-400 text-xl leading-none"
                onClick={() => setSelectedKpm(null)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleSaveDetail} className="p-6 space-y-4">
              <p className="text-sm text-brand-400">
                NOKK: {selectedKpm.NOKK} · {selectedKpm.ALAMAT}, {selectedKpm.DESA}
              </p>

              <div>
                <label className="label">Kelompok</label>
                <input
                  className="input"
                  list="kelompok-suggestions"
                  value={editForm.KELOMPOK}
                  onChange={(e) => setEditForm((f) => ({ ...f, KELOMPOK: e.target.value }))}
                  placeholder="Ketik atau pilih dari saran"
                />
                <datalist id="kelompok-suggestions">
                  {masterKelompokForDesa(selectedKpm.DESA).map((k) => (
                    <option key={k.NAMA_KELOMPOK} value={k.NAMA_KELOMPOK} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="label">Status Kepesertaan</label>
                <select
                  className="input"
                  value={editForm.STATUS_KEPESERTAAN}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, STATUS_KEPESERTAAN: e.target.value }))
                  }
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Catatan</label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Catatan bebas, misalnya info meninggal dunia, dsb."
                  value={editForm.CATATAN}
                  onChange={(e) => setEditForm((f) => ({ ...f, CATATAN: e.target.value }))}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" className="btn-ghost" onClick={() => setSelectedKpm(null)}>
                  Batal
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
