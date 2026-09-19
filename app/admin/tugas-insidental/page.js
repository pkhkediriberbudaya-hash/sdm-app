'use client';

import { useEffect, useState, useCallback } from 'react';

const EMPTY_FORM = { JUDUL: '', DEADLINE: '', LINK: '', DESKRIPSI: '' };

export default function AdminTugasInsidentalPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/tugas-insidental')
      .then((r) => r.json())
      .then((d) => setList(d.records || []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd(e) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/tugas-insidental', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Gagal menyimpan' });
        return;
      }
      setMessage({ type: 'success', text: 'Tugas berhasil ditambahkan & langsung tampil di aplikasi pegawai.' });
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row) {
    if (!confirm(`Hapus tugas "${row.JUDUL}"?`)) return;
    await fetch(`/api/admin/data/TugasInsidental/${row._row}`, { method: 'DELETE' });
    load();
  }

  const sorted = [...list].sort((a, b) => new Date(a.DEADLINE || '9999-12-31') - new Date(b.DEADLINE || '9999-12-31'));

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-brand-800">📌 Tugas Insidental</h1>
        <p className="text-sm text-brand-400">
          Tugas yang ditambahkan di sini akan langsung muncul di menu "Tugas Insidental" seluruh
          aplikasi pegawai.
        </p>
      </div>

      <div className="card p-5">
        <p className="text-sm font-semibold text-brand-700 mb-3">+ Tambah Tugas Baru</p>
        <form onSubmit={handleAdd} className="space-y-3">
          <input
            className="input"
            placeholder="Judul tugas"
            value={form.JUDUL}
            onChange={(e) => setForm((f) => ({ ...f, JUDUL: e.target.value }))}
            required
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              className="input"
              type="date"
              value={form.DEADLINE}
              onChange={(e) => setForm((f) => ({ ...f, DEADLINE: e.target.value }))}
            />
            <input
              className="input"
              type="url"
              placeholder="Link tugas (https://...)"
              value={form.LINK}
              onChange={(e) => setForm((f) => ({ ...f, LINK: e.target.value }))}
              required
            />
          </div>
          <textarea
            className="input"
            rows={2}
            placeholder="Deskripsi singkat (opsional)"
            value={form.DESKRIPSI}
            onChange={(e) => setForm((f) => ({ ...f, DESKRIPSI: e.target.value }))}
          />
          {message && (
            <p className={`text-sm rounded-lg px-3 py-2 ${message.type === 'error' ? 'text-red-600 bg-red-50 border border-red-100' : 'text-green-700 bg-green-50 border border-green-100'}`}>
              {message.text}
            </p>
          )}
          <button className="btn-accent" disabled={saving}>
            {saving ? 'Menyimpan...' : '+ Tambah & Sebarkan ke Pegawai'}
          </button>
        </form>
      </div>

      <div className="card p-5">
        <p className="text-sm font-semibold text-brand-700 mb-3">Daftar Tugas Aktif</p>
        {loading ? (
          <p className="text-sm text-brand-400">Memuat...</p>
        ) : sorted.length === 0 ? (
          <p className="text-sm text-brand-400">Belum ada tugas insidental.</p>
        ) : (
          <ul className="divide-y divide-brand-100">
            {sorted.map((t) => (
              <li key={t._row} className="py-3 flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-brand-800">{t.JUDUL}</p>
                  <p className="text-xs text-brand-400">
                    {t.DEADLINE
                      ? `Deadline: ${new Date(t.DEADLINE).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`
                      : 'Tanpa deadline'}
                  </p>
                  {t.DESKRIPSI && <p className="text-sm text-brand-600 mt-1">{t.DESKRIPSI}</p>}
                  <a href={t.LINK} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-600 underline break-all">
                    {t.LINK}
                  </a>
                </div>
                <button className="text-red-600 text-xs underline shrink-0" onClick={() => handleDelete(t)}>
                  Hapus
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
