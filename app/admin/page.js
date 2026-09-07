'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminHome() {
  const router = useRouter();
  const [menus, setMenus] = useState(null);

  useEffect(() => {
    fetch('/api/admin/menus')
      .then((res) => res.json())
      .then((data) => {
        const list = data.menus || [];
        setMenus(list);
        if (list.length > 0) {
          router.replace(`/admin/${encodeURIComponent(list[0].key)}`);
        }
      });
  }, [router]);

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold text-navy-700 mb-2">Selamat datang</h1>
      {menus === null ? (
        <p className="text-navy-400">Memuat menu...</p>
      ) : menus.length === 0 ? (
        <div className="card p-5 max-w-lg">
          <p className="text-navy-700 mb-2 font-semibold">Belum ada menu terdaftar.</p>
          <p className="text-sm text-navy-400">
            Tambahkan baris pada sheet <b>Menus</b> di Google Sheets Anda dengan kolom KEY,
            LABEL, SHEET_NAME, PRIMARY_KEY, ICON, ORDER. Lihat README untuk contoh data awal.
          </p>
        </div>
      ) : (
        <p className="text-navy-400">Mengarahkan ke menu pertama...</p>
      )}
    </div>
  );
}
