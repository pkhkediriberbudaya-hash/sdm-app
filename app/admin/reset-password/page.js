'use client';

import { useState } from 'react';

export default function ResetPasswordPage() {
  const [nip, setNip] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!nip.trim()) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nip: nip.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Gagal reset password' });
      } else {
        setMessage({
          type: 'success',
          text: `Password untuk NIP ${nip.trim()} berhasil direset ke NIK (default). Pendamping akan diminta ganti password saat login berikutnya.`,
        });
        setNip('');
      }
    } catch {
      setMessage({ type: 'error', text: 'Gagal terhubung ke server.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-xl font-bold text-navy-700 mb-1">🔑 Reset Password</h1>
      <p className="text-sm text-navy-400 mb-6">
        Reset password pendamping kembali ke default (= NIK). Pendamping akan diwajibkan
        mengganti password saat login berikutnya.
      </p>

      <form onSubmit={handleSubmit} className="card p-5 max-w-md space-y-4">
        <div>
          <label className="label">NIP Pendamping</label>
          <input
            className="input"
            value={nip}
            onChange={(e) => setNip(e.target.value)}
            placeholder="Masukkan NIP"
          />
        </div>

        {message && (
          <p
            className={`text-sm rounded-lg px-3 py-2 border ${
              message.type === 'success'
                ? 'text-green-700 bg-green-50 border-green-100'
                : 'text-red-600 bg-red-50 border-red-100'
            }`}
          >
            {message.text}
          </p>
        )}

        <button type="submit" className="btn-primary" disabled={loading || !nip.trim()}>
          {loading ? 'Memproses...' : 'Reset Password'}
        </button>
      </form>
    </div>
  );
}
