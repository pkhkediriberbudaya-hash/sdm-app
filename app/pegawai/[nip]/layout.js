'use client';

import { useEffect, useState } from 'react';
import { usePathname, useParams, useRouter } from 'next/navigation';

export default function PegawaiLayout({ children }) {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const nip = decodeURIComponent(params.nip);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState(null);

  const isGantiPassword = pathname.endsWith('/ganti-password');

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
    { href: `/pegawai/${encodeURIComponent(nip)}`, label: 'Data Diri', icon: '👤' },
    { href: `/pegawai/${encodeURIComponent(nip)}/kpm`, label: 'Data KPM', icon: '🧾' },
    { href: `/pegawai/${encodeURIComponent(nip)}/ganti-password`, label: 'Ganti Password', icon: '🔑' },
  ];

  const activeItem = navItems.find((n) => n.href === pathname);
  const pageTitle = activeItem ? activeItem.label : 'Beranda';

  return (
    <div className="min-h-screen flex bg-[#f0f4f9]">
      <aside
        className={`fixed sm:static z-40 inset-y-0 left-0 w-72 bg-white border-r border-brand-100 flex flex-col transform transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } sm:translate-x-0`}
      >
        <div className="px-5 py-4 flex items-center gap-2 border-b border-brand-50">
          <div className="w-9 h-9 rounded-lg bg-brand-gradient flex items-center justify-center text-white font-bold text-sm shrink-0">
            S
          </div>
          <div className="min-w-0">
            <p className="font-bold text-brand-800 text-sm leading-tight truncate">SIM SDM</p>
            <p className="text-[10px] text-brand-400">Pendamping PKH</p>
          </div>
          <button
            className="ml-auto sm:hidden text-brand-400 text-xl leading-none"
            onClick={() => setSidebarOpen(false)}
          >
            &times;
          </button>
        </div>

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

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </a>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-brand-50">
          <button onClick={handleLogout} className="sidebar-link w-full text-left">
            <span>↩</span>
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="bg-brand-gradient-header text-white px-4 py-4 flex items-center justify-between shadow shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              className="sm:hidden text-xl leading-none"
              onClick={() => setSidebarOpen(true)}
            >
              ☰
            </button>
            <p className="font-semibold text-sm sm:text-base truncate">{pageTitle}</p>
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
            <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              👤
            </span>
          </div>
        </header>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
