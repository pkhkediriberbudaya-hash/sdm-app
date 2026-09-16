'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { normalizeDesaName } from '@/lib/normalize';
import {
  loadJadwalList,
  addJadwalLocal,
  deleteJadwalLocal,
  saveDesaCache,
  loadDesaCache,
  loadKpmCache,
  saveKpmCache,
} from '@/lib/offlineStorage';

function currentMonthLabel() {
  return new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

function isThisMonth(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

export default function P2K2Page() {
  const params = useParams();
  const nip = decodeURIComponent(params.nip);

  const [modules, setModules] = useState([]);
  const [loadingModules, setLoadingModules] = useState(true);

  const [desaRecords, setDesaRecords] = useState([]);
  const [kecamatanOptions, setKecamatanOptions] = useState([]);

  const [jadwalList, setJadwalList] = useState([]);
  const [jadwalForm, setJadwalForm] = useState({
    KECAMATAN: '',
    DESA: '',
    KELOMPOK: '',
    TANGGAL: '',
    TEMPAT: '',
    MODUL: '',
    SESI: '',
  });
  const [savingJadwal, setSavingJadwal] = useState(false);

  const [absensiForm, setAbsensiForm] = useState({
    KECAMATAN: '',
    DESA: '',
    KELOMPOK: '',
    MODUL: '',
    SESI: '',
    TANGGAL: new Date().toISOString().slice(0, 10),
  });
  const [absensiKpm, setAbsensiKpm] = useState([]);
  const [loadingAbsensi, setLoadingAbsensi] = useState(false);
  const [absensiError, setAbsensiError] = useState('');
  const [absensiFromCache, setAbsensiFromCache] = useState(false);

  // Modul P2K2 tetap dari server — ini konten bersama yang diunggah admin,
  // jadi memang perlu terhubung untuk melihat daftar/link unduhan terbaru.
  useEffect(() => {
    fetch('/api/p2k2-modul')
      .then((r) => r.json())
      .then((d) => setModules(d.records || []))
      .finally(() => setLoadingModules(false));
  }, []);

  // Desa Dampingan: coba ambil dari server (data terbaru), tapi kalau gagal
  // (offline) pakai cache lokal terakhir supaya dropdown tetap terisi.
  useEffect(() => {
    const cached = loadDesaCache(nip);
    if (cached.length > 0) {
      applyDesaRecords(cached);
    }
    fetch(`/api/desa?nip=${encodeURIComponent(nip)}`)
      .then((r) => r.json())
      .then((d) => {
        const list = d.records || [];
        if (list.length > 0) {
          applyDesaRecords(list);
          saveDesaCache(nip, list);
        }
      })
      .catch(() => {
        /* offline: tetap pakai cache yang sudah dimuat di atas */
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nip]);

  function applyDesaRecords(list) {
    setDesaRecords(list);
    const kecs = Array.from(new Set(list.map((x) => x.KECAMATAN))).sort();
    setKecamatanOptions(kecs);
    setJadwalForm((f) => (f.KECAMATAN ? f : { ...f, KECAMATAN: kecs[0] || '' }));
    setAbsensiForm((f) => (f.KECAMATAN ? f : { ...f, KECAMATAN: kecs[0] || '' }));
  }

  // Jadwal Pertemuan: murni lokal di HP ini saja, tidak pernah dikirim ke
  // server — jadi bisa dibuka/diisi/dihapus tanpa internet sama sekali.
  useEffect(() => {
    setJadwalList(loadJadwalList(nip));
  }, [nip]);

  const desaOptionsFor = useCallback(
    (kecamatan) =>
      desaRecords.filter((d) => d.KECAMATAN === kecamatan).map((d) => d.NAMA_DESA),
    [desaRecords]
  );

  function handleAddJadwal(e) {
    e.preventDefault();
    if (!jadwalForm.TANGGAL || !jadwalForm.DESA || !jadwalForm.KELOMPOK) return;
    setSavingJadwal(true);
    addJadwalLocal(nip, jadwalForm);
    setJadwalList(loadJadwalList(nip));
    setJadwalForm((f) => ({ ...f, DESA: '', KELOMPOK: '', TANGGAL: '', TEMPAT: '', MODUL: '', SESI: '' }));
    setSavingJadwal(false);
  }

  function handleDeleteJadwal(id) {
    if (!confirm('Hapus jadwal ini?')) return;
    deleteJadwalLocal(nip, id);
    setJadwalList(loadJadwalList(nip));
  }

  const jadwalBulanIni = useMemo(
    () => jadwalList.filter((j) => isThisMonth(j.TANGGAL)).sort((a, b) => new Date(a.TANGGAL) - new Date(b.TANGGAL)),
    [jadwalList]
  );

  async function handleLoadAbsensiData() {
    if (!absensiForm.KECAMATAN || !absensiForm.DESA) {
      setAbsensiError('Pilih kecamatan & desa dulu.');
      return;
    }
    setLoadingAbsensi(true);
    setAbsensiError('');
    setAbsensiFromCache(false);
    try {
      const desaKey = normalizeDesaName(absensiForm.DESA);
      let records = null;

      // Pakai data KPM yang sudah tersimpan offline dulu (hasil "Unduh untuk
      // Offline" di menu Data KPM) — supaya tidak perlu koneksi tiap kali
      // mau cetak absensi.
      const cache = loadKpmCache(absensiForm.KECAMATAN);
      if (cache && Array.isArray(cache.records)) {
        records = cache.records;
        setAbsensiFromCache(true);
      } else {
        const res = await fetch(`/api/kpm?kecamatan=${encodeURIComponent(absensiForm.KECAMATAN)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Gagal memuat data');
        records = data.records;
        saveKpmCache(absensiForm.KECAMATAN, data.records, data.desaList);
      }

      let list = records.filter((r) => normalizeDesaName(r.DESA) === desaKey);
      if (absensiForm.KELOMPOK) {
        const kelompokKey = absensiForm.KELOMPOK.trim().toUpperCase();
        list = list.filter((r) => (r.KELOMPOK || '').trim().toUpperCase() === kelompokKey);
      }
      setAbsensiKpm(list);
      if (list.length === 0) {
        setAbsensiError('Tidak ada data KPM untuk desa/kelompok ini. Pastikan sudah pernah "Unduh untuk Offline" di menu Data KPM, atau coba muat ulang saat online.');
      }
    } catch (err) {
      setAbsensiError(err.message || 'Gagal memuat data.');
      setAbsensiKpm([]);
    } finally {
      setLoadingAbsensi(false);
    }
  }

  function handleCetak() {
    window.print();
  }

  return (
    <div className="px-4 py-6 pb-16 max-w-3xl mx-auto space-y-6 print:hidden">
      {/* MODUL P2K2 */}
      <div className="card p-5">
        <h2 className="text-brand-800 font-bold mb-1">📚 Modul P2K2</h2>
        <p className="text-sm text-brand-400 mb-4">Diunggah admin, bisa diunduh kapan saja.</p>
        {loadingModules ? (
          <p className="text-sm text-brand-400">Memuat...</p>
        ) : modules.length === 0 ? (
          <p className="text-sm text-brand-400">Belum ada modul yang diunggah admin.</p>
        ) : (
          <ul className="divide-y divide-brand-100">
            {modules.map((m) => (
              <li key={m.ID} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-brand-800">{m.JUDUL}</p>
                  {m.DESKRIPSI && <p className="text-xs text-brand-400">{m.DESKRIPSI}</p>}
                </div>
                <a
                  href={m.URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost text-sm shrink-0"
                >
                  ⬇ Unduh
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* JADWAL PERTEMUAN */}
      <div className="card p-5">
        <h2 className="text-brand-800 font-bold mb-1">🗓️ Jadwal Pertemuan — {currentMonthLabel()}</h2>
        <p className="text-sm text-brand-400 mb-4">Tersimpan di HP ini saja, tidak perlu internet.</p>

        {jadwalBulanIni.length === 0 ? (
          <p className="text-sm text-brand-400 mb-4">Belum ada jadwal bulan ini.</p>
        ) : (
          <ul className="divide-y divide-brand-100 mb-4">
            {jadwalBulanIni.map((j) => (
              <li key={j.ID} className="py-3 flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-brand-800">
                    {new Date(j.TANGGAL).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} ·{' '}
                    {j.KELOMPOK}
                  </p>
                  <p className="text-sm text-brand-400">
                    {j.DESA} · {j.TEMPAT || '-'}
                    {j.MODUL ? ` · Modul: ${j.MODUL}` : ''}
                    {j.SESI ? ` (Sesi ${j.SESI})` : ''}
                  </p>
                </div>
                <button
                  className="text-red-600 text-sm underline shrink-0"
                  onClick={() => handleDeleteJadwal(j.ID)}
                >
                  Hapus
                </button>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={handleAddJadwal} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select
            className="input"
            value={jadwalForm.KECAMATAN}
            onChange={(e) =>
              setJadwalForm((f) => ({ ...f, KECAMATAN: e.target.value, DESA: '' }))
            }
          >
            {kecamatanOptions.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={jadwalForm.DESA}
            onChange={(e) => setJadwalForm((f) => ({ ...f, DESA: e.target.value }))}
          >
            <option value="">-- Pilih Desa --</option>
            {desaOptionsFor(jadwalForm.KECAMATAN).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <input
            className="input"
            placeholder="Nama Kelompok"
            value={jadwalForm.KELOMPOK}
            onChange={(e) => setJadwalForm((f) => ({ ...f, KELOMPOK: e.target.value }))}
          />
          <input
            className="input"
            type="date"
            value={jadwalForm.TANGGAL}
            onChange={(e) => setJadwalForm((f) => ({ ...f, TANGGAL: e.target.value }))}
          />
          <input
            className="input"
            placeholder="Tempat"
            value={jadwalForm.TEMPAT}
            onChange={(e) => setJadwalForm((f) => ({ ...f, TEMPAT: e.target.value }))}
          />
          <input
            className="input"
            placeholder="Modul (opsional)"
            value={jadwalForm.MODUL}
            onChange={(e) => setJadwalForm((f) => ({ ...f, MODUL: e.target.value }))}
          />
          <input
            className="input sm:col-span-2"
            placeholder="Sesi (opsional)"
            value={jadwalForm.SESI}
            onChange={(e) => setJadwalForm((f) => ({ ...f, SESI: e.target.value }))}
          />
          <button className="btn-accent sm:col-span-2" disabled={savingJadwal}>
            {savingJadwal ? 'Menyimpan...' : '+ Tambah Jadwal'}
          </button>
        </form>
      </div>

      {/* CETAK ABSENSI */}
      <div className="card p-5">
        <h2 className="text-brand-800 font-bold mb-1">🖨️ Cetak Absensi</h2>
        <p className="text-sm text-brand-400 mb-4">
          Pilih desa & kelompok, lalu cetak daftar hadir untuk pertemuan P2K2. Memakai data KPM
          yang sudah diunduh offline bila tersedia.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <select
            className="input"
            value={absensiForm.KECAMATAN}
            onChange={(e) =>
              setAbsensiForm((f) => ({ ...f, KECAMATAN: e.target.value, DESA: '', KELOMPOK: '' }))
            }
          >
            {kecamatanOptions.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={absensiForm.DESA}
            onChange={(e) => setAbsensiForm((f) => ({ ...f, DESA: e.target.value, KELOMPOK: '' }))}
          >
            <option value="">-- Pilih Desa --</option>
            {desaOptionsFor(absensiForm.KECAMATAN).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <input
            className="input"
            placeholder="Nama Kelompok (kosongkan = semua)"
            value={absensiForm.KELOMPOK}
            onChange={(e) => setAbsensiForm((f) => ({ ...f, KELOMPOK: e.target.value }))}
          />
          <input
            className="input"
            type="date"
            value={absensiForm.TANGGAL}
            onChange={(e) => setAbsensiForm((f) => ({ ...f, TANGGAL: e.target.value }))}
          />
          <input
            className="input"
            placeholder="Modul"
            value={absensiForm.MODUL}
            onChange={(e) => setAbsensiForm((f) => ({ ...f, MODUL: e.target.value }))}
          />
          <input
            className="input"
            placeholder="Sesi"
            value={absensiForm.SESI}
            onChange={(e) => setAbsensiForm((f) => ({ ...f, SESI: e.target.value }))}
          />
        </div>

        {absensiError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">
            {absensiError}
          </p>
        )}
        {absensiFromCache && absensiKpm.length > 0 && (
          <p className="text-xs text-brand-400 mb-3">📴 Dimuat dari data offline di HP ini.</p>
        )}

        <div className="flex gap-3">
          <button className="btn-primary" onClick={handleLoadAbsensiData} disabled={loadingAbsensi}>
            {loadingAbsensi ? 'Memuat...' : 'Muat Data'}
          </button>
          {absensiKpm.length > 0 && (
            <button className="btn-accent" onClick={handleCetak}>
              🖨️ Cetak ({absensiKpm.length} orang)
            </button>
          )}
        </div>
      </div>

      {/* Konten cetak (disembunyikan di layar, muncul saat print) */}
      <div className="hidden print:block">
        <PrintAbsensi form={absensiForm} kpmList={absensiKpm} />
      </div>
    </div>
  );
}

function PrintAbsensi({ form, kpmList }) {
  return (
    <div className="p-8">
      <h1 className="text-lg font-bold text-center">DAFTAR HADIR PERTEMUAN P2K2</h1>
      <p className="text-center text-sm mb-4">
        {form.DESA}, {form.KECAMATAN} — {form.TANGGAL}
        {form.MODUL ? ` — Modul: ${form.MODUL}` : ''}
        {form.SESI ? ` (Sesi ${form.SESI})` : ''}
        {form.KELOMPOK ? ` — Kelompok: ${form.KELOMPOK}` : ''}
      </p>
      <table className="w-full text-sm border-collapse border border-black">
        <thead>
          <tr>
            <th className="border border-black px-2 py-1 w-10">No</th>
            <th className="border border-black px-2 py-1">Nama</th>
            <th className="border border-black px-2 py-1">Desa</th>
            <th className="border border-black px-2 py-1">Kelompok</th>
            <th className="border border-black px-2 py-1 w-32">Tanda Tangan</th>
          </tr>
        </thead>
        <tbody>
          {kpmList.map((r, i) => (
            <tr key={r.NOKK}>
              <td className="border border-black px-2 py-1 text-center">{i + 1}</td>
              <td className="border border-black px-2 py-1">{r.NAMA}</td>
              <td className="border border-black px-2 py-1">{r.DESA}</td>
              <td className="border border-black px-2 py-1">{r.KELOMPOK || '-'}</td>
              <td className="border border-black px-2 py-1"></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
