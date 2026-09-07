'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';

const READONLY_FIELDS = ['NO', 'NIP', 'NIK', 'STATUS DATA'];

const STATIC_GROUPS = [
  {
    title: 'Data Utama',
    fields: ['NIP', 'NIK', 'NAMA', 'KECAMATAN', 'JABATAN'],
  },
  {
    title: 'Data Pribadi',
    fields: [
      'ALAMAT (SESUAI KTP)',
      'KABUPATEN/KOTA (SESUAI KTP)',
      'KECAMATAN (SESUAI KTP)',
      'KELURAHAN/DESA (SESUAI KTP)',
      'JENIS KELAMIN',
      'TEMPAT LAHIR',
      'TANGGAL LAHIR',
      'USIA',
      'AGAMA',
      'STATUS PERNIKAHAN',
      'JUMLAH ANAK',
      'NO HP / WA',
      'EMAIL',
      'IBU KANDUNG',
    ],
  },
  {
    title: 'Pendidikan',
    fields: ['PERGURUAN TINGGI/ SEKOLAH TERAKHIR', 'JURUSAN ', 'JENJANG'],
  },
  {
    title: 'Rekening & Administrasi',
    fields: [
      'NO REKENING',
      'NAMA REKENING',
      'BANK',
      'NOMER REKENING BANK JATIM',
      'NO NPWP',
      'NO BPJS KESEHATAN',
      'NO BPJS KETENAGA KERJAAN PUSAT',
      'NO BPJS KETENAGA KERJAAN MANDIRI',
      'ID PEGAWAI',
      'TMG KOHOR',
      'TMT JABATAN',
    ],
  },
];

