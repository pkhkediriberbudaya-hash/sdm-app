import { NextResponse } from 'next/server';
import { readSheet } from '@/lib/googleSheets';
import { getPegawaiSession } from '@/lib/pegawaiAuth';

// Mengembalikan daftar nama desa UNIK yang benar-benar ada di CSV KPM
// (sheet KPM_<Kecamatan>) yang sudah diupload admin — bukan dari master
// wilayah statis. Ini dipakai supaya pendamping bisa memilih Desa Dampingan
// persis sesuai ejaan yang ada di data KPM, dan supaya desa yang memang
// datanya sudah ada tidak pernah "hilang" dari pilihan.
// Hanya nama desa yang dikirim (bukan data KPM per orang), jadi aman dibaca
// oleh pendamping mana pun tanpa perlu sudah terdaftar di DesaDampingan.
export async function GET(req) {
  try {
    const session = await getPegawaiSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const kecamatan = req.nextUrl.searchParams.get('kecamatan');
    if (!kecamatan) {
      return NextResponse.json({ error: 'Kecamatan wajib diisi' }, { status: 400 });
    }

    const sheetName = `KPM_${kecamatan}`;
    let desaSet = new Set();
    try {
      const { records } = await readSheet(sheetName);
      for (const r of records) {
        const nama = (r.DESA || '').trim();
        if (nama) desaSet.add(nama);
      }
    } catch {
      // Sheet kecamatan ini belum pernah diupload admin — kembalikan kosong.
    }

    const desaList = Array.from(desaSet).sort();
    return NextResponse.json({ kecamatan, desaList });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
