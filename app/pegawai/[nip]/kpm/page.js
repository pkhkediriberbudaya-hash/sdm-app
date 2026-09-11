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

const EXIT_STATUSES = ['Sukses Graduasi Mandiri', 'Sukses PPSE'];

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

  const [search, setSearch] = useState('');
  const [showExited, setShowExited] = useState(false);
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
    refreshQueueCount();
  }, [nip, refreshQueueCount]);

  const loadData = useCallback(async (kecamatan) => {
    if (!kecamatan) return;
    setLoadingKpm(true);
    setError('');
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

  const filtered = useMemo(() => {
    let list = records;
    if (!showExited) {
      list = list.filter((r) => !EXIT_STATUSES.includes(r.STATUS_KEPESERTAAN));
    }
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
  }, [records, showExited, search]);

  const summary = useMemo(() => {
    const s = { total: records.length, aktif: 0, pengaduan: 0, graduasi: 0, ppse: 0 };
    records.forEach((r) => {
      const status = r.STATUS_KEPESERTAAN || 'Aktif';
      if (status === 'Aktif') s.aktif++;
      else if (status === 'Pengaduan') s.pengaduan++;
      else if (status.includes('Graduasi')) s.graduasi++;
      else if (status.includes('PPSE')) s.ppse++;
    });
    return s;
  }, [records]);

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
    <div className="px-4 py-6 pb-16 max-w-3xl mx-auto space-y-6">
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

        {loadingKpm ? (
          <p className="text-sm text-brand-400">Memuat data KPM...</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            <div className="bg-brand-50 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-brand-800">{summary.aktif}</p>
              <p className="text-xs text-brand-400">Aktif</p>
            </div>
            <div className="bg-brand-50 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-brand-800">{summary.pengaduan}</p>
              <p className="text-xs text-brand-400">Pengaduan</p>
            </div>
            <div className="bg-brand-50 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-brand-800">{summary.graduasi}</p>
              <p className="text-xs text-brand-400">Graduasi</p>
            </div>
            <div className="bg-brand-50 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-brand-800">{summary.ppse}</p>
              <p className="text-xs text-brand-400">PPSE</p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-3">
          <input
            className="input flex-1 min-w-[160px]"
            placeholder="Cari nama / NOKK / desa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm text-brand-600 whitespace-nowrap">
            <input
              type="checkbox"
              checked={showExited}
              onChange={(e) => setShowExited(e.target.checked)}
            />
            Tampilkan yang sudah keluar
          </label>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-brand-400 py-4 text-center">Tidak ada data.</p>
        ) : (
          <ul className="divide-y divide-brand-100">
            {filtered.map((r) => (
              <li
                key={r.NOKK}
                className="py-3 flex items-start justify-between gap-3 cursor-pointer"
                onClick={() => openDetail(r)}
              >
                <div>
                  <p className="font-semibold text-brand-800">{r.NAMA}</p>
                  <p className="text-sm text-brand-400">
                    {r.DESA}
                    {r.KELOMPOK ? ` · ${r.KELOMPOK}` : ''}
                  </p>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 ${
                    r.STATUS_KEPESERTAAN === 'Pengaduan'
                      ? 'bg-red-100 text-red-700'
                      : EXIT_STATUSES.includes(r.STATUS_KEPESERTAAN)
                      ? 'bg-brand-100 text-brand-600'
                      : 'bg-green-100 text-green-700'
                  }`}
                >
                  {r.STATUS_KEPESERTAAN || 'Aktif'}
                </span>
              </li>
            ))}
          </ul>
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
                NOKK: {selectedKpm.NOKK} · {selectedKpm.DESA}
              </p>

              <div>
                <label className="label">Kelompok</label>
                <input
                  className="input"
                  value={editForm.KELOMPOK}
                  onChange={(e) => setEditForm((f) => ({ ...f, KELOMPOK: e.target.value }))}
                />
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
