'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Diamkan saja kalau gagal daftar — aplikasi tetap jalan normal online
      });
    }
  }, []);
  return null;
}
