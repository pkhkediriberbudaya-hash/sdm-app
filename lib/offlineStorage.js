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
