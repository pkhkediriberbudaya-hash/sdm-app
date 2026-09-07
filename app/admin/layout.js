'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menus, setMenus] = useState([]);
  const [loadingMenus, setLoadingMenus] = useState(true);

  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    if (isLoginPage) return;
    fetch('/api/admin/menus')
      .then((res) => res.json())
      .then((data) => setMenus(data.menus || []))
      .finally(() => setLoadingMenus(false));
  }, [isLoginPage]);

  if (isLoginPage) return children;

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  }

  return (
    <div className="min-h-screen flex bg-navy-50">
      <aside className="w-60 bg-navy-800 text-white flex flex-col shrink-0">
        <div className="px-5 py-5 border-b border-navy-600">
          <p className="font-bold">SIM SDM</p>
          <p className="text-navy-100 text-xs">Panel Admin</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          <a
            href="/admin/reset-password"
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
              pathname === '/admin/reset-password'
                ? 'bg-rust-500 text-white'
                : 'text-navy-100 hover:bg-navy-600 hover:text-white'
            }`}
          >
            <span>🔑</span>
            <span>Reset Password</span>
          </a>
          <div className="border-t border-navy-600 my-2" />
          {loadingMenus ? (
            <p className="text-navy-100 text-sm px-2">Memuat menu...</p>
          ) : menus.length === 0 ? (
            <p className="text-navy-100 text-sm px-2">
              Belum ada menu terdaftar di sheet &quot;Menus&quot;.
            </p>
          ) : (
            menus.map((m) => {
              const href = `/admin/${encodeURIComponent(m.key)}`;
              const active = pathname === href;
              return (
                <a
                  key={m.key}
                  href={href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    active
                      ? 'bg-rust-500 text-white'
                      : 'text-navy-100 hover:bg-navy-600 hover:text-white'
                  }`}
                >
                  <span>{m.icon}</span>
                  <span>{m.label}</span>
                </a>
              );
            })
          )}
        </nav>
        <div className="px-3 py-4 border-t border-navy-600">
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-navy-100 hover:bg-navy-600 hover:text-white"
          >
            ↩ Keluar
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
