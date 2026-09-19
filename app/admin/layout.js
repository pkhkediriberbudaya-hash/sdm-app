'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menus, setMenus] = useState([]);
  const [loadingMenus, setLoadingMenus] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

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

  const staticLinks = [
    { href: '/admin/pemantauan-desa', icon: '🗂️', label: 'Pemantauan Desa' },
    { href: '/admin/keluar-kpm', icon: '📤', label: 'PPSE & Graduasi' },
    { href: '/admin/p2k2-modul', icon: '📚', label: 'Modul P2K2' },
    { href: '/admin/tugas-insidental', icon: '📌', label: 'Tugas Insidental' },
    { href: '/admin/kpm-upload', icon: '📥', label: 'Upload Data KPM' },
    { href: '/admin/reset-password', icon: '🔑', label: 'Reset Password' },
  ];

  return (
    <div className="min-h-screen flex bg-[#f0f4f9]">
      <aside
        className={`${
          collapsed ? 'w-16' : 'w-64'
        } bg-white border-r border-brand-100 flex flex-col shrink-0 transition-all duration-200`}
      >
        <div className="px-3 py-4 flex items-center gap-2 border-b border-brand-50">
          <img
            src="/logo/simsdm-icon.png"
            alt="Logo SIM SDM"
            className="w-8 h-8 rounded-lg object-contain shrink-0 bg-white"
          />
          {!collapsed && (
            <div className="min-w-0">
              <p className="font-bold text-brand-800 text-sm leading-tight truncate">SIM SDM</p>
              <p className="text-[10px] text-brand-400">Panel Admin</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="ml-auto text-brand-400 hover:text-brand-700 text-sm shrink-0"
            title={collapsed ? 'Perluas menu' : 'Lipat menu'}
          >
            {collapsed ? '»' : '«'}
          </button>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
          {staticLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              title={collapsed ? link.label : undefined}
              className={`sidebar-link ${pathname === link.href ? 'active' : ''} ${
                collapsed ? 'justify-center px-0' : ''
              }`}
            >
              <span>{link.icon}</span>
              {!collapsed && <span>{link.label}</span>}
            </a>
          ))}
          <div className="border-t border-brand-50 my-2" />
          {loadingMenus ? (
            !collapsed && <p className="text-brand-400 text-sm px-2">Memuat menu...</p>
          ) : menus.length === 0 ? (
            !collapsed && (
              <p className="text-brand-400 text-sm px-2">
                Belum ada menu terdaftar di sheet &quot;Menus&quot;.
              </p>
            )
          ) : (
            menus.map((m) => {
              const href = `/admin/${encodeURIComponent(m.key)}`;
              const active = pathname === href;
              return (
                <a
                  key={m.key}
                  href={href}
                  title={collapsed ? m.label : undefined}
                  className={`sidebar-link ${active ? 'active' : ''} ${
                    collapsed ? 'justify-center px-0' : ''
                  }`}
                >
                  <span>{m.icon}</span>
                  {!collapsed && <span>{m.label}</span>}
                </a>
              );
            })
          )}
        </nav>
        <div className="px-2 py-4 border-t border-brand-50">
          <button
            onClick={handleLogout}
            title={collapsed ? 'Keluar' : undefined}
            className={`sidebar-link w-full text-left ${collapsed ? 'justify-center px-0' : ''}`}
          >
            <span>↩</span>
            {!collapsed && <span>Keluar</span>}
          </button>
        </div>
      </aside>
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 bg-brand-gradient-header text-white px-6 py-4 flex items-center justify-between shadow">
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
