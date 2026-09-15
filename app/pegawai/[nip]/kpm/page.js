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
  saveFinalClosing,
  loadFinalClosing,
} from '@/lib/offlineStorage';
import { normalizeDesaName } from '@/lib/normalize';
import {
  parseFinalClosingWorkbook,
  mergeFinalClosingMaps,
  KOMPONEN_ICON_MAP,
} from '@/lib/finalClosingParser';

const STATUS_OPTIONS = [
  'Aktif',
  'Pengaduan',
  'Calon Graduasi Mandiri',
  'Calon PPSE',
  'Calon PPSE (Assessment SIKSMO)',
  'Sukses Graduasi Mandiri',
  'Sukses PPSE',
  'Pengurus Meninggal',
  'Dana Komponen Meninggal',
];

const STATUS_CHIPS = [
  { key: 'Aktif', label: 'Aktif', match: (s) => s === 'Aktif' || !s },
  { key: 'Pengaduan', label: 'Pengaduan', match: (s) => s === 'Pengaduan' },
  { key: 'Graduasi', label: 'Graduasi', match: (s) => (s || '').includes('Graduasi') },
  { key: 'PPSE', label: 'PPSE', match: (s) => (s || '').includes('PPSE') },
];

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  if (!text) return null;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard?.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      title="Salin"
      className="text-brand-400 hover:text-brand-700 ml-1"
    >
      {copied ? '✓' : '📋'}
    </button>
  );
}

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
  const [sortField, setSortField] = useState('NAMA');
  const [sortDir, setSortDir] = useState('asc');
  const [showSortMenu, setShowSortMenu] = useState(false);

  const [finalClosing, setFinalClosing] = useState(null);
  const [importingFinalClosing, setImportingFinalClosing] = useState(false);
  const [finalClosingInfo, setFinalClosingInfo] = useState('');

  const [selectedKpm, setSelectedKpm] = useState(null);
  const [editForm, setEditForm] = useState({
    KELOMPOK: '',
    STATUS_KEPESERTAAN: '',
    CATATAN: '',
    IS_KETUA: false,
    ALAMAT: '',
    JENIS_USAHA: '',
  });
  const [saving, setSaving] = useState(false);

  const [queueCount, setQueueCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

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
    if (!selectedKecamatan) return;
    const cached = loadFinalClosing(selectedKecamatan);
    if (cached) {
      setFinalClosing(cached.data);
      setFinalClosingInfo(
        `Diimpor ${new Date(cached.importedAt).toLocaleString('id-ID')} (${
          Object.keys(cached.data).length
        } KPM cocok)`
      );
    } else {
      setFinalClosing(null);
      setFinalClosingInfo('');
    }
  }, [selectedKecamatan]);

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

  function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  async function handleImportFinalClosing(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !selectedKecamatan) return;
    setImportingFinalClosing(true);
    setError('');
    try {
      const maps = await Promise.all(
        files.map(async (file) => {
          const buffer = await readFileAsArrayBuffer(file);
          return parseFinalClosingWorkbook(buffer);
        })
      );
      const combined = mergeFinalClosingMaps(maps);
      setFinalClosing(combined);
      saveFinalClosing(selectedKecamatan, combined);
      setFinalClosingInfo(
        `Diimpor ${new Date().toLocaleString('id-ID')} dari ${files.length} file (${
          Object.keys(combined).length
        } KPM cocok)`
      );
      setSyncMessage(
        `Data Final Closing berhasil disandingkan — ${Object.keys(combined).length} KPM ketemu dari ${files.length} file.`
      );
    } catch {
      setError('Gagal membaca salah satu file Final Closing. Pastikan formatnya sesuai.');
    } finally {
      setImportingFinalClosing(false);
      e.target.value = '';
    }
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

  function isKetuaValue(v) {
    return v === true || v === 'TRUE' || v === 'true';
  }

  function openDetail(kpm) {
    setSelectedKpm(kpm);
    setEditForm({
      KELOMPOK: kpm.KELOMPOK || '',
      STATUS_KEPESERTAAN: kpm.STATUS_KEPESERTAAN || 'Aktif',
      CATATAN: kpm.CATATAN || '',
      IS_KETUA: isKetuaValue(kpm.IS_KETUA),
      ALAMAT: kpm.ALAMAT || '',
      JENIS_USAHA: kpm.JENIS_USAHA || '',
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
      if (editForm.IS_KETUA) {
        // Server mungkin melepas status ketua dari KPM lain di kelompok yang sama —
        // muat ulang biar tabel ikut sinkron, bukan cuma baris yang baru diedit.
        await loadData(selectedKecamatan);
      } else {
        applyChangeToCache(selectedKecamatan, selectedKpm.NOKK, editForm);
        setRecords((prev) =>
          prev.map((r) => (r.NOKK === selectedKpm.NOKK ? { ...r, ...editForm } : r))
        );
      }
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
    (desa) =>
      masterKelompok.filter((k) => normalizeDesaName(k.DESA_DAMPINGAN) === normalizeDesaName(desa)),
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
    const sorted = [...list].sort((a, b) => {
      const va = (a[sortField] || '').toString();
      const vb = (b[sortField] || '').toString();
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    });
    return sorted;
  }, [records, statusChip, desaFilter, kelompokFilter, search, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage]
  );

  // Reset ke halaman 1 setiap kali filter/pencarian/urutan berubah, supaya
  // pengguna tidak "nyangkut" di halaman kosong setelah hasil filter mengecil.
  useEffect(() => {
    setPage(1);
  }, [statusChip, desaFilter, kelompokFilter, search, sortField, sortDir]);

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

  const komponenAggregate = useMemo(() => {
    if (!finalClosing) return {};
    const agg = {};
    Object.values(finalClosing).forEach((entry) => {
      entry.komponen.forEach((k) => {
        agg[k.nama] = (agg[k.nama] || 0) + k.jumlah;
      });
    });
    return agg;
  }, [finalClosing]);

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

      {Object.keys(komponenAggregate).length > 0 && (
        <div className="card p-3 flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-brand-400 uppercase">Komponen (Final Closing)</span>
          {Object.entries(komponenAggregate).map(([nama, jumlah]) => (
            <span
              key={nama}
              title={nama}
              className="inline-flex items-center gap-1 bg-brand-50 text-brand-700 text-sm px-2 py-1 rounded-full"
            >
              <span>{KOMPONEN_ICON_MAP[nama] || '📌'}</span>
              <span className="font-semibold">{jumlah}</span>
            </span>
          ))}
        </div>
      )}

      <div className="card p-5">
        <div className="flex flex-wrap items-end gap-3 mb-4">
          {kecamatanOptions.length > 1 && (
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
          )}
          <button className="btn-primary shrink-0" onClick={handleDownload} disabled={downloading}>
            {downloading ? 'Mengunduh...' : '⬇ Unduh untuk Offline'}
          </button>
          <label className="btn-ghost shrink-0 cursor-pointer">
            {importingFinalClosing ? 'Memproses...' : '📎 Import Final Closing'}
            <input
              type="file"
              accept=".xlsx,.xls"
              multiple
              className="hidden"
              onChange={handleImportFinalClosing}
              disabled={importingFinalClosing}
            />
          </label>
          <div className="relative shrink-0 ml-auto">
            <button
              className="w-9 h-9 rounded-lg border border-brand-100 text-brand-600 hover:bg-brand-50"
              onClick={() => setShowSortMenu((v) => !v)}
              title="Urutkan"
            >
              ⋮
            </button>
            {showSortMenu && (
              <div className="absolute right-0 mt-1 w-56 card p-3 z-20 space-y-2">
                <p className="text-xs font-semibold text-brand-400 uppercase">Urutkan berdasarkan</p>
                <select
                  className="input"
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value)}
                >
                  <option value="NAMA">Nama</option>
                  <option value="NOKK">NOKK</option>
                  <option value="DESA">Desa</option>
                  <option value="STATUS_KEPESERTAAN">Status Kepesertaan</option>
                </select>
                <div className="flex gap-2">
                  <button
                    className={`flex-1 text-sm rounded-lg py-1.5 ${
                      sortDir === 'asc' ? 'bg-brand-600 text-white' : 'bg-brand-50 text-brand-700'
                    }`}
                    onClick={() => setSortDir('asc')}
                  >
                    A → Z
                  </button>
                  <button
                    className={`flex-1 text-sm rounded-lg py-1.5 ${
                      sortDir === 'desc' ? 'bg-brand-600 text-white' : 'bg-brand-50 text-brand-700'
                    }`}
                    onClick={() => setSortDir('desc')}
                  >
                    Z → A
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {finalClosingInfo && (
          <p className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2 mb-3">
            📎 Final Closing: {finalClosingInfo}
          </p>
        )}

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
          <div className="border border-brand-100 rounded-lg overflow-hidden">
            <div className="overflow-auto max-h-[65vh]">
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 z-10 bg-brand-50">
                  <tr className="border-b border-brand-100 text-left">
                    <th className="px-3 py-2 font-semibold text-brand-800 whitespace-nowrap">Nama</th>
                    <th className="px-3 py-2 font-semibold text-brand-800 whitespace-nowrap">NOKK</th>
                    <th className="px-3 py-2 font-semibold text-brand-800 whitespace-nowrap">NIK</th>
                    <th className="px-3 py-2 font-semibold text-brand-800 whitespace-nowrap">Alamat</th>
                    <th className="px-3 py-2 font-semibold text-brand-800 whitespace-nowrap">Desa</th>
                    <th className="px-3 py-2 font-semibold text-brand-800 whitespace-nowrap">Kelompok</th>
                    <th className="px-3 py-2 font-semibold text-brand-800 whitespace-nowrap">Status Penyaluran</th>
                    <th className="px-3 py-2 font-semibold text-brand-800 whitespace-nowrap">Status Kepesertaan</th>
                    <th className="px-3 py-2 font-semibold text-brand-800 text-right whitespace-nowrap">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((r) => (
                    <tr key={r.NOKK} className="border-b border-brand-50 hover:bg-brand-50 bg-white">
                      <td className="px-3 py-2 whitespace-nowrap font-medium">
                        <span className="inline-flex items-center">
                          {isKetuaValue(r.IS_KETUA) && <span title="Ketua Kelompok">⭐</span>}
                          <button
                            type="button"
                            className="text-brand-700 hover:underline hover:text-brand-800 text-left"
                            onClick={() => openDetail(r)}
                          >
                            {r.NAMA}
                          </button>
                          <CopyButton text={r.NAMA} />
                          {finalClosing?.[r.NOKK] && (
                            <span title="Ada data Final Closing" className="ml-1">📎</span>
                          )}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">
                        <span className="inline-flex items-center">
                          {r.NOKK}
                          <CopyButton text={r.NOKK} />
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">{r.NIK}</td>
                      <td className="px-3 py-2 max-w-[180px] truncate">{r.ALAMAT}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.DESA}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.KELOMPOK || '-'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.STATUS_PENYALURAN || '-'}</td>
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
          </div>
        )}
        {!loadingKpm && filtered.length > 0 && (
          <div className="flex items-center justify-between mt-3 text-sm text-brand-600">
            <span>
              Halaman {currentPage} dari {totalPages} · {filtered.length} KPM
            </span>
            <div className="flex gap-2">
              <button
                className="btn-ghost"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                &larr; Sebelumnya
              </button>
              <button
                className="btn-ghost"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Selanjutnya &rarr;
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedKpm && (
        <div className="fixed inset-0 bg-brand-900/50 flex items-end sm:items-center justify-center p-4 z-50">
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-brand-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="font-bold text-brand-800">Detail KPM</h2>
              <button
                className="text-brand-400 text-xl leading-none"
                onClick={() => setSelectedKpm(null)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleSaveDetail} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Nama</label>
                  <input className="input bg-brand-50" value={selectedKpm.NAMA} readOnly disabled />
                </div>
                <div>
                  <label className="label">Kelompok</label>
                  <input
                    className="input"
                    list="kelompok-suggestions"
                    value={editForm.KELOMPOK}
                    onChange={(e) => setEditForm((f) => ({ ...f, KELOMPOK: e.target.value }))}
                    placeholder="Ketik/pilih"
                  />
                  <datalist id="kelompok-suggestions">
                    {masterKelompokForDesa(selectedKpm.DESA).map((k) => (
                      <option key={k.NAMA_KELOMPOK} value={k.NAMA_KELOMPOK} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="label">Desa</label>
                  <input className="input bg-brand-50" value={selectedKpm.DESA} readOnly disabled />
                </div>
                <div>
                  <label className="label">No KK</label>
                  <span className="inline-flex items-center w-full">
                    <input
                      className="input bg-brand-50 font-mono text-xs"
                      value={selectedKpm.NOKK}
                      readOnly
                      disabled
                    />
                    <CopyButton text={selectedKpm.NOKK} />
                  </span>
                </div>
              </div>

              <div>
                <label className="label">Alamat</label>
                <input
                  className="input"
                  value={editForm.ALAMAT}
                  onChange={(e) => setEditForm((f) => ({ ...f, ALAMAT: e.target.value }))}
                  placeholder="Alamat KPM"
                />
              </div>

              <div>
                <label className="label">NIK Pengurus</label>
                <span className="inline-flex items-center w-full">
                  <input
                    className="input bg-brand-50 font-mono text-xs"
                    value={selectedKpm.NIK}
                    readOnly
                    disabled
                  />
                  <CopyButton text={selectedKpm.NIK} />
                </span>
              </div>

              {finalClosing?.[selectedKpm.NOKK] && (
                <div>
                  <p className="label mb-2">Komponen Dimiliki (Final Closing)</p>
                  {finalClosing[selectedKpm.NOKK].komponen.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2">
                      {finalClosing[selectedKpm.NOKK].komponen.map((k) => (
                        <div
                          key={k.nama}
                          className="bg-brand-50 rounded-lg p-2 text-center"
                          title={k.nama}
                        >
                          <p className="text-lg">{KOMPONEN_ICON_MAP[k.nama] || '📌'}</p>
                          <p className="text-sm font-bold text-brand-800">{k.jumlah}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-brand-400">Tidak ada komponen tercatat.</p>
                  )}
                  <p className="text-sm text-green-800 font-semibold mt-2">
                    Total Bantuan: {finalClosing[selectedKpm.NOKK].nominal || '-'}
                  </p>
                </div>
              )}

              <label className="flex items-center gap-2 text-sm text-brand-700">
                <input
                  type="checkbox"
                  checked={editForm.IS_KETUA}
                  onChange={(e) => setEditForm((f) => ({ ...f, IS_KETUA: e.target.checked }))}
                  disabled={!editForm.KELOMPOK}
                />
                ⭐ Tandai sebagai Ketua Kelompok
              </label>
              {editForm.IS_KETUA && (
                <p className="text-xs text-amber-700 -mt-2">
                  Kalau sebelumnya ada ketua lain di kelompok ini, statusnya akan otomatis dilepas.
                </p>
              )}

              <div>
                <label className="label">Status KPM</label>
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

              {editForm.STATUS_KEPESERTAAN === 'Calon PPSE' && (
                <div>
                  <label className="label">Jenis Usaha</label>
                  <input
                    className="input"
                    value={editForm.JENIS_USAHA}
                    onChange={(e) => setEditForm((f) => ({ ...f, JENIS_USAHA: e.target.value }))}
                    placeholder="Misal: Warung kelontong, Ternak ayam, dsb."
                  />
                </div>
              )}

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
