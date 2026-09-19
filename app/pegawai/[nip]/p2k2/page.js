'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { normalizeDesaName } from '@/lib/normalize';
import {
  saveDesaCache,
  loadDesaCache,
  loadKpmCache,
  saveKpmCache,
} from '@/lib/offlineStorage';

// Ekstrak RT/RW dari teks alamat (mis. "DSN. ADAN-ADAN RT:19 RW:6") karena
// data KPM dari CSV SIKS-NG tidak punya kolom RT/RW terpisah — supaya tabel
// absensi tetap bisa menampilkan kolom RT & RW seperti format resmi.
function extractRtRw(alamat) {
  const s = alamat || '';
  const rt = s.match(/RT[:\s.]*([0-9]{1,3})/i)?.[1] || '';
  const rw = s.match(/RW[:\s.]*([0-9]{1,3})/i)?.[1] || '';
  return { rt, rw };
}

function formatTanggalPanjang(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function P2K2Page() {
  const params = useParams();
  const nip = decodeURIComponent(params.nip);

  const [modules, setModules] = useState([]);
  const [loadingModules, setLoadingModules] = useState(true);

  const [desaRecords, setDesaRecords] = useState([]);
  const [kecamatanOptions, setKecamatanOptions] = useState([]);

  const [namaPendamping, setNamaPendamping] = useState('');

  const [absensiForm, setAbsensiForm] = useState({
    KECAMATAN: '',
    DESA: '',
    KELOMPOK: '',
    MODUL: '',
    SESI_NO: '',
    SESI_JUDUL: '',
    TANGGAL: new Date().toISOString().slice(0, 10),
  });
  const [absensiKpm, setAbsensiKpm] = useState([]);
  const [loadingAbsensi, setLoadingAbsensi] = useState(false);
  const [absensiError, setAbsensiError] = useState('');
  const [absensiFromCache, setAbsensiFromCache] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Modul P2K2 tetap dari server — ini konten bersama yang diunggah admin,
  // jadi memang perlu terhubung untuk melihat daftar/link unduhan terbaru.
  useEffect(() => {
    fetch('/api/p2k2-modul')
      .then((r) => r.json())
      .then((d) => setModules(d.records || []))
      .finally(() => setLoadingModules(false));
  }, []);

  // Nama pendamping (untuk blok tanda tangan di lembar absensi).
  useEffect(() => {
    fetch(`/api/pegawai/${encodeURIComponent(nip)}`)
      .then((r) => r.json())
      .then((d) => setNamaPendamping(d.record?.NAMA || ''))
      .catch(() => {});
  }, [nip]);

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
    setAbsensiForm((f) => (f.KECAMATAN ? f : { ...f, KECAMATAN: kecs[0] || '' }));
  }

  const desaOptionsFor = useCallback(
    (kecamatan) =>
      desaRecords.filter((d) => d.KECAMATAN === kecamatan).map((d) => d.NAMA_DESA),
    [desaRecords]
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
      } else {
        setShowPreview(true);
      }
    } catch (err) {
      setAbsensiError(err.message || 'Gagal memuat data.');
      setAbsensiKpm([]);
    } finally {
      setLoadingAbsensi(false);
    }
  }

  return (
    <>
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

      {/* CETAK ABSENSI */}
      <div className="card p-5">
        <h2 className="text-brand-800 font-bold mb-1">🖨️ Cetak Absensi</h2>
        <p className="text-sm text-brand-400 mb-4">
          Isi data pertemuan, lihat pratinjau dulu, baru cetak. Memakai data KPM yang sudah
          diunduh offline bila tersedia.
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
            placeholder="Nama Kelompok"
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
            className="input sm:col-span-2"
            placeholder="Nama Modul (mis. Pengelolaan Keuangan dan Perencanaan Usaha)"
            value={absensiForm.MODUL}
            onChange={(e) => setAbsensiForm((f) => ({ ...f, MODUL: e.target.value }))}
          />
          <input
            className="input"
            type="number"
            placeholder="Sesi ke-"
            value={absensiForm.SESI_NO}
            onChange={(e) => setAbsensiForm((f) => ({ ...f, SESI_NO: e.target.value }))}
          />
          <input
            className="input"
            placeholder="Judul Sesi (mis. Cermat Meminjam dan Menabung)"
            value={absensiForm.SESI_JUDUL}
            onChange={(e) => setAbsensiForm((f) => ({ ...f, SESI_JUDUL: e.target.value }))}
          />
        </div>

        {absensiError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">
            {absensiError}
          </p>
        )}

        <button className="btn-primary w-full" onClick={handleLoadAbsensiData} disabled={loadingAbsensi}>
          {loadingAbsensi ? 'Memuat...' : '👁️ Lihat Pratinjau'}
        </button>
      </div>
    </div>

      {showPreview && (
        <PreviewOverlay
          form={absensiForm}
          kpmList={absensiKpm}
          namaPendamping={namaPendamping}
          nip={nip}
          fromCache={absensiFromCache}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  );
}

