# SIM SDM Pendamping

Aplikasi web untuk pegawai (pendamping PKH) melengkapi data diri, mengelola data KPM dampingan
(bisa offline), dan panel admin untuk mengelola semuanya termasuk menambah menu baru kapan saja.
Tampilan terinspirasi SIKS-NG (sidebar + gradasi biru). Semua data disimpan di Google Sheets.

## Fitur utama

- **Login pendamping**: NIP + password (password login pertama = NIK, wajib diganti)
- **Data Diri**: form lengkap, field baru bisa ditambah admin sendiri lewat `FieldConfig`
  tanpa perlu coding ulang
- **Desa Dampingan** & **Anggota Keluarga**: data relasi 1-ke-banyak per pendamping
- **Data KPM**: admin upload CSV SIKS-NG per kecamatan → sistem upsert otomatis;
  pendamping bisa unduh data desanya untuk dipakai **offline** (PWA, bisa di-install ke HP)
- **Panel admin**: menu generik berbasis sheet `Menus` — tambah menu baru cukup tambah 1 baris,
  tidak perlu deploy ulang

---

## 1. Siapkan Google Sheet

Buat spreadsheet baru, lalu buat tab-tab berikut:

### Tab `SDM`
Import dari file `SDM_GABUNGAN_2026.xlsx` (File → Import → Insert new sheet), lalu rename
tab hasil import jadi persis `SDM`. Tambahkan 2 kolom baru di paling kanan untuk rekening Mandiri:
```
NO REKENING MANDIRI | NAMA REKENING MANDIRI
```

### Tab `DesaDampingan`
```
ID | NIP | NIK | NAMA_DESA | KECAMATAN | KETERANGAN | TANGGAL_DITAMBAHKAN
```

### Tab `AnggotaKeluarga`
```
ID | NIP | NAMA | HUBUNGAN | TANGGAL_LAHIR | PEKERJAAN | KETERANGAN
```

### Tab `Credentials`
```
NIP | PASSWORD_HASH | MUST_CHANGE | UPDATED_AT
```
Biarkan kosong — terisi otomatis saat pendamping login pertama kali. **Jangan** daftarkan sheet
ini sebagai menu admin (berisi hash password).

### Tab `FieldConfig` (opsional)
```
FIELD_NAME | GROUP_LABEL | ORDER | INPUT_TYPE
```
Untuk mengelompokkan field tambahan yang ditaruh admin langsung di sheet `SDM`. Field yang belum
didaftarkan di sini tetap muncul otomatis (masuk grup "Data Lainnya").

### Tab `MasterKelompok` (opsional, untuk saran nama kelompok)
Import dari file `MasterKelompok.xlsx` yang sudah disiapkan (File → Import → Insert new sheet,
lalu rename tab jadi persis `MasterKelompok`). Berisi data ketua kelompok per desa dampingan,
dipakai sebagai saran otomatis saat pendamping mengisi field "Kelompok" di Data KPM.

### Tab `Menus`
```
KEY      | LABEL            | SHEET_NAME      | PRIMARY_KEY | ICON | ORDER
sdm      | Data SDM         | SDM             | NIP         | 👤   | 1
desa     | Desa Dampingan   | DesaDampingan   | ID          | 🏘️   | 2
keluarga | Anggota Keluarga | AnggotaKeluarga | ID          | 👨‍👩‍👧 | 3
menu     | Kelola Menu      | Menus           | KEY         | ⚙️   | 4
```
Tab `KPM_[Kecamatan]` akan otomatis terdaftar sendiri di sini setiap admin upload data KPM
untuk kecamatan baru — tidak perlu ditambahkan manual.

Catat **ID Spreadsheet** dari URL-nya (bagian antara `/d/` dan `/edit`).

---

## 2. Service Account Google Cloud

1. [console.cloud.google.com](https://console.cloud.google.com) → buat project baru
2. Aktifkan **Google Sheets API** (APIs & Services → Library)
3. Buat **Service Account** (APIs & Services → Credentials → Create Credentials)
4. Buat **Key JSON** (tab Keys pada service account → Add Key → JSON) — catat `client_email` dan
   `private_key`
5. **Share** spreadsheet Anda ke email `client_email` tadi, akses **Editor**

---

## 3. Jalankan lokal (opsional)

```bash
npm install
cp .env.example .env.local
# isi .env.local sesuai langkah 1 & 2
npm run dev
```

---

## 4. Deploy ke Vercel

1. Push project ini ke GitHub
2. Import repo di [vercel.com](https://vercel.com)
3. Isi Environment Variables (lihat `.env.example` untuk daftar lengkap)
4. Deploy

Setiap `git push` ke branch utama akan otomatis memicu re-deploy.

---

## Fitur Data KPM & Offline (PWA)

- Admin upload CSV per kecamatan lewat menu **"Upload Data KPM"** — kolom dikenali secara
  fleksibel (nama kolom SIKS-NG bisa berbeda-beda), preview & validasi sebelum disimpan.
- Data di-upsert by NOKK: baru → ditambah, ada → diperbarui, hilang dari file baru → tetap
  tersimpan tapi `TAHAP_TERAKHIR` tidak ikut ter-update (jadi otomatis tidak terhitung aktif
  tanpa perlu menyentuh status yang dikelola manual pendamping).
- Kolom `KELOMPOK`, `STATUS_KEPESERTAAN`, `CATATAN` sepenuhnya dikelola pendamping, **tidak
  pernah ditimpa** oleh proses import.
- Pendamping membuka menu **"Data KPM"**, pilih kecamatan, klik **"Unduh untuk Offline"** — sejak
  itu data tersimpan di HP dan bisa dibuka/diedit tanpa internet.
- Aplikasi ini **PWA** (bisa "Install" ke HP) — supaya bisa dibuka tanpa internet sama sekali,
  pendamping perlu membuka aplikasi minimal **sekali** saat masih online.
- Perubahan yang dibuat offline otomatis masuk antrian dan terkirim ke server begitu ada sinyal
  lagi (juga bisa dipicu manual lewat tombol "Sinkronkan Sekarang").

## Keamanan

- Password di-hash pakai bcrypt. Login pertama = NIK, wajib diganti.
- Admin bisa reset password pendamping (kembali ke NIK) lewat menu Reset Password.
- Session pegawai & admin pakai cookie `httpOnly` bertanda tangan (HMAC), dicocokkan dengan NIP
  di URL — satu pendamping tidak bisa membuka data pendamping lain.
- Jangan bagikan `GOOGLE_PRIVATE_KEY` ke siapapun.
