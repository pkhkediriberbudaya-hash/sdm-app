'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { RHK, findRhk } from '@/lib/rhk';
import { loadJurnalList, addJurnalEntryLocal, deleteJurnalEntryLocal } from '@/lib/offlineStorage';

const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

function toDateKey(d) {
  return d.toISOString().slice(0, 10);
}

export default function JurnalPage() {
  const params = useParams();
  const nip = decodeURIComponent(params.nip);

  const [entries, setEntries] = useState([]);
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(toDateKey(new Date()));
  const [rhkNo, setRhkNo] = useState(RHK[0].no);
  const [newKegiatan, setNewKegiatan] = useState('');

  const activeRhk = useMemo(() => findRhk(rhkNo), [rhkNo]);

  // Murni lokal di HP ini — tidak pernah dikirim ke server.
  useEffect(() => {
    setEntries(loadJurnalList(nip));
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

  // Rekap jumlah agenda per RHK bulan yang sedang dilihat.
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

  function handleSelectRhk(no) {
    setRhkNo(no);
    const r = findRhk(no);
    setNewKegiatan(r?.options?.[0] || '');
  }

  function handleAdd(e) {
    e.preventDefault();
    if (!newKegiatan.trim()) return;
    addJurnalEntryLocal(nip, {
      TANGGAL: selectedDate,
      KEGIATAN: newKegiatan,
      RHK_NO: rhkNo,
      RHK_TITLE: activeRhk?.title || '',
    });
    setEntries(loadJurnalList(nip));
    setNewKegiatan('');
  }

  function handleDelete(id) {
    if (!confirm('Hapus agenda ini?')) return;
    deleteJurnalEntryLocal(nip, id);
    setEntries(loadJurnalList(nip));
  }

  const selectedEntries = entriesByDate[selectedDate] || [];

  return (
    <div className="px-4 py-6 pb-16 max-w-3xl mx-auto space-y-6">
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
                onClick={() => setSelectedDate(key)}
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

      {/* REKAP RHK BULAN INI */}
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
                <li key={en.ID} className="py-2 flex items-start justify-between gap-3">
                  <div>
                    {r && (
                      <span className="inline-block text-xs font-semibold text-brand-600 bg-brand-50 rounded px-1.5 py-0.5 mb-1">
                        RHK {r.no}: {r.title}
                      </span>
                    )}
                    <p className="text-sm text-brand-700">{en.KEGIATAN}</p>
                  </div>
                  <button
                    className="text-red-600 text-xs underline shrink-0"
                    onClick={() => handleDelete(en.ID)}
                  >
                    Hapus
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <form onSubmit={handleAdd} className="space-y-3">
          <div>
            <label className="label">Kategori RHK</label>
            <select
              className="input"
              value={rhkNo}
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
                  onClick={() => setNewKegiatan(opt)}
                  className={`text-xs rounded-full px-3 py-1 border ${
                    newKegiatan === opt
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'border-brand-200 text-brand-600'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              className="input"
              placeholder="Tulis rencana kerja..."
              value={newKegiatan}
              onChange={(e) => setNewKegiatan(e.target.value)}
            />
            <button className="btn-accent shrink-0" disabled={!newKegiatan.trim()}>
              + Tambah
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
