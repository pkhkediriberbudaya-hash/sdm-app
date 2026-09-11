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
    <div className="min-h-screen flex bg-[#f0f4f9]">
      <aside className="w-64 bg-white border-r border-brand-100 flex flex-col shrink-0">
        <div className="px-5 py-4 flex items-center gap-2 border-b border-brand-50">
          <div className="w-8 h-8 rounded-lg bg-brand-gradient flex items-center justify-center text-white font-bold text-sm">
            S
          </div>
          <div>
            <p className="font-bold text-brand-800 text-sm leading-tight">SIM SDM</p>
            <p className="text-[10px] text-brand-400">Panel Admin</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <a
            href="/admin/kpm-upload"
            className={`sidebar-link ${pathname === '/admin/kpm-upload' ? 'active' : ''}`}
          >
            <span>📥</span>
            <span>Upload Data KPM</span>
          </a>
          <a
            href="/admin/reset-password"
            className={`sidebar-link ${pathname === '/admin/reset-password' ? 'active' : ''}`}
          >
            <span>🔑</span>
            <span>Reset Password</span>
          </a>
          <div className="border-t border-brand-50 my-2" />
          {loadingMenus ? (
            <p className="text-brand-400 text-sm px-2">Memuat menu...</p>
          ) : menus.length === 0 ? (
            <p className="text-brand-400 text-sm px-2">
              Belum ada menu terdaftar di sheet &quot;Menus&quot;.
            </p>
          ) : (
            menus.map((m) => {
              const href = `/admin/${encodeURIComponent(m.key)}`;
              const active = pathname === href;
              return (
                <a key={m.key} href={href} className={`sidebar-link ${active ? 'active' : ''}`}>
                  <span>{m.icon}</span>
                  <span>{m.label}</span>
                </a>
              );
            })
          )}
        </nav>
        <div className="px-3 py-4 border-t border-brand-50">
          <button onClick={handleLogout} className="sidebar-link w-full text-left">
            <span>↩</span>
            <span>Keluar</span>
          </button>
        </div>
      </aside>
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="bg-brand-gradient-header text-white px-6 py-4 flex items-center justify-between shadow">
          <p className="font-semibold">Panel Admin</p>
          <span className="text-sm text-brand-100">
            {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </header>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
