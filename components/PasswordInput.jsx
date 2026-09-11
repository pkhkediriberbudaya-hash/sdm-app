'use client';

import { useState } from 'react';

export default function PasswordInput({ value, onChange, placeholder, autoFocus }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        className="input pr-12"
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-400 hover:text-brand-700 text-sm font-medium"
        tabIndex={-1}
      >
        {visible ? 'Sembunyikan' : 'Lihat'}
      </button>
    </div>
  );
}
