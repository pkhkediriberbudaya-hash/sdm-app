'use client';

import { useEffect, useState, useCallback } from 'react';

export default function AdminP2K2ModulPage() {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [judul, setJudul] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/data/P2K2Modul')
      .then((r) => r.json())
      .then((d) => setModules(d.records || []))
      .catch(() => setModules([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('judul', judul || file.name);
      formData.append('deskripsi', deskripsi);
      const res = await fetch('/api/admin/p2k2-modul', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Gagal upload' });
      } else {
        setMessage({ type: 'success', text: 'Modul berhasil diupload.' });
        setJudul('');
        setDeskripsi('');
        setFile(null);
        e.target.reset();
        load();
      }
    } catch {
      setMessage({ type: 'error', text: 'Gagal terhubung ke server.' });
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(row) {
    if (!confirm('Hapus modul ini? (file di penyimpanan tidak ikut terhapus otomatis)')) return;
    await fetch(`/api/admin/data/P2K2Modul/${row._row}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-xl font-bold text-brand-800 mb-1">📚 Modul P2K2</h1>
      <p className="text-sm text-brand-400 mb-6">
        Upload file modul (PDF/Word) supaya bisa diunduh semua pendamping.
      </p>

      <form onSubmit={handleUpload} className="card p-5 max-w-xl space-y-4 mb-8">
        <div>
          <label className="label">Judul</label>
          <input className="input" value={judul} onChange={(e) => setJudul(e.target.value)} />
        </div>
        <div>
          <label className="label">Deskripsi (opsional)</label>
          <input className="input" value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} />
        </div>
        <div>
          <label className="label">File</label>
          <input
            type="file"
            accept=".pdf,.doc,.docx,.ppt,.pptx"
            className="input"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </div>

        {message && (
          <p
            className={`text-sm rounded-lg px-3 py-2 border ${
              message.type === 'success'
                ? 'text-green-700 bg-green-50 border-green-100'
                : 'text-red-600 bg-red-50 border-red-100'
            }`}
          >
            {message.text}
          </p>
        )}

        <button className="btn-primary" disabled={!file || uploading}>
          {uploading ? 'Mengupload...' : 'Upload Modul'}
        </button>
      </form>

      <div className="card overflow-x-auto">
        {loading ? (
          <p className="p-6 text-brand-400">Memuat...</p>
        ) : modules.length === 0 ? (
          <p className="p-6 text-brand-400">Belum ada modul.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-100 text-left">
                <th className="px-4 py-3 font-semibold text-brand-800">Judul</th>
                <th className="px-4 py-3 font-semibold text-brand-800">Deskripsi</th>
                <th className="px-4 py-3 font-semibold text-brand-800">Tanggal</th>
                <th className="px-4 py-3 font-semibold text-brand-800 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {modules.map((m) => (
                <tr key={m._row} className="border-b border-brand-50 hover:bg-brand-50">
                  <td className="px-4 py-3">{m.JUDUL}</td>
                  <td className="px-4 py-3">{m.DESKRIPSI}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{m.TANGGAL_UPLOAD}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <a
                      href={m.URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-600 underline text-sm mr-3"
                    >
                      Lihat
                    </a>
                    <button className="text-red-600 underline text-sm" onClick={() => handleDelete(m)}>
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
