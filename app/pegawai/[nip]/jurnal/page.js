'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';

const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

function toDateKey(d) {
  return d.toISOString().slice(0, 10);
}

export default function JurnalPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(toDateKey(new Date()));
  const [newKegiatan, setNewKegiatan] = useState('');
  const [saving, setSaving] = useState(false);

  const loadEntries = useCallback(() => {
    setLoading(true);
    fetch('/api/jurnal')
      .then((r) => r.json())
      .then((d) => setEntries(d.records || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

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

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function changeMonth(delta) {
    setViewDate(new Date(year, month + delta, 1));
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!newKegiatan.trim()) return;
    setSaving(true);
    try {
      await fetch('/api/jurnal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ TANGGAL: selectedDate, KEGIATAN: newKegiatan }),
      });
      setNewKegiatan('');
      loadEntries();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Hapus agenda ini?')) return;
    await fetch(`/api/jurnal/${encodeURIComponent(id)}`, { method: 'DELETE' });
    loadEntries();
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

        {loading ? (
          <p className="text-sm text-brand-400">Memuat...</p>
        ) : (
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
        )}
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
            {selectedEntries.map((en) => (
              <li key={en.ID} className="py-2 flex items-start justify-between gap-3">
                <p className="text-sm text-brand-700">{en.KEGIATAN}</p>
                <button
                  className="text-red-600 text-xs underline shrink-0"
                  onClick={() => handleDelete(en.ID)}
                >
                  Hapus
                </button>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            className="input"
            placeholder="Tulis rencana kerja..."
            value={newKegiatan}
            onChange={(e) => setNewKegiatan(e.target.value)}
          />
          <button className="btn-accent shrink-0" disabled={saving || !newKegiatan.trim()}>
            {saving ? '...' : '+ Tambah'}
          </button>
        </form>
      </div>
    </div>
  );
}
