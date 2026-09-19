import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { readSheet, appendRow, ensureValidHeaders } from '@/lib/googleSheets';

const SHEET = process.env.SHEET_P2K2_MODUL || 'P2K2Modul';
const HEADERS_FALLBACK = ['ID', 'JUDUL', 'DESKRIPSI', 'URL', 'NAMA_FILE', 'TANGGAL_UPLOAD'];

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const judul = (formData.get('judul') || '').toString() || (file ? file.name : '');
    const deskripsi = (formData.get('deskripsi') || '').toString();

    if (!file) {
      return NextResponse.json({ error: 'File wajib diupload' }, { status: 400 });
    }
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { error: 'BLOB_READ_WRITE_TOKEN belum diatur di environment variables.' },
        { status: 500 }
      );
    }

    const blob = await put(`p2k2-modul/${Date.now()}-${file.name}`, file, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    await ensureValidHeaders(SHEET, HEADERS_FALLBACK);
    const { headers } = await readSheet(SHEET);
    await appendRow(SHEET, headers.length ? headers : HEADERS_FALLBACK, {
      ID: 'MOD' + Date.now(),
      JUDUL: judul,
      DESKRIPSI: deskripsi,
      URL: blob.url,
      NAMA_FILE: file.name,
      TANGGAL_UPLOAD: new Date().toISOString().slice(0, 10),
    });

    return NextResponse.json({ success: true, url: blob.url });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