export default function PegawaiPage() {
  const params = useParams();
  const router = useRouter();
  const nip = decodeURIComponent(params.nip);

  const [headers, setHeaders] = useState([]);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [errorLoad, setErrorLoad] = useState('');
  const [fieldConfig, setFieldConfig] = useState([]);

  const [desaList, setDesaList] = useState([]);
  const [desaLoading, setDesaLoading] = useState(true);
  const [newDesa, setNewDesa] = useState({ NAMA_DESA: '', KECAMATAN: '', KETERANGAN: '' });
  const [addingDesa, setAddingDesa] = useState(false);

  const [keluargaList, setKeluargaList] = useState([]);
  const [keluargaLoading, setKeluargaLoading] = useState(true);
  const [newKeluarga, setNewKeluarga] = useState({
    NAMA: '',
    HUBUNGAN: '',
    TANGGAL_LAHIR: '',
    PEKERJAAN: '',
    KETERANGAN: '',
  });
  const [addingKeluarga, setAddingKeluarga] = useState(false);

  const loadPegawai = useCallback(async () => {
    setLoading(true);
    setErrorLoad('');
    try {
      const res = await fetch(`/api/pegawai/${encodeURIComponent(nip)}`);
      const data = await res.json();
      if (!res.ok) {
        setErrorLoad(data.error || 'Gagal memuat data');
        setLoading(false);
        return;
      }
      setHeaders(data.headers);
      setForm(data.record);
    } catch {
      setErrorLoad('Gagal terhubung ke server.');
    } finally {
      setLoading(false);
    }
  }, [nip]);

  const loadFieldConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/field-config');
      const data = await res.json();
      setFieldConfig(data.config || []);
    } catch {
      setFieldConfig([]);
    }
  }, []);

  const loadDesa = useCallback(async () => {
    setDesaLoading(true);
    try {
      const res = await fetch(`/api/desa?nip=${encodeURIComponent(nip)}`);
      const data = await res.json();
      setDesaList(data.records || []);
    } catch {
      // ignore
    } finally {
      setDesaLoading(false);
    }
  }, [nip]);

  const loadKeluarga = useCallback(async () => {
    setKeluargaLoading(true);
    try {
      const res = await fetch(`/api/keluarga?nip=${encodeURIComponent(nip)}`);
      const data = await res.json();
      setKeluargaList(data.records || []);
    } catch {
      // ignore
    } finally {
      setKeluargaLoading(false);
    }
  }, [nip]);

  useEffect(() => {
    loadPegawai();
    loadFieldConfig();
    loadDesa();
    loadKeluarga();
  }, [loadPegawai, loadFieldConfig, loadDesa, loadKeluarga]);

  function handleChange(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/pegawai/${encodeURIComponent(nip)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Gagal menyimpan data' });
      } else {
        setMessage({ type: 'success', text: 'Data berhasil disimpan.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Gagal terhubung ke server.' });
    } finally {
      setSaving(false);
    }
  }

  async function handleAddDesa(e) {
    e.preventDefault();
    if (!newDesa.NAMA_DESA.trim()) return;
    setAddingDesa(true);
    try {
      await fetch('/api/desa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDesa),
      });
      setNewDesa({ NAMA_DESA: '', KECAMATAN: '', KETERANGAN: '' });
      loadDesa();
    } finally {
      setAddingDesa(false);
    }
  }

  async function handleDeleteDesa(id) {
    if (!confirm('Hapus data desa dampingan ini?')) return;
    await fetch(`/api/desa/${encodeURIComponent(id)}`, { method: 'DELETE' });
    loadDesa();
  }

  async function handleAddKeluarga(e) {
    e.preventDefault();
    if (!newKeluarga.NAMA.trim()) return;
    setAddingKeluarga(true);
    try {
      await fetch('/api/keluarga', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newKeluarga),
      });
      setNewKeluarga({
        NAMA: '',
        HUBUNGAN: '',
        TANGGAL_LAHIR: '',
        PEKERJAAN: '',
        KETERANGAN: '',
      });
      loadKeluarga();
    } finally {
      setAddingKeluarga(false);
    }
  }

  async function handleDeleteKeluarga(id) {
    if (!confirm('Hapus data anggota keluarga ini?')) return;
    await fetch(`/api/keluarga/${encodeURIComponent(id)}`, { method: 'DELETE' });
    loadKeluarga();
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  }

  const dynamicGroups = useMemo(() => {
    const staticFieldSet = new Set(STATIC_GROUPS.flatMap((g) => g.fields));
    const remaining = headers.filter(
      (h) => !staticFieldSet.has(h) && h !== 'STATUS DATA'
    );

    const configMap = new Map(fieldConfig.map((c) => [c.fieldName, c]));
    const groupsMap = new Map();

    remaining.forEach((field, idx) => {
      const cfg = configMap.get(field);
      const groupLabel = cfg?.groupLabel || 'Data Lainnya';
      const order = cfg ? cfg.order : 1000 + idx;
      if (!groupsMap.has(groupLabel)) groupsMap.set(groupLabel, []);
      groupsMap.get(groupLabel).push({ field, order });
    });

    return Array.from(groupsMap.entries()).map(([title, fields]) => ({
      title,
      fields: fields.sort((a, b) => a.order - b.order).map((f) => f.field),
    }));
  }, [headers, fieldConfig]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-navy-50">
        <p className="text-navy-600">Memuat data...</p>
      </main>
    );
  }

  if (errorLoad) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-navy-50 px-4">
        <div className="card p-6 max-w-sm text-center">
          <p className="text-red-600 mb-4">{errorLoad}</p>
          <button className="btn-primary" onClick={() => router.push('/')}>
            Kembali
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-navy-50 pb-16">
      <header className="bg-navy-700 text-white px-4 py-5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-navy-100 text-xs uppercase tracking-wide">Data Pegawai</p>
            <h1 className="text-lg font-bold">{form?.NAMA || nip}</h1>
          </div>
          <div className="flex items-center gap-4">
            <a
              href={`/pegawai/${encodeURIComponent(nip)}/ganti-password`}
              className="text-navy-100 text-sm underline"
            >
              Ganti Password
            </a>
            <button className="text-navy-100 text-sm underline" onClick={handleLogout}>
              Keluar
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 mt-6 space-y-6">
        <form onSubmit={handleSave} className="space-y-6">
          {STATIC_GROUPS.map((group) => (
            <div key={group.title} className="card p-5">
              <h2 className="text-navy-700 font-bold mb-4">{group.title}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {group.fields
                  .filter((f) => headers.includes(f))
                  .map((field) => (
                    <div key={field}>
                      <label className="label">{field.trim()}</label>
                      <input
                        className="input"
                        value={form?.[field] ?? ''}
                        onChange={(e) => handleChange(field, e.target.value)}
                        readOnly={READONLY_FIELDS.includes(field)}
                        disabled={READONLY_FIELDS.includes(field)}
                        style={
                          READONLY_FIELDS.includes(field)
                            ? { background: '#eef3f8', color: '#3d6690' }
                            : undefined
                        }
                      />
                    </div>
                  ))}
              </div>
            </div>
          ))}

          {dynamicGroups.map((group) => (
            <div key={group.title} className="card p-5">
              <h2 className="text-navy-700 font-bold mb-4">{group.title}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {group.fields.map((field) => (
                  <div key={field}>
                    <label className="label">{field.trim()}</label>
                    <input
                      className="input"
                      value={form?.[field] ?? ''}
                      onChange={(e) => handleChange(field, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

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

          <button type="submit" className="btn-primary w-full sm:w-auto" disabled={saving}>
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </form>

        <div className="card p-5">
          <h2 className="text-navy-700 font-bold mb-1">Desa Dampingan</h2>
          <p className="text-sm text-navy-400 mb-4">
            Daftar desa yang menjadi wilayah dampingan Anda.
          </p>

          {desaLoading ? (
            <p className="text-sm text-navy-400">Memuat...</p>
          ) : desaList.length === 0 ? (
            <p className="text-sm text-navy-400 mb-4">Belum ada desa dampingan tercatat.</p>
          ) : (
            <ul className="divide-y divide-navy-100 mb-4">
              {desaList.map((d) => (
                <li key={d.ID} className="py-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-navy-700">{d.NAMA_DESA}</p>
                    <p className="text-sm text-navy-400">
                      {d.KECAMATAN}
                      {d.KETERANGAN ? ` · ${d.KETERANGAN}` : ''}
                    </p>
                  </div>
                  <button
                    className="text-red-600 text-sm underline shrink-0"
                    onClick={() => handleDeleteDesa(d.ID)}
                  >
                    Hapus
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleAddDesa} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              className="input"
              placeholder="Nama desa"
              value={newDesa.NAMA_DESA}
              onChange={(e) => setNewDesa((s) => ({ ...s, NAMA_DESA: e.target.value }))}
            />
            <input
              className="input"
              placeholder="Kecamatan"
              value={newDesa.KECAMATAN}
              onChange={(e) => setNewDesa((s) => ({ ...s, KECAMATAN: e.target.value }))}
            />
            <input
              className="input"
              placeholder="Keterangan (opsional)"
              value={newDesa.KETERANGAN}
              onChange={(e) => setNewDesa((s) => ({ ...s, KETERANGAN: e.target.value }))}
            />
            <button
              type="submit"
              className="btn-accent sm:col-span-3"
              disabled={addingDesa || !newDesa.NAMA_DESA.trim()}
            >
              {addingDesa ? 'Menambahkan...' : '+ Tambah Desa Dampingan'}
            </button>
          </form>
        </div>

        <div className="card p-5">
          <h2 className="text-navy-700 font-bold mb-1">Anggota Keluarga</h2>
          <p className="text-sm text-navy-400 mb-4">
            Data anggota keluarga Anda (pasangan, anak, tanggungan, dsb).
          </p>

          {keluargaLoading ? (
            <p className="text-sm text-navy-400">Memuat...</p>
          ) : keluargaList.length === 0 ? (
            <p className="text-sm text-navy-400 mb-4">Belum ada data anggota keluarga.</p>
          ) : (
            <ul className="divide-y divide-navy-100 mb-4">
              {keluargaList.map((k) => (
                <li key={k.ID} className="py-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-navy-700">{k.NAMA}</p>
                    <p className="text-sm text-navy-400">
                      {k.HUBUNGAN}
                      {k.TANGGAL_LAHIR ? ` · Lahir ${k.TANGGAL_LAHIR}` : ''}
                      {k.PEKERJAAN ? ` · ${k.PEKERJAAN}` : ''}
                    </p>
                    {k.KETERANGAN && (
                      <p className="text-xs text-navy-400 mt-0.5">{k.KETERANGAN}</p>
                    )}
                  </div>
                  <button
                    className="text-red-600 text-sm underline shrink-0"
                    onClick={() => handleDeleteKeluarga(k.ID)}
                  >
                    Hapus
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleAddKeluarga} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              className="input"
              placeholder="Nama"
              value={newKeluarga.NAMA}
              onChange={(e) => setNewKeluarga((s) => ({ ...s, NAMA: e.target.value }))}
            />
            <input
              className="input"
              placeholder="Hubungan (misal: Istri, Anak)"
              value={newKeluarga.HUBUNGAN}
              onChange={(e) => setNewKeluarga((s) => ({ ...s, HUBUNGAN: e.target.value }))}
            />
            <input
              className="input"
              type="date"
              placeholder="Tanggal lahir"
              value={newKeluarga.TANGGAL_LAHIR}
              onChange={(e) =>
                setNewKeluarga((s) => ({ ...s, TANGGAL_LAHIR: e.target.value }))
              }
            />
            <input
              className="input"
              placeholder="Pekerjaan"
              value={newKeluarga.PEKERJAAN}
              onChange={(e) => setNewKeluarga((s) => ({ ...s, PEKERJAAN: e.target.value }))}
            />
            <input
              className="input sm:col-span-2"
              placeholder="Keterangan (opsional)"
              value={newKeluarga.KETERANGAN}
              onChange={(e) =>
                setNewKeluarga((s) => ({ ...s, KETERANGAN: e.target.value }))
              }
            />
            <button
              type="submit"
              className="btn-accent sm:col-span-2"
              disabled={addingKeluarga || !newKeluarga.NAMA.trim()}
            >
              {addingKeluarga ? 'Menambahkan...' : '+ Tambah Anggota Keluarga'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
