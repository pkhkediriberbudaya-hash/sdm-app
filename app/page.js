'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PasswordInput from '@/components/PasswordInput';

export default function HomePage() {
  const router = useRouter();
  const [nip, setNip] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = nip.trim();
    if (!trimmed || !password) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nip: trimmed, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login gagal. Periksa kembali NIP dan password.');
        setLoading(false);
        return;
      }
      if (data.mustChange) {
        router.push(`/pegawai/${encodeURIComponent(trimmed)}/ganti-password`);
      } else {
        router.push(`/pegawai/${encodeURIComponent(trimmed)}`);
      }
    } catch {
      setError('Gagal terhubung ke server. Coba lagi.');
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-navy-700 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-rust-500 text-white text-2xl font-bold mb-4">
            S
          </div>
          <h1 className="text-white text-2xl font-bold">SIM SDM Pendamping</h1>
          <p className="text-navy-100 text-sm mt-1">
            Masuk pakai NIP untuk mengelola data Anda
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="label">NIP</label>
            <input
              className="input"
              type="text"
              placeholder="Contoh: 198908252025212052"
              value={nip}
              onChange={(e) => setNip(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="label">Password</label>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Login pertama: isi dengan NIK Anda"
            />
            <p className="text-xs text-navy-400 mt-1">
              Login pertama kali? Password default = NIK Anda, lalu Anda akan diminta
              menggantinya.
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Memeriksa...' : 'Masuk'}
          </button>
        </form>

        <p className="text-center text-navy-100 text-xs mt-6">
          Hanya untuk kalangan internal.{' '}
          <a href="/admin/login" className="underline hover:text-white">
            Login Admin
          </a>
        </p>
      </div>
    </main>
  );
}
