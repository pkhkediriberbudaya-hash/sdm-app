// Pembangun narasi otomatis per kategori RHK — disederhanakan dari referensi
// aplikasi AutoReport Pro milik user (index.html). 4 bagian: umum (latar
// belakang), tujuan, narasi (uraian pelaksanaan), hasil. Semua bisa diedit
// manual oleh pendamping sesudah digenerate.

function ctx(f) {
  return {
    desa: f.desa || '...',
    kelompok: f.kelompok || '...',
    sasaran: f.sasaran || '...',
    kegiatan: f.kegiatan || '',
  };
}

// Dasar/rujukan kegiatan per RHK — ditampilkan sebagai daftar poin di PDF.
export function getDasar(rhkNo) {
  const base = [
    'Rencana Hasil Kerja (RHK) ASN PPPK Direktorat PSNK Kementerian Sosial RI.',
    'Tugas pokok ASN PPPK Pendamping Sosial PKH di wilayah tugas guna menjamin keberlangsungan program perlindungan sosial nasional.',
  ];
  const sp = {
    1: 'Data Bayar dan Monitoring Penyaluran Bantuan Sosial yang bersumber dari SIKMA/Omspan periode berjalan sebagai acuan distribusi tepat sasaran.',
    2: 'Kurikulum Modul P2K2 Direktorat Jaminan Sosial Keluarga sebagai pedoman pelaksanaan pertemuan.',
    3: 'Sistem Verifikasi Komitmen (VerKom) yang terintegrasi pada aplikasi SIKMA guna menjamin bantuan tepat syarat.',
    4: 'Pedoman Graduasi Mandiri PKH dan Instrumen Asesmen Kesiapan Ekonomi Keluarga guna akurasi data kepesertaan.',
    5: 'Data Pembaruan DTSEN yang bersumber dari SIKMA guna menjamin akuntabilitas data penerima bantuan sosial nasional.',
    6: 'Mekanisme Respons Cepat Kasus Sosial PKH dan prosedur penanganan pengaduan yang ditetapkan Kemensos RI.',
    7: 'Format Laporan Bulanan Pelaksanaan PKH yang ditetapkan Direktorat PSNK sebagai instrumen monitoring kinerja periodik.',
    8: 'Instruksi strategis dan direktif pimpinan Direktorat PSNK Kemensos RI yang bersifat mengikat dan memerlukan tindak lanjut segera.',
    9: 'Panduan Komunikasi Publik Kemensos RI melalui kanal digital resmi.',
  };
  return [...base, sp[rhkNo] || sp[7]];
}

