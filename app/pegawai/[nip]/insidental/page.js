'use client';

import { useEffect, useState } from 'react';

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}

export default function TugasInsidentalPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/tugas-insidental')
      .then((r) => r.json())
      .then((d) => setList(d.records || []))
      .catch(() => setError('Gagal memuat daftar tugas. Coba lagi saat online.'))
      .finally(() => setLoading(false));
  }, []);

  const sorted = [...list].sort(
    (a, b) => new Date(a.DEADLINE || '9999-12-31') - new Date(b.DEADLINE || '9999-12-31')
  );

  return (
    <div className="px-4 py-6 pb-16 max-w-3xl mx-auto space-y-6">
      <div className="card p-5">
        <h2 className="text-brand-800 font-bold mb-1">📌 Tugas Insidental</h2>
        <p className="text-sm text-brand-400 mb-4">
          Tugas mendadak/di luar 9 RHK rutin yang diberikan admin — klik judulnya untuk membuka
          link tugasnya.
        </p>

        {loading ? (
          <p className="text-sm text-brand-400">Memuat...</p>
        ) : error ? (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        ) : sorted.length === 0 ? (
          <p className="text-sm text-brand-400">Belum ada tugas insidental dari admin.</p>
        ) : (
          <ul className="divide-y divide-brand-100">
            {sorted.map((t) => {
              const dleft = daysUntil(t.DEADLINE);
              const overdue = dleft !== null && dleft < 0;
              const soon = dleft !== null && dleft >= 0 && dleft <= 2;
              return (
                <li key={t.ID} className="py-3">
                  <a
                    href={t.LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-brand-800 underline"
                  >
                    {t.JUDUL}
                  </a>
                  {t.DEADLINE && (
                    <p
                      className={`text-xs mt-0.5 ${
                        overdue ? 'text-red-600 font-semibold' : soon ? 'text-orange-600 font-semibold' : 'text-brand-400'
                      }`}
                    >
                      Deadline:{' '}
                      {new Date(t.DEADLINE).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                      {overdue ? ' · Lewat tenggat' : soon ? ` · ${dleft === 0 ? 'Hari ini' : `${dleft} hari lagi`}` : ''}
                    </p>
                  )}
                  {t.DESKRIPSI && <p className="text-sm text-brand-700 mt-1">{t.DESKRIPSI}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
