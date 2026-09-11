'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { WILAYAH_KEDIRI } from '@/lib/wilayahKediri';

const READONLY_FIELDS = ['NO', 'NIP', 'NIK', 'STATUS DATA'];
const HIDDEN_FIELDS = ['NO', 'STATUS DATA'];

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
    fields: ['PERGURUAN TINGGI/ SEKOLAH TERAKHIR', 'JURUSAN', 'JENJANG'],
  },
  {
    title: 'Rekening & Administrasi',
    fields: [
      'NO REKENING',
      'NAMA REKENING',
      'BANK',
      'NOMER REKENING BANK JATIM',
      'NO REKENING MANDIRI',
      'NAMA REKENING MANDIRI',
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
  const [selectedKecamatan, setSelectedKecamatan] = useState('');
  const [selectedDesaSet, setSelectedDesaSet] = useState(new Set());
  const [addingDesa, setAddingDesa] = useState(false);

  const kecamatanList = useMemo(() => Object.keys(WILAYAH_KEDIRI).sort(), []);
  const desaOptions = useMemo(
    () => (selectedKecamatan ? WILAYAH_KEDIRI[selectedKecamatan] || [] : []),
    [selectedKecamatan]
  );

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

  function toggleDesa(namaDesa) {
    setSelectedDesaSet((prev) => {
      const next = new Set(prev);
      if (next.has(namaDesa)) next.delete(namaDesa);
      else next.add(namaDesa);
      return next;
    });
  }

  async function handleAddDesa(e) {
    e.preventDefault();
    if (!selectedKecamatan || selectedDesaSet.size === 0) return;
    setAddingDesa(true);
    try {
      const existing = new Set(
        desaList.filter((d) => d.KECAMATAN === selectedKecamatan).map((d) => d.NAMA_DESA)
      );
      const toAdd = Array.from(selectedDesaSet).filter((d) => !existing.has(d));
      await Promise.all(
        toAdd.map((namaDesa) =>
          fetch('/api/desa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ NAMA_DESA: namaDesa, KECAMATAN: selectedKecamatan }),
          })
        )
      );
      setSelectedDesaSet(new Set());
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
      setNewKeluarga({ NAMA: '', HUBUNGAN: '', TANGGAL_LAHIR: '', PEKERJAAN: '', KETERANGAN: '' });
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

  const staticTitles = useMemo(() => new Set(STATIC_GROUPS.map((g) => g.title)), []);

  const headerTrimMap = useMemo(
    () => new Map(headers.map((h) => [h.trim(), h])),
    [headers]
  );

  function resolveHeader(fieldName) {
    return headerTrimMap.get(fieldName) ?? fieldName;
  }

  const dynamicGroups = useMemo(() => {
    const staticFieldSet = new Set(STATIC_GROUPS.flatMap((g) => g.fields));
    const remaining = headers.filter(
      (h) => !staticFieldSet.has(h.trim()) && !HIDDEN_FIELDS.includes(h.trim())
    );

    const configMap = new Map(fieldConfig.map((c) => [c.fieldName, c]));
    const groupsMap = new Map();

    remaining.forEach((field, idx) => {
      const cfg = configMap.get(field.trim());
      const groupLabel = cfg?.groupLabel || 'Data Lainnya';
      const order = cfg ? cfg.order : 1000 + idx;
      if (!groupsMap.has(groupLabel)) groupsMap.set(groupLabel, []);
      groupsMap.get(groupLabel).push({ field, order });
    });

    return Array.from(groupsMap.entries())
      .filter(([title]) => !staticTitles.has(title))
      .map(([title, fields]) => ({
        title,
        fields: fields.sort((a, b) => a.order - b.order).map((f) => f.field),
      }));
  }, [headers, fieldConfig, staticTitles]);

  function extraFieldsFor(groupTitle) {
    const configMap = new Map(fieldConfig.map((c) => [c.fieldName, c]));
    const staticFieldSet = new Set(STATIC_GROUPS.flatMap((g) => g.fields));
    return headers
      .filter((h) => !staticFieldSet.has(h.trim()) && !HIDDEN_FIELDS.includes(h.trim()))
      .filter((h) => (configMap.get(h.trim())?.groupLabel || 'Data Lainnya') === groupTitle)
      .sort(
        (a, b) => (configMap.get(a.trim())?.order || 0) - (configMap.get(b.trim())?.order || 0)
      );
  }

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center py-20">
        <p className="text-brand-600">Memuat data...</p>
      </div>
    );
  }

  if (errorLoad) {
    return (
      <div className="min-h-full flex items-center justify-center py-20 px-4">
        <div className="card p-6 max-w-sm text-center">
          <p className="text-red-600 mb-4">{errorLoad}</p>
          <button className="btn-primary" onClick={() => router.push('/')}>
            Kembali
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 pb-16 max-w-3xl mx-auto space-y-6">
      {/* Kartu Selamat Datang ala SIKS-NG */}
      <div className="relative overflow-hidden rounded-2xl bg-brand-gradient p-6 text-white">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-16 right-10 w-28 h-28 rounded-full bg-white/5" />
        <p className="text-brand-100 text-sm relative">Selamat datang,</p>
        <h1 className="text-2xl font-bold mt-1 relative">{form?.NAMA || nip}</h1>
        <span className="inline-block mt-3 text-xs bg-white/15 backdrop-blur px-3 py-1 rounded-full relative">
          NIP {nip}
        </span>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {STATIC_GROUPS.map((group) => (
          <div key={group.title} className="card p-5">
            <h2 className="text-brand-800 font-bold mb-4">{group.title}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {group.fields
                .filter((f) => headerTrimMap.has(f))
                .map((field) => {
                  const actualField = resolveHeader(field);
                  return (
                    <div key={field}>
                      <label className="label">{field}</label>
                      <input
                        className="input"
                        value={form?.[actualField] ?? ''}
                        onChange={(e) => handleChange(actualField, e.target.value)}
                        readOnly={READONLY_FIELDS.includes(field)}
                        disabled={READONLY_FIELDS.includes(field)}
                        style={
                          READONLY_FIELDS.includes(field)
                            ? { background: '#eaf3fc', color: '#3d7fd9' }
                            : undefined
                        }
                      />
                    </div>
                  );
                })}
              {extraFieldsFor(group.title).map((field) => (
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

        {dynamicGroups.map((group) => (
          <div key={group.title} className="card p-5">
            <h2 className="text-brand-800 font-bold mb-4">{group.title}</h2>
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
        <h2 className="text-brand-800 font-bold mb-1">Desa Dampingan</h2>
        <p className="text-sm text-brand-400 mb-4">
          Daftar desa yang menjadi wilayah dampingan Anda.
        </p>

        {desaLoading ? (
          <p className="text-sm text-brand-400">Memuat...</p>
        ) : desaList.length === 0 ? (
          <p className="text-sm text-brand-400 mb-4">Belum ada desa dampingan tercatat.</p>
        ) : (
          <ul className="divide-y divide-brand-100 mb-4">
            {desaList.map((d) => (
              <li key={d.ID} className="py-3 flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-brand-800">{d.NAMA_DESA}</p>
                  <p className="text-sm text-brand-400">
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

        <form onSubmit={handleAddDesa} className="space-y-3">
          <div>
            <label className="label">Kecamatan</label>
            <select
              className="input"
              value={selectedKecamatan}
              onChange={(e) => {
                setSelectedKecamatan(e.target.value);
                setSelectedDesaSet(new Set());
              }}
            >
              <option value="">-- Pilih Kecamatan --</option>
              {kecamatanList.map((kec) => (
                <option key={kec} value={kec}>
                  {kec}
                </option>
              ))}
            </select>
          </div>

          {selectedKecamatan && (
            <div>
              <label className="label">Desa/Kelurahan (boleh pilih lebih dari satu)</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto border border-brand-100 rounded-lg p-3">
                {desaOptions.map((desa) => {
                  const alreadyAdded = desaList.some(
                    (d) => d.KECAMATAN === selectedKecamatan && d.NAMA_DESA === desa
                  );
                  return (
                    <label
                      key={desa}
                      className={`flex items-center gap-2 text-sm ${
                        alreadyAdded ? 'text-brand-400' : 'text-brand-800'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedDesaSet.has(desa) || alreadyAdded}
                        disabled={alreadyAdded}
                        onChange={() => toggleDesa(desa)}
                      />
                      {desa}
                      {alreadyAdded && ' (sudah)'}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn-accent w-full"
            disabled={addingDesa || selectedDesaSet.size === 0}
          >
            {addingDesa
              ? 'Menambahkan...'
              : `+ Tambah ${selectedDesaSet.size || ''} Desa Dampingan`.trim()}
          </button>
        </form>
      </div>

      <div className="card p-5">
        <h2 className="text-brand-800 font-bold mb-1">Anggota Keluarga</h2>
        <p className="text-sm text-brand-400 mb-4">
          Data anggota keluarga Anda (pasangan, anak, tanggungan, dsb).
        </p>

        {keluargaLoading ? (
          <p className="text-sm text-brand-400">Memuat...</p>
        ) : keluargaList.length === 0 ? (
          <p className="text-sm text-brand-400 mb-4">Belum ada data anggota keluarga.</p>
        ) : (
          <ul className="divide-y divide-brand-100 mb-4">
            {keluargaList.map((k) => (
              <li key={k.ID} className="py-3 flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-brand-800">{k.NAMA}</p>
                  <p className="text-sm text-brand-400">
                    {k.HUBUNGAN}
                    {k.TANGGAL_LAHIR ? ` · Lahir ${k.TANGGAL_LAHIR}` : ''}
                    {k.PEKERJAAN ? ` · ${k.PEKERJAAN}` : ''}
                  </p>
                  {k.KETERANGAN && <p className="text-xs text-brand-400 mt-0.5">{k.KETERANGAN}</p>}
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
            value={newKeluarga.TANGGAL_LAHIR}
            onChange={(e) => setNewKeluarga((s) => ({ ...s, TANGGAL_LAHIR: e.target.value }))}
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
            onChange={(e) => setNewKeluarga((s) => ({ ...s, KETERANGAN: e.target.value }))}
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
  );
}
