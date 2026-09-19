const CACHE_PREFIX = 'kpm_cache_';
const QUEUE_KEY = 'kpm_sync_queue';

function safeParse(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function saveKpmCache(kecamatan, records, desaList) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(
    CACHE_PREFIX + kecamatan,
    JSON.stringify({ records, desaList, syncedAt: new Date().toISOString() })
  );
}

export function loadKpmCache(kecamatan) {
  if (typeof window === 'undefined') return null;
  return safeParse(localStorage.getItem(CACHE_PREFIX + kecamatan), null);
}

export function listCachedKecamatan() {
  if (typeof window === 'undefined') return [];
  return Object.keys(localStorage)
    .filter((k) => k.startsWith(CACHE_PREFIX))
    .map((k) => k.replace(CACHE_PREFIX, ''));
}

export function applyChangeToCache(kecamatan, nokk, changes) {
  const cache = loadKpmCache(kecamatan);
  if (!cache) return;
  const idx = cache.records.findIndex((r) => (r.NOKK || '').trim() === nokk.trim());
  if (idx >= 0) {
    cache.records[idx] = { ...cache.records[idx], ...changes };
    saveKpmCache(kecamatan, cache.records, cache.desaList);
  }
}

export function getQueue() {
  if (typeof window === 'undefined') return [];
  return safeParse(localStorage.getItem(QUEUE_KEY), []);
}

export function queueChange(change) {
  const queue = getQueue().filter(
    (q) => !(q.nokk === change.nokk && q.kecamatan === change.kecamatan)
  );
  queue.push({ ...change, queuedAt: new Date().toISOString() });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  applyChangeToCache(change.kecamatan, change.nokk, change);
}

function removeFromQueue(nokk, kecamatan) {
  const queue = getQueue().filter((q) => !(q.nokk === nokk && q.kecamatan === kecamatan));
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function flushQueue() {
  const queue = getQueue();
  let success = 0;
  let failed = 0;

  for (const change of queue) {
    try {
      const res = await fetch('/api/kpm', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(change),
      });
      if (res.ok) {
        removeFromQueue(change.nokk, change.kecamatan);
        success++;
      } else {
        failed++;
      }
    } catch {
      break;
    }
  }

  return { success, failed, remaining: getQueue().length };
}

// === Data Final Closing (murni lokal di HP, tidak dikirim ke server) ===
// Dipakai untuk menampilkan komponen & nominal bantuan di detail KPM, hasil
// menyandingkan data offline dengan file Final Closing yang diunggah sendiri
// oleh pendamping.
const FINAL_CLOSING_PREFIX = 'final_closing_';

export function saveFinalClosing(kecamatan, dataByNokk) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(
    FINAL_CLOSING_PREFIX + kecamatan,
    JSON.stringify({ data: dataByNokk, importedAt: new Date().toISOString() })
  );
}

export function loadFinalClosing(kecamatan) {
  if (typeof window === 'undefined') return null;
  return safeParse(localStorage.getItem(FINAL_CLOSING_PREFIX + kecamatan), null);
}

// === Cache Desa Dampingan (untuk isi dropdown kecamatan/desa tanpa perlu
// selalu online — disegarkan otomatis setiap kali berhasil fetch saat online) ===
const DESA_CACHE_PREFIX = 'desa_dampingan_';

export function saveDesaCache(nip, records) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DESA_CACHE_PREFIX + nip, JSON.stringify(records));
}

export function loadDesaCache(nip) {
  if (typeof window === 'undefined') return [];
  return safeParse(localStorage.getItem(DESA_CACHE_PREFIX + nip), []);
}

// === Cache nama desa dari CSV KPM per kecamatan (untuk pilihan "Desa
// Dampingan" di halaman profil) — sekali dimuat saat online, sesudahnya
// dropdown dibaca dari HP saja tanpa panggil server lagi. ===
const DESA_CSV_PREFIX = 'desa_csv_';

export function saveDesaCsvCache(kecamatan, desaList) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(
    DESA_CSV_PREFIX + kecamatan,
    JSON.stringify({ desaList, syncedAt: new Date().toISOString() })
  );
}

export function loadDesaCsvCache(kecamatan) {
  if (typeof window === 'undefined') return null;
  return safeParse(localStorage.getItem(DESA_CSV_PREFIX + kecamatan), null);
}

// === Jurnal Harian & RHK (murni lokal di HP masing-masing pendamping) ===
// Sengaja TIDAK dikirim ke server sama sekali — supaya isi jurnal harian
// bisa dibuka/diisi/dihapus tanpa internet, tanpa panggil server sekalipun.
const JURNAL_PREFIX = 'jurnal_harian_';

export function loadJurnalList(nip) {
  if (typeof window === 'undefined') return [];
  return safeParse(localStorage.getItem(JURNAL_PREFIX + nip), []);
}

function saveJurnalList(nip, list) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(JURNAL_PREFIX + nip, JSON.stringify(list));
}

export function addJurnalEntryLocal(nip, entry) {
  const list = loadJurnalList(nip);
  const item = { ...entry, ID: 'JH' + Date.now() };
  list.push(item);
  saveJurnalList(nip, list);
  return item;
}

export function deleteJurnalEntryLocal(nip, id) {
  const list = loadJurnalList(nip).filter((e) => e.ID !== id);
  saveJurnalList(nip, list);
}

export function updateJurnalEntryLocal(nip, id, patch) {
  const list = loadJurnalList(nip).map((e) => (e.ID === id ? { ...e, ...patch } : e));
  saveJurnalList(nip, list);
}