export function buildNarrative(rhkNo, f) {
  const { desa, kelompok, sasaran, kegiatan } = ctx(f);
  switch (rhkNo) {
    case 1:
      return {
        umum: 'Penyaluran bantuan sosial merupakan pilar strategis dalam menjaga jaring pengaman sosial nasional bagi masyarakat prasejahtera di Indonesia. Dalam kerangka Program Keluarga Harapan (PKH), ketepatan jumlah dan waktu penyaluran sangat krusial untuk menjaga daya beli serta memenuhi kebutuhan dasar Keluarga Penerima Manfaat (KPM) secara akuntabel dan transparan sesuai regulasi Kemensos RI.',
        tujuan: `1. Meningkatkan literasi finansial KPM mengenai mekanisme transaksi bantuan sosial melalui mesin ATM maupun agen perbankan resmi di wilayah Desa ${desa}.\n2. Memastikan KPM menerima bantuan sesuai komponen hak tanpa adanya potongan ilegal dari pihak manapun.\n3. Mengedukasi KPM agar senantiasa menjaga kerahasiaan PIN Kartu KKS masing-masing guna menghindari penyalahgunaan dana.`,
        narasi: 'Pendamping sosial melaksanakan pendampingan teknis dan edukasi pencairan bantuan di lokasi transaksi secara intensif. Diberikan arahan komprehensif mengenai tata cara penggunaan kartu KKS yang benar, membantu KPM yang mengalami kendala teknis pada mesin transaksi, serta melakukan verifikasi saldo untuk memastikan dana telah masuk ke rekening masing-masing KPM.',
        hasil: 'Seluruh KPM yang hadir berhasil melakukan penarikan dana bantuan secara mandiri, tertib, dan aman. Dana yang diterima telah dipastikan sesuai dengan data bayar resmi pada sistem PKH, serta tidak ditemukan adanya praktik pungutan liar atau kendala teknis yang menghambat proses distribusi bantuan di wilayah tugas.',
      };
    case 2:
      return {
        umum: 'Pertemuan Peningkatan Kemampuan Keluarga (P2K2) atau Family Development Session (FDS) adalah instrumen utama PKH untuk memfasilitasi perubahan perilaku jangka panjang pada Keluarga Penerima Manfaat, membekali kecakapan hidup esensial guna membangun kemandirian mental, ekonomi, dan kesehatan keluarga.',
        tujuan: `1. Membekali anggota Kelompok ${kelompok} di Desa ${desa} dengan wawasan praktis sesuai materi P2K2 yang disampaikan.\n2. Meningkatkan kapasitas KPM untuk mengimplementasikan pola asuh anak positif, manajemen keuangan rumah tangga efektif, serta menjaga standar gizi dan kesehatan lingkungan.\n3. Menumbuhkan motivasi kemandirian keluarga agar mampu meningkatkan kualitas taraf hidup secara mandiri tanpa ketergantungan pada bantuan sosial.`,
        narasi: `Pelaksanaan P2K2 bertempat di Desa ${desa} bersama seluruh anggota Kelompok ${kelompok}. Pendamping memandu jalannya sesi secara dialogis dan interaktif menggunakan Buku Pintar dan Flipchart. Kegiatan diawali dengan pembukaan motivasi, penyampaian poin utama materi, diskusi kelompok kecil, simulasi peran (role play), serta diakhiri penyusunan rencana aksi nyata yang akan dilakukan KPM di rumah tangga masing-masing.`,
        hasil: `KPM di Kelompok ${kelompok} menunjukkan antusiasme tinggi dan mampu menjelaskan kembali poin utama materi saat evaluasi akhir sesi. Tercapainya kesepakatan komitmen harian dari setiap peserta serta terdokumentasikannya partisipasi aktif KPM sebagai pemenuhan kewajiban kehadiran dalam program PKH bulan berjalan.`,
      };
    case 4:
      return {
        umum: 'Usulan Graduasi Mandiri dan Pemberdayaan Sosial Ekonomi (PPSE) merupakan indikator keberhasilan pendampingan PKH yang menunjukkan peningkatan taraf hidup KPM menuju kemandirian ekonomi keluarga secara berkelanjutan.',
        tujuan: `1. Melakukan identifikasi dan asesmen terhadap KPM di wilayah Desa ${desa} yang telah menunjukkan potensi kemandirian ekonomi.\n2. Memberikan penguatan pemahaman mengenai graduasi mandiri/program PPSE sebagai sarana peningkatan pendapatan dan kemandirian keluarga.\n3. Menyusun instrumen usulan yang akurat dan akuntabel guna percepatan graduasi ekonomi.`,
        narasi: `Pendamping melaksanakan kunjungan lapangan dan asesmen kepada KPM terkait di Desa ${desa}. Fokus pembahasan meliputi validasi profil ekonomi keluarga, identifikasi potensi usaha yang sedang dijalankan, serta penilaian kesiapan mental KPM untuk melepaskan bantuan sosial secara sukarela atau mengikuti program pemberdayaan lanjutan.`,
        hasil: 'Tersusunnya draf usulan graduasi mandiri/PPSE yang sah dan siap ditindaklanjuti melalui menu Submit Graduasi & PPSE pada aplikasi. Hal ini menjadi preseden positif bagi KPM lainnya untuk terus berupaya meningkatkan kesejahteraan ekonomi.',
      };
    case 8:
      return {
        umum: 'Melaksanakan direktif pimpinan merupakan perwujudan responsivitas pendamping sosial terhadap instruksi strategis atau penugasan khusus yang bersifat mendesak guna merespons dinamika kebijakan di lapangan.',
        tujuan: `1. Membangun sinergi koordinasi bersama ${sasaran} guna memastikan penugasan terkait ${kegiatan || 'penugasan pimpinan'} terlaksana secara tepat waktu, efektif, dan akuntabel.\n2. Menyamakan persepsi langkah kerja di lapangan dan meminimalkan hambatan birokrasi.\n3. Menjamin setiap instruksi pimpinan dapat diterjemahkan ke dalam aksi nyata yang bermanfaat bagi KPM di wilayah dampingan.`,
        narasi: `Pendamping melaksanakan audiensi/koordinasi bersama ${sasaran} pada lokasi yang telah disepakati. Fokus pembahasan diarahkan pada penjabaran teknis instruksi direktif pimpinan, pemetaan potensi hambatan di lapangan, serta perumusan kerangka solusi guna percepatan penyelesaian tugas.`,
        hasil: `Tercapainya kesepahaman langkah strategis dan komitmen kerja sama antara pendamping sosial dengan pihak ${sasaran}. Diperolehnya rencana tindak lanjut (RTL) yang konkret.`,
      };
    case 9:
      return {
        umum: 'Penyebaran Berita Baik melalui media sosial merupakan strategi komunikasi publik untuk menyebarluaskan dampak positif program perlindungan sosial kepada masyarakat luas secara masif.',
        tujuan: '1. Mendokumentasikan dan mempublikasikan narasi positif mengenai keberhasilan program pendampingan sosial di lapangan melalui platform komunikasi publik resmi.\n2. Memperkuat citra positif lembaga di mata masyarakat.\n3. Menyediakan sumber informasi publik yang autentik dan inspiratif mengenai manfaat nyata PKH.',
        narasi: 'Pendamping menyusun materi publikasi digital berupa foto dokumentasi aksi lapangan atau testimoni kemajuan anggota KPM dampingan. Konten kemudian diunggah dengan menandai akun media sosial resmi Kemensos RI secara profesional.',
        hasil: 'Terdokumentasikannya keberhasilan program PKH secara naratif dan visual di platform media sosial resmi kementerian. Meningkatnya literasi masyarakat mengenai dampak positif pendampingan sosial bagi keluarga kurang mampu.',
      };
    default:
      return {
        umum: 'Laporan ini disusun sebagai pertanggungjawaban pelaksanaan tugas harian ASN PPPK guna memastikan program perlindungan sosial di wilayah dampingan berjalan tepat sasaran, akuntabel, dan transparan.',
        tujuan: `1. Memastikan seluruh intervensi program di wilayah Desa ${desa} berjalan sesuai pedoman teknis kementerian.\n2. Melakukan monitoring rutin terhadap pemenuhan hak dasar KPM di bidang pendidikan, kesehatan, dan kesejahteraan sosial.\n3. Menyediakan data lapangan yang akurat guna mendukung proses pengambilan kebijakan program.`,
        narasi: `Pendamping melaksanakan kegiatan harian ${kegiatan || 'sesuai RHK terkait'} guna mengidentifikasi kondisi riil lapangan serta memberikan layanan responsif bagi KPM sesuai standar operasional yang ditetapkan.`,
        hasil: `Kegiatan terlaksana secara kondusif dan diperolehnya data akurat guna mendukung pemutakhiran status kepesertaan jaminan sosial keluarga dampingan di Desa ${desa}.`,
      };
  }
}