function PreviewOverlay({ form, kpmList, namaPendamping, nip, fromCache, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 overflow-y-auto print:bg-white print:static">
      <div className="sticky top-0 z-10 bg-brand-800 text-white px-4 py-3 flex items-center justify-between print:hidden">
        <div>
          <p className="font-semibold text-sm">Pratinjau Absensi</p>
          {fromCache && <p className="text-xs text-brand-200">📴 Data dari offline di HP ini</p>}
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost bg-white/10 text-white text-sm" onClick={onClose}>
            ← Kembali
          </button>
          <button className="btn-accent text-sm" onClick={() => window.print()}>
            🖨️ Cetak Sekarang
          </button>
        </div>
      </div>
      <div className="py-6 px-2 print:p-0">
        <div className="bg-white max-w-[210mm] mx-auto shadow-lg print:shadow-none">
          <PrintAbsensi form={form} kpmList={kpmList} namaPendamping={namaPendamping} nip={nip} />
        </div>
      </div>
    </div>
  );
}

function PrintAbsensi({ form, kpmList, namaPendamping, nip }) {
  return (
    <div className="p-10 text-black text-sm" style={{ fontFamily: 'Arial, sans-serif' }}>
      <div className="flex items-center justify-between gap-4 border-b-2 border-black pb-3 mb-1">
        <img src="/logo/kemensos.png" alt="" className="h-16 w-16 object-contain" />
        <div className="text-center flex-1">
          <h1 className="text-lg font-bold tracking-wide">DAFTAR HADIR FDS</h1>
          {form.MODUL && (
            <p className="font-bold text-sm mt-1">
              Modul {form.MODUL}
              {form.SESI_NO ? ` — Sesi ${form.SESI_NO}${form.SESI_JUDUL ? `: ${form.SESI_JUDUL}` : ''}` : ''}
            </p>
          )}
        </div>
        <img src="/logo/pkh.png" alt="" className="h-16 w-16 object-contain" />
      </div>

      <p className="text-center font-semibold mt-2">
        Desa {form.DESA}
        {form.KELOMPOK ? ` — Kelompok ${form.KELOMPOK}` : ''}
      </p>
      <p className="text-center mb-4">{formatTanggalPanjang(form.TANGGAL)}</p>

      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-teal-700 text-white">
            <th className="border border-black px-2 py-2 w-8">No</th>
            <th className="border border-black px-2 py-2 text-left">Nama Pengurus</th>
            <th className="border border-black px-2 py-2 text-left">No KK</th>
            <th className="border border-black px-2 py-2 text-left">Alamat</th>
            <th className="border border-black px-2 py-2 w-10">RT</th>
            <th className="border border-black px-2 py-2 w-10">RW</th>
            <th className="border border-black px-2 py-2">Status Kehadiran</th>
          </tr>
        </thead>
        <tbody>
          {kpmList.map((r, i) => {
            const { rt, rw } = extractRtRw(r.ALAMAT);
            return (
              <tr key={r.NOKK}>
                <td className="border border-black px-2 py-1.5 text-center">{i + 1}</td>
                <td className="border border-black px-2 py-1.5">{r.NAMA}</td>
                <td className="border border-black px-2 py-1.5 font-mono">{r.NOKK}</td>
                <td className="border border-black px-2 py-1.5">{r.ALAMAT}</td>
                <td className="border border-black px-2 py-1.5 text-center">{rt}</td>
                <td className="border border-black px-2 py-1.5 text-center">{rw}</td>
                <td className="border border-black px-2 py-1.5"></td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="flex justify-end mt-10">
        <div className="text-center w-56">
          <p>Mengetahui,</p>
          <p>Pendamping PKH</p>
          <div className="h-16" />
          <p className="font-semibold underline">{namaPendamping || '-'}</p>
          <p>NIP. {nip}</p>
        </div>
      </div>
    </div>
  );
}
