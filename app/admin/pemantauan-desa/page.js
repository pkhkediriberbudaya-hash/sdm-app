'use client';

import { useEffect, useState, useMemo } from 'react';

export default function PemantauanDesaPage() {
  const [sdm, setSdm] = useState([]);
  const [desaDampingan, setDesaDampingan] = useState([]);
  const [masterKelompok, setMasterKelompok] = useState([]);
  const [loading, setLoading] = useState(true);

  const [expandedKec, setExpandedKec] = useState(new Set());
  const [expandedPend, setExpandedPend] = useState(new Set());
  const [expandedDesa, setExpandedDesa] = useState(new Set());

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/data/SDM').then((r) => r.json()).catch(() => ({ records: [] })),
      fetch('/api/admin/data/DesaDampingan').then((r) => r.json()).catch(() => ({ records: [] })),
      fetch('/api/admin/data/MasterKelompok').then((r) => r.json()).catch(() => ({ records: [] })),
    ]).then(([sdmData, desaData, kelompokData]) => {
      setSdm(sdmData.records || []);
      setDesaDampingan(desaData.records || []);
      setMasterKelompok(kelompokData.records || []);
      setLoading(false);
    });
  }, []);

  const tree = useMemo(() => {
    const kecMap = new Map();

    function ensureKec(kec) {
      if (!kecMap.has(kec)) kecMap.set(kec, { pendamping: new Map(), belum: [] });
      return kecMap.get(kec);
    }

    desaDampingan.forEach((d) => {
      const kec = d.KECAMATAN || '(Tanpa Kecamatan)';
      const nip = (d.NIP || '').trim();
      if (!nip) return;
      const kecNode = ensureKec(kec);
      if (!kecNode.pendamping.has(nip)) {
        const sdmRow = sdm.find((s) => (s.NIP || '').trim() === nip);
        kecNode.pendamping.set(nip, { nama: sdmRow?.NAMA || nip, desa: new Map() });
      }
      const pendNode = kecNode.pendamping.get(nip);
      if (!pendNode.desa.has(d.NAMA_DESA)) {
        pendNode.desa.set(d.NAMA_DESA, new Set());
      }
    });

    masterKelompok.forEach((k) => {
      const kec = k.KECAMATAN || '(Tanpa Kecamatan)';
      const nip = (k.NIP || '').trim();
      const kecNode = kecMap.get(kec);
      if (!kecNode) return;
      const pendNode = kecNode.pendamping.get(nip);
      if (!pendNode) return;
      const desaSet = pendNode.desa.get(k.DESA_DAMPINGAN);
      if (desaSet && k.NAMA_KELOMPOK) desaSet.add(k.NAMA_KELOMPOK);
    });

    sdm.forEach((s) => {
      const nip = (s.NIP || '').trim();
      if (!nip) return;
      const hasEntry = desaDampingan.some((d) => (d.NIP || '').trim() === nip);
      if (!hasEntry) {
        const kec = s.KECAMATAN || '(Tanpa Kecamatan)';
        const kecNode = ensureKec(kec);
        kecNode.belum.push(s.NAMA || nip);
      }
    });

    return kecMap;
  }, [sdm, desaDampingan, masterKelompok]);

  function toggle(setFn, key) {
    setFn((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-brand-400">Memuat...</p>
      </div>
    );
  }

  const sortedKec = Array.from(tree.entries()).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-xl font-bold text-brand-800 mb-1">🗂️ Pemantauan Desa Dampingan</h1>
      <p className="text-sm text-brand-400 mb-6">
        Klik kecamatan untuk melihat pendamping, desa, dan kelompoknya (seperti grand total Excel).
        Pendamping yang belum mengisi Desa Dampingan sama sekali ditandai merah.
      </p>

      <div className="space-y-2 max-w-3xl">
        {sortedKec.map(([kec, kecNode]) => {
          const kecOpen = expandedKec.has(kec);
          const totalPend = kecNode.pendamping.size;
          return (
            <div key={kec} className="card overflow-hidden">
              <button
                onClick={() => toggle(setExpandedKec, kec)}
                className="w-full flex items-center justify-between px-4 py-3 bg-brand-50 hover:bg-brand-100 text-left"
              >
                <span className="font-semibold text-brand-800">
                  {kecOpen ? '▾' : '▸'} {kec}
                </span>
                <span className="text-xs text-brand-500">
                  {totalPend} pendamping mengisi
                  {kecNode.belum.length > 0 && (
                    <span className="text-red-600 ml-2">· {kecNode.belum.length} belum</span>
                  )}
                </span>
              </button>

              {kecOpen && (
                <div className="px-4 py-3 space-y-2">
                  {kecNode.belum.length > 0 && (
                    <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-2">
                      <p className="text-xs font-semibold text-red-700 mb-1">
                        Belum mengisi Desa Dampingan:
                      </p>
                      <p className="text-sm text-red-600">{kecNode.belum.join(', ')}</p>
                    </div>
                  )}

                  {Array.from(kecNode.pendamping.entries())
                    .sort(([, a], [, b]) => a.nama.localeCompare(b.nama))
                    .map(([nip, pend]) => {
                      const pendKey = `${kec}__${nip}`;
                      const pendOpen = expandedPend.has(pendKey);
                      return (
                        <div key={nip} className="border border-brand-100 rounded-lg overflow-hidden">
                          <button
                            onClick={() => toggle(setExpandedPend, pendKey)}
                            className="w-full flex items-center justify-between px-3 py-2 hover:bg-brand-50 text-left"
                          >
                            <span className="text-sm font-medium text-brand-700">
                              {pendOpen ? '▾' : '▸'} {pend.nama}
                            </span>
                            <span className="text-xs text-brand-400">{pend.desa.size} desa</span>
                          </button>
                          {pendOpen && (
                            <div className="px-3 py-2 space-y-1 bg-white">
                              {Array.from(pend.desa.entries())
                                .sort(([a], [b]) => a.localeCompare(b))
                                .map(([desa, kelompokSet]) => {
                                  const desaKey = `${pendKey}__${desa}`;
                                  const desaOpen = expandedDesa.has(desaKey);
                                  return (
                                    <div key={desa} className="pl-3 border-l-2 border-brand-100">
                                      <button
                                        onClick={() => toggle(setExpandedDesa, desaKey)}
                                        className="w-full flex items-center justify-between py-1 text-left hover:text-brand-700"
                                      >
                                        <span className="text-sm text-brand-600">
                                          {kelompokSet.size > 0 ? (desaOpen ? '▾' : '▸') : '·'}{' '}
                                          {desa}
                                        </span>
                                        {kelompokSet.size > 0 && (
                                          <span className="text-xs text-brand-400">
                                            {kelompokSet.size} kelompok
                                          </span>
                                        )}
                                      </button>
                                      {desaOpen && kelompokSet.size > 0 && (
                                        <ul className="pl-4 pb-1 text-xs text-brand-500 list-disc list-inside">
                                          {Array.from(kelompokSet)
                                            .sort()
                                            .map((kl) => (
                                              <li key={kl}>{kl}</li>
                                            ))}
                                        </ul>
                                      )}
                                    </div>
                                  );
                                })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
