'use client';

import { useEffect, useState } from 'react';
import { usePathname, useParams, useRouter } from 'next/navigation';

export default function PegawaiLayout({ children }) {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const nip = decodeURIComponent(params.nip);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [profile, setProfile] = useState(null);

  const isGantiPassword = pathname.endsWith('/ganti-password');
  const homeHref = `/pegawai/${encodeURIComponent(nip)}`;
  const isHome = pathname === homeHref;

  useEffect(() => {
    if (isGantiPassword) return;
    fetch(`/api/pegawai/${encodeURIComponent(nip)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.record) setProfile(d.record);
      })
      .catch(() => {});
  }, [nip, isGantiPassword]);

  if (isGantiPassword) return children;

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  }

  const navItems = [
    { href: homeHref, label: 'Data Diri', icon: '👤' },
    { href: `${homeHref}/kpm`, label: 'Data KPM', icon: '🧾' },
    { href: `${homeHref}/ganti-password`, label: 'Ganti Password', icon: '🔑' },
  ];

  const activeItem = navItems.find((n) => n.href === pathname);
  const pageTitle = activeItem ? activeItem.label : 'Beranda';
  const sidebarWidth = collapsed ? 'w-16' : 'w-72';

  return (
    <div className="min-h-screen bg-[#f0f4f9]">
      <aside
        className={`fixed inset-y-0 left-0 z-40 ${sidebarWidth} bg-white border-r border-brand-100 flex flex-col transform transition-all duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } sm:translate-x-0`}
      >
        <div className="px-3 py-4 flex items-center gap-2 border-b border-brand-50">
          <div className="w-9 h-9 rounded-lg bg-brand-gradient flex items-center justify-center text-white font-bold text-sm shrink-0">
            S
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="font-bold text-brand-800 text-sm leading-tight truncate">SIM SDM</p>
              <p className="text-[10px] text-brand-400">Pendamping PKH</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="ml-auto hidden sm:inline text-brand-400 hover:text-brand-700 text-sm shrink-0"
            title={collapsed ? 'Perluas menu' : 'Lipat menu'}
          >
            {collapsed ? '»' : '«'}
          </button>
          <button
            className="ml-auto sm:hidden text-brand-400 text-xl leading-none"
            onClick={() => setSidebarOpen(false)}
          >
            &times;
          </button>
        </div>

        {!collapsed && (
          <div className="px-4 py-4 border-b border-brand-50 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-gradient flex items-center justify-center text-white text-lg shrink-0">
              👤
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-brand-800 truncate">
                {profile?.NAMA || nip}
              </p>
              <p className="text-xs text-brand-400 truncate">
                {profile?.KECAMATAN ? `Kec. ${profile.KECAMATAN}` : 'Pendamping Linjamsos'}
              </p>
            </div>
          </div>
        )}

        <nav className="flex-1 px-2 sm:px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`sidebar-link ${pathname === item.href ? 'active' : ''} ${
                collapsed ? 'justify-center px-0' : ''
              }`}
              onClick={() => setSidebarOpen(false)}
            >
              <span>{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </a>
          ))}
        </nav>

        <div className="px-2 sm:px-3 py-4 border-t border-brand-50">
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

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className={`flex flex-col min-h-screen transition-all duration-200 ${collapsed ? 'sm:ml-16' : 'sm:ml-72'}`}>
        <header className="sticky top-0 z-20 bg-brand-gradient-header text-white px-4 py-4 flex items-center justify-between shadow shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              className="sm:hidden text-xl leading-none"
              onClick={() => setSidebarOpen(true)}
            >
              ☰
            </button>
            {isHome ? (
              <div className="min-w-0">
                <p className="text-brand-100 text-[11px] leading-none">Selamat datang,</p>
                <p className="font-semibold text-sm sm:text-base truncate">
                  {profile?.NAMA || nip}{' '}
                  <span className="font-normal text-brand-100 text-xs sm:text-sm">
                    · NIP {nip}
                  </span>
                </p>
              </div>
            ) : (
              <p className="font-semibold text-sm sm:text-base truncate">{pageTitle}</p>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs sm:text-sm shrink-0">
            <span className="hidden sm:inline">
              {new Date().toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
            <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              🔔
            </span>
            <button
              onClick={handleLogout}
              title="Keluar"
              className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30"
            >
              🚪
            </button>
          </div>
        </header>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
