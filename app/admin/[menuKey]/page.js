'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';

export default function AdminMenuPage() {
  const params = useParams();
  const menuKey = decodeURIComponent(params.menuKey);

  const [menu, setMenu] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [modalRow, setModalRow] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  const loadMenu = useCallback(async () => {
    const res = await fetch('/api/admin/menus');
    const data = await res.json();
    const found = (data.menus || []).find((m) => m.key === menuKey);
    setMenu(found || null);
    return found;
  }, [menuKey]);

  const loadData = useCallback(async (sheetName) => {
    if (!sheetName) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/data/${encodeURIComponent(sheetName)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Gagal memuat data');
        return;
      }
      setHeaders(data.headers || []);
      setRecords(data.records || []);
    } catch {
      setError('Gagal terhubung ke server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const found = await loadMenu();
      if (found) await loadData(found.sheetName);
      else setLoading(false);
    })();
  }, [loadMenu, loadData]);

  const filtered = useMemo(() => {
    if (!search.trim()) return records;
    const q = search.toLowerCase();
    return records.filter((r) =>
      headers.some((h) => (r[h] || '').toString().toLowerCase().includes(q))
    );
  }, [records, headers, search]);

  const previewHeaders = headers.slice(0, 5);

  function openCreate() {
    setModalMode('create');
    setModalRow(null);
    const blank = {};
    headers.forEach((h) => (blank[h] = ''));
    setFormValues(blank);
    setModalError('');
    setModalOpen(true);
  }

  function openEdit(row) {
    setModalMode('edit');
    setModalRow(row);
    setFormValues({ ...row });
    setModalError('');
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setModalError('');
    try {
      const payload = { ...formValues };
      delete payload._row;
      let res;
      if (modalMode === 'create') {
        res = await fetch(`/api/admin/data/${encodeURIComponent(menu.sheetName)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(
          `/api/admin/data/${encodeURIComponent(menu.sheetName)}/${modalRow._row}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }
        );
      }
      const data = await res.json();
      if (!res.ok) {
        setModalError(data.error || 'Gagal menyimpan');
        return;
      }
      setModalOpen(false);
      loadData(menu.sheetName);
    } catch {
      setModalError('Gagal terhubung ke server.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row) {
    if (!confirm('Hapus baris data ini? Tindakan ini tidak bisa dibatalkan.')) return;
    await fetch(`/api/admin/data/${encodeURIComponent(menu.sheetName)}/${row._row}`, {
      method: 'DELETE',
    });
    loadData(menu.sheetName);
  }

  if (!menu && !loading) {
    return (
      <div className="p-8">
        <div className="card p-5 max-w-lg">
          <p className="text-brand-800 font-semibold mb-1">Menu tidak ditemukan</p>
          <p className="text-sm text-brand-400">
            Pastikan key <code>{menuKey}</code> terdaftar pada sheet <b>Menus</b>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-brand-800">
            {menu ? `${menu.icon} ${menu.label}` : 'Memuat...'}
          </h1>
          <p className="text-sm text-brand-400">
            {records.length} baris data{menu ? ` · sheet "${menu.sheetName}"` : ''}
          </p>
        </div>
        <button className="btn-accent" onClick={openCreate} disabled={!menu}>
          + Tambah Data
        </button>
      </div>

      <div className="mb-4">
        <input
          className="input max-w-sm"
          placeholder="Cari data..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      <div className="card overflow-x-auto">
        {loading ? (
          <p className="p-6 text-brand-400">Memuat data...</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-brand-400">Belum ada data.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-100 text-left">
                {previewHeaders.map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold text-brand-800 whitespace-nowrap">
                    {h}
                  </th>
                ))}
                <th className="px-4 py-3 font-semibold text-brand-800 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row._row} className="border-b border-brand-50 hover:bg-brand-50">
                  {previewHeaders.map((h) => (
                    <td key={h} className="px-4 py-3 whitespace-nowrap max-w-[220px] truncate">
                      {row[h]}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button className="text-brand-600 underline text-sm mr-3" onClick={() => openEdit(row)}>
                      Edit
                    </button>
                    <button className="text-red-600 underline text-sm" onClick={() => handleDelete(row)}>
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-brand-900/50 flex items-center justify-center p-4 z-50">
          <div className="card w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-brand-100 flex items-center justify-between">
              <h2 className="font-bold text-brand-800">
                {modalMode === 'create' ? 'Tambah Data' : 'Edit Data'}
              </h2>
              <button className="text-brand-400 text-xl leading-none" onClick={() => setModalOpen(false)}>
                &times;
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {headers.map((h) => (
                  <div key={h}>
                    <label className="label">{h.trim()}</label>
                    <input
                      className="input"
                      value={formValues[h] ?? ''}
                      onChange={(e) => setFormValues((f) => ({ ...f, [h]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>

              {modalError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {modalError}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" className="btn-ghost" onClick={() => setModalOpen(false)}>
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
