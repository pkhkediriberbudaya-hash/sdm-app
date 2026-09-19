'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { RHK, findRhk } from '@/lib/rhk';
import { buildNarrative, getDasar } from '@/lib/narasi';
import { loadJurnalList, addJurnalEntryLocal, updateJurnalEntryLocal, deleteJurnalEntryLocal } from '@/lib/offlineStorage';

const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

function toDateKey(d) {
  return d.toISOString().slice(0, 10);
}

const EMPTY_FORM = {
  TANGGAL: toDateKey(new Date()),
  RHK_NO: RHK[0].no,
  KEGIATAN: RHK[0].options[0],
  DESA: '',
  KELOMPOK: '',
  SASARAN: '',
  UMUM: '',
  TUJUAN: '',
  NARASI: '',
  HASIL: '',
};

export default function JurnalPage() {
  const params = useParams();
  const nip = decodeURIComponent(params.nip);

  const [entries, setEntries] = useState([]);
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(toDateKey(new Date()));
  const [namaPendamping, setNamaPendamping] = useState('');
  const [jabatan, setJabatan] = useState('');

  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [previewEntry, setPreviewEntry] = useState(null);

  const activeRhk = useMemo(() => findRhk(form.RHK_NO), [form.RHK_NO]);

  useEffect(() => {
    setEntries(loadJurnalList(nip));
  }, [nip]);

  useEffect(() => {
    fetch(`/api/pegawai/${encodeURIComponent(nip)}`)
      .then((r) => r.json())
      .then((d) => {
        setNamaPendamping(d.record?.NAMA || '');
        setJabatan(d.record?.JABATAN || '');
      })
      .catch(() => {});
  }, [nip]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstDay.getDay();

  const entriesByDate = useMemo(() => {
    const map = {};
    entries.forEach((e) => {
      const key = (e.TANGGAL || '').slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return map;
  }, [entries]);

  const rekapRhkBulanIni = useMemo(() => {
    const counts = Object.fromEntries(RHK.map((r) => [r.no, 0]));
    entries.forEach((e) => {
      const key = (e.TANGGAL || '').slice(0, 10);
      if (!key) return;
      const d = new Date(key);
      if (d.getMonth() === month && d.getFullYear() === year) {
        const no = Number(e.RHK_NO);
        if (counts[no] !== undefined) counts[no] += 1;
      }
    });
    return counts;
  }, [entries, month, year]);

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function changeMonth(delta) {
    setViewDate(new Date(year, month + delta, 1));
  }

  function regenerateNarasi(overrides = {}) {
    const next = { ...form, ...overrides };
    const n = buildNarrative(Number(next.RHK_NO), {
      kegiatan: next.KEGIATAN,
      desa: next.DESA,
      kelompok: next.KELOMPOK,
      sasaran: next.SASARAN,
    });
    setForm({ ...next, UMUM: n.umum, TUJUAN: n.tujuan, NARASI: n.narasi, HASIL: n.hasil });
  }

  function handleSelectRhk(no) {
    const r = findRhk(no);
    regenerateNarasi({ RHK_NO: no, KEGIATAN: r?.options?.[0] || '' });
  }

  function handleSelectKegiatan(opt) {
    regenerateNarasi({ KEGIATAN: opt });
  }

  function resetForm() {
    setForm({ ...EMPTY_FORM, TANGGAL: selectedDate });
    setEditingId(null);
  }

  function handleSave(e) {
    e.preventDefault();
    if (!form.KEGIATAN.trim()) return;
    if (editingId) {
      updateJurnalEntryLocal(nip, editingId, { ...form, RHK_TITLE: activeRhk?.title || '' });
    } else {
      addJurnalEntryLocal(nip, { ...form, RHK_TITLE: activeRhk?.title || '' });
    }
    setEntries(loadJurnalList(nip));
    resetForm();
  }

  function handleEdit(en) {
    setForm({
      TANGGAL: en.TANGGAL,
      RHK_NO: Number(en.RHK_NO),
      KEGIATAN: en.KEGIATAN,
      DESA: en.DESA || '',
      KELOMPOK: en.KELOMPOK || '',
      SASARAN: en.SASARAN || '',
      UMUM: en.UMUM || '',
      TUJUAN: en.TUJUAN || '',
      NARASI: en.NARASI || '',
      HASIL: en.HASIL || '',
    });
    setEditingId(en.ID);
  }

  function handleDelete(id) {
    if (!confirm('Hapus agenda ini?')) return;
    deleteJurnalEntryLocal(nip, id);
    setEntries(loadJurnalList(nip));
    if (editingId === id) resetForm();
  }

  const selectedEntries = entriesByDate[selectedDate] || [];

  return (
    <>
    <div className="px-4 py-6 pb-16 max-w-3xl mx-auto space-y-6 print:hidden">
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <button className="btn-ghost text-sm" onClick={() => changeMonth(-1)}>
            ← Bulan Lalu
          </button>
          <h2 className="text-brand-800 font-bold">
            {viewDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
          </h2>
          <button className="btn-ghost text-sm" onClick={() => changeMonth(1)}>
            Bulan Depan →
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {HARI.map((h) => (
            <div key={h} className="text-xs font-semibold text-brand-400 py-1">
              {h}
            </div>
          ))}
          {cells.map((d, idx) => {
            if (d === null) return <div key={idx} />;
            const dateObj = new Date(year, month, d);
            const key = toDateKey(dateObj);
            const hasEntry = (entriesByDate[key] || []).length > 0;
            const isSelected = key === selectedDate;
            const isToday = key === toDateKey(new Date());
            return (
              <button
                key={idx}
                onClick={() => {
                  setSelectedDate(key);
                  resetForm();
                  setForm((f) => ({ ...f, TANGGAL: key }));
                }}
                className={`relative aspect-square rounded-lg text-sm flex items-center justify-center ${
                  isSelected
                    ? 'bg-brand-600 text-white font-semibold'
                    : isToday
                    ? 'bg-brand-50 text-brand-700 font-semibold'
                    : 'hover:bg-brand-50 text-brand-700'
                }`}
              >
                {d}
                {hasEntry && (
                  <span
                    className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${
                      isSelected ? 'bg-white' : 'bg-accent-green'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-brand-800 font-bold mb-1">
          📊 Rekap RHK — {viewDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
        </h3>
        <p className="text-sm text-brand-400 mb-4">Jumlah agenda per kategori RHK bulan ini (dari data di HP ini).</p>
        <div className="grid grid-cols-3 sm:grid-cols-3 gap-2">
          {RHK.map((r) => (
            <div key={r.no} className="border border-brand-100 rounded-lg p-2 text-center">
              <p className="text-xs text-brand-400">RHK {r.no}</p>
              <p className="text-lg font-bold text-brand-800">{rekapRhkBulanIni[r.no]}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-brand-800 font-bold mb-4">
          Agenda —{' '}
          {new Date(selectedDate).toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </h3>

        {selectedEntries.length === 0 ? (
          <p className="text-sm text-brand-400 mb-4">Belum ada agenda di tanggal ini.</p>
        ) : (
          <ul className="divide-y divide-brand-100 mb-4">
            {selectedEntries.map((en) => {
              const r = findRhk(en.RHK_NO);
              return (
                <li key={en.ID} className="py-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      {r && (
                        <span className="inline-block text-xs font-semibold text-brand-600 bg-brand-50 rounded px-1.5 py-0.5 mb-1">
                          RHK {r.no}: {r.title}
                        </span>
                      )}
                      <p className="text-sm text-brand-700">{en.KEGIATAN}</p>
                    </div>
                    <div className="flex gap-2 shrink-0 text-xs">
                      <button className="text-brand-600 underline" onClick={() => handleEdit(en)}>
                        Edit
                      </button>
                      <button className="text-brand-600 underline" onClick={() => setPreviewEntry(en)}>
                        PDF
                      </button>
                      <button className="text-red-600 underline" onClick={() => handleDelete(en.ID)}>
                        Hapus
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <form onSubmit={handleSave} className="space-y-3 border-t border-brand-100 pt-4">
          <p className="text-sm font-semibold text-brand-700">
            {editingId ? 'Edit Agenda' : '+ Tambah Agenda Baru'}
          </p>

          <div>
            <label className="label">Kategori RHK</label>
            <select
              className="input"
              value={form.RHK_NO}
              onChange={(e) => handleSelectRhk(Number(e.target.value))}
            >
              {RHK.map((r) => (
                <option key={r.no} value={r.no}>
                  RHK {r.no}: {r.title}
                </option>
              ))}
            </select>
          </div>

          {activeRhk?.options?.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {activeRhk.options.map((opt) => (
                <button
                  type="button"
                  key={opt}
                  onClick={() => handleSelectKegiatan(opt)}
                  className={`text-xs rounded-full px-3 py-1 border ${
                    form.KEGIATAN === opt
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'border-brand-200 text-brand-600'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          <input
            className="input"
            placeholder="Kegiatan..."
            value={form.KEGIATAN}
            onChange={(e) => setForm((f) => ({ ...f, KEGIATAN: e.target.value }))}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              className="input"
              placeholder="Desa (opsional)"
              value={form.DESA}
              onChange={(e) => setForm((f) => ({ ...f, DESA: e.target.value }))}
            />
            <input
              className="input"
              placeholder="Kelompok (opsional)"
              value={form.KELOMPOK}
              onChange={(e) => setForm((f) => ({ ...f, KELOMPOK: e.target.value }))}
            />
            <input
              className="input"
              placeholder="Sasaran (opsional)"
              value={form.SASARAN}
              onChange={(e) => setForm((f) => ({ ...f, SASARAN: e.target.value }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-brand-700">Narasi Laporan</p>
            <button
              type="button"
              className="text-xs text-brand-600 underline"
              onClick={() => regenerateNarasi()}
            >
              🔄 Buat Ulang Otomatis
            </button>
          </div>

          <div>
            <label className="label">Latar Belakang / Umum</label>
            <textarea
              className="input"
              rows={3}
              value={form.UMUM}
              onChange={(e) => setForm((f) => ({ ...f, UMUM: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Tujuan</label>
            <textarea
              className="input"
              rows={3}
              value={form.TUJUAN}
              onChange={(e) => setForm((f) => ({ ...f, TUJUAN: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Uraian Pelaksanaan</label>
            <textarea
              className="input"
              rows={3}
              value={form.NARASI}
              onChange={(e) => setForm((f) => ({ ...f, NARASI: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Hasil</label>
            <textarea
              className="input"
              rows={3}
              value={form.HASIL}
              onChange={(e) => setForm((f) => ({ ...f, HASIL: e.target.value }))}
            />
          </div>

          <div className="flex gap-2">
            <button className="btn-accent flex-1" disabled={!form.KEGIATAN.trim()}>
              {editingId ? 'Simpan Perubahan' : '+ Simpan Agenda'}
            </button>
            {editingId && (
              <button type="button" className="btn-ghost" onClick={resetForm}>
                Batal
              </button>
            )}
          </div>
        </form>
      </div>
    </div>

      {previewEntry && (
        <PreviewOverlay
          entry={previewEntry}
          namaPendamping={namaPendamping}
          jabatan={jabatan}
          nip={nip}
          onClose={() => setPreviewEntry(null)}
        />
      )}
    </>
  );
}

function PreviewOverlay({ entry, namaPendamping, jabatan, nip, onClose }) {
  const r = findRhk(entry.RHK_NO);
  const dasar = getDasar(Number(entry.RHK_NO));
  const tanggal = new Date(entry.TANGGAL).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 overflow-y-auto print:bg-white print:static">
      <div className="sticky top-0 z-10 bg-brand-800 text-white px-4 py-3 flex items-center justify-between print:hidden">
        <p className="font-semibold text-sm">Pratinjau Laporan Harian</p>
        <div className="flex gap-2">
          <button className="btn-ghost bg-white/10 text-white text-sm" onClick={onClose}>
            ← Kembali
          </button>
          <button className="btn-accent text-sm" onClick={() => window.print()}>
            🖨️ Export PDF
          </button>
        </div>
      </div>
      <div className="py-6 px-2 print:p-0">
        <div className="bg-white max-w-[210mm] mx-auto shadow-lg print:shadow-none p-10 text-sm text-black" style={{ fontFamily: 'Times New Roman, serif' }}>
          <div className="flex items-center justify-between gap-4 border-b-2 border-black pb-3 mb-4">
            <img src="/logo/kemensos.png" alt="" className="h-16 w-16 object-contain" />
            <div className="text-center flex-1">
              <p className="font-bold">KEMENTERIAN SOSIAL REPUBLIK INDONESIA</p>
              <p className="text-xs">Direktorat Jenderal Perlindungan dan Jaminan Sosial</p>
              <p className="text-xs">Direktorat Penanganan Fakir Miskin Perdesaan</p>
            </div>
            <img src="/logo/pkh.png" alt="" className="h-16 w-16 object-contain" />
          </div>

          <h1 className="text-center font-bold underline mb-4">LAPORAN HARIAN PELAKSANAAN TUGAS</h1>

          <table className="text-sm mb-4">
            <tbody>
              <tr>
                <td className="pr-2 align-top">Nama</td>
                <td className="pr-2 align-top">:</td>
                <td className="align-top">{namaPendamping || '-'}</td>
              </tr>
              <tr>
                <td className="pr-2 align-top">NIP</td>
                <td className="pr-2 align-top">:</td>
                <td className="align-top">{nip}</td>
              </tr>
              {jabatan && (
                <tr>
                  <td className="pr-2 align-top">Jabatan</td>
                  <td className="pr-2 align-top">:</td>
                  <td className="align-top">{jabatan}</td>
                </tr>
              )}
              <tr>
                <td className="pr-2 align-top">Tanggal Kegiatan</td>
                <td className="pr-2 align-top">:</td>
                <td className="align-top">{tanggal}</td>
              </tr>
              <tr>
                <td className="pr-2 align-top">RHK</td>
                <td className="pr-2 align-top">:</td>
                <td className="align-top">RHK {r?.no}: {r?.title}</td>
              </tr>
              <tr>
                <td className="pr-2 align-top">Kegiatan</td>
                <td className="pr-2 align-top">:</td>
                <td className="align-top">{entry.KEGIATAN}</td>
              </tr>
            </tbody>
          </table>

          <p className="font-bold mb-1">A. Dasar Kegiatan</p>
          <ol className="list-decimal ml-5 mb-4 space-y-0.5">
            {dasar.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ol>

          <p className="font-bold mb-1">B. Latar Belakang</p>
          <p className="text-justify mb-4 whitespace-pre-line">{entry.UMUM}</p>

          <p className="font-bold mb-1">C. Tujuan</p>
          <p className="text-justify mb-4 whitespace-pre-line">{entry.TUJUAN}</p>

          <p className="font-bold mb-1">D. Uraian Pelaksanaan Kegiatan</p>
          <p className="text-justify mb-4 whitespace-pre-line">{entry.NARASI}</p>

          <p className="font-bold mb-1">E. Hasil</p>
          <p className="text-justify mb-6 whitespace-pre-line">{entry.HASIL}</p>

          <div className="flex justify-end">
            <div className="text-center w-56">
              <p>Kediri, {tanggal}</p>
              <p>Pendamping Sosial PKH</p>
              <div className="h-16" />
              <p className="font-semibold underline">{namaPendamping || '-'}</p>
              <p>NIP. {nip}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
