// 9 RHK (Rencana Hasil Kerja) ASN PPPK Pendamping Sosial PKH — Dit. PSNK.
// Diambil persis dari referensi aplikasi AutoReport Pro (index.html) milik user.
export const RHK = [
  {
    no: 1,
    title: 'Penyaluran Bansos PKH',
    sub: 'Tepat Sasaran & Jumlah',
    options: [
      'Edukasi & sosialisasi pencairan tunai/non-tunai',
      'Supervisi permasalahan bantuan sosial',
      'Monitoring/Pemantauan penyaluran bantuan sosial',
    ],
  },
  {
    no: 2,
    title: 'Pertemuan P2K2',
    sub: 'Sesuai Ketentuan',
    options: ['Melaksanakan Pertemuan P2K2 (FDS)'],
  },
  {
    no: 3,
    title: 'Verifikasi Komitmen',
    sub: '& Pendampingan KPM',
    options: [
      'Verifikasi komitmen pendidikan, kesehatan & kesos',
      'Pendampingan, mediasi, dan fasilitasi KPM PKH',
    ],
  },
  {
    no: 4,
    title: 'Usulan Graduasi & PPSE',
    sub: 'Pemberdayaan Ekonomi',
    options: ['Usulan KPM graduasi mandiri', 'Pemberdayaan PPSE (usulan PPSE)'],
  },
  {
    no: 5,
    title: 'VerVal & Pemutakhiran',
    sub: 'Data KPM',
    options: ['Proses bisnis PKH (VerVal)', 'Pemutakhiran data anggota KPM'],
  },
  {
    no: 6,
    title: 'Respon Kasus Adaptif',
    sub: 'Cepat & Terukur',
    options: ['Respon kasus/pengaduan/kebencanaan/kerentanan'],
  },
  {
    no: 7,
    title: 'Laporan Bulanan',
    sub: 'Analisis & Dokumentasi',
    options: ['Laporan bulanan pelaksanaan PKH & laporan lainnya'],
  },
  {
    no: 8,
    title: 'Direktif Pimpinan',
    sub: 'Sesuai Penugasan',
    options: [
      'TLHP (Tindak Lanjut Hasil Pemeriksaan)',
      'Sosialisasi kebijakan',
      'Rapat Koordinasi',
      'Tugas lainnya',
    ],
  },
  {
    no: 9,
    title: 'Berita Baik Kemensos',
    sub: 'Komunikasi Publik',
    options: ['Penyebaran Berita Baik di Media Sosial'],
  },
];

export function findRhk(no) {
  return RHK.find((r) => r.no === Number(no));
}
