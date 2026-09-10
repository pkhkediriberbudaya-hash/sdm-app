# SIM SDM Pendamping

Aplikasi web untuk pegawai melengkapi data diri sendiri (login pakai NIP, tanpa password) dan
panel admin untuk mengelola seluruh data, termasuk menambah "menu" baru kapan saja tanpa perlu
coding ulang. Semua data disimpan di Google Sheets.

## Cara kerja singkat

- **Halaman awal (`/`)** — pegawai login pakai **NIP + password** (password login pertama = NIK,
  lalu wajib diganti), diarahkan ke halaman datanya sendiri untuk melihat & melengkapi data
  (data pribadi, pendidikan, rekening, desa dampingan, dan anggota keluarga).
- **Panel admin (`/admin`)** — login terpisah (username & password), bisa melihat/mengedit/
  menghapus semua data, termasuk menambahkan **menu baru** cukup dengan menambah baris di sheet
  `Menus` (tanpa deploy ulang).
- Semua baca/tulis data langsung ke Google Sheets lewat Google Sheets API.

---

## 1. Siapkan Google Sheet

1. Buka **SDM_GABUNGAN_2026.xlsx** yang sudah dibuat sebelumnya, lalu **upload/import** ke
   Google Sheets (File → Import di Google Sheets, atau upload ke Google Drive lalu buka dengan
   Google Sheets).
2. Ganti nama tab (sheet) hasil import menjadi persis: **`SDM`**

   Tambahkan 2 kolom baru di sheet `SDM` (di sebelah kanan kolom terakhir), diberi header persis:
   ```
   NO REKENING MANDIRI | NAMA REKENING MANDIRI
   ```
   (untuk mencatat rekening Bank Mandiri terpisah dari rekening Bank Jatim yang sudah ada)
   (klik kanan tab di bawah → Rename).
3. Tambahkan tab baru bernama **`DesaDampingan`** dengan baris header (baris 1) persis seperti ini:

   ```
   ID | NIP | NIK | NAMA_DESA | KECAMATAN | KETERANGAN | TANGGAL_DITAMBAHKAN
   ```

4. Tambahkan tab baru bernama **`Menus`** dengan header dan isi awal berikut (baris 1 = header):

   | KEY      | LABEL           | SHEET_NAME      | PRIMARY_KEY | ICON | ORDER |
   |----------|-----------------|-----------------|-------------|------|-------|
   | sdm      | Data SDM        | SDM             | NIP         | 👤   | 1     |
   | desa     | Desa Dampingan  | DesaDampingan   | ID          | 🏘️   | 2     |
   | keluarga | Anggota Keluarga| AnggotaKeluarga | ID          | 👨‍👩‍👧 | 3     |
   | menu     | Kelola Menu     | Menus           | KEY         | ⚙️   | 4     |

   Baris `menu` ini membuat sheet `Menus` bisa dikelola langsung dari panel admin — jadi kalau
   nanti mau menambah menu baru, tidak perlu edit Google Sheet manual sama sekali, cukup dari
   halaman admin "Kelola Menu".

   **Jangan** daftarkan sheet `Credentials` sebagai menu di sini — sheet itu berisi hash
   password dan sengaja tidak ditampilkan di panel admin generik.

5. Tambahkan tab baru bernama **`AnggotaKeluarga`** dengan header:

   ```
   ID | NIP | NAMA | HUBUNGAN | TANGGAL_LAHIR | PEKERJAAN | KETERANGAN
   ```

6. Tambahkan tab baru bernama **`Credentials`** dengan header:

   ```
   NIP | PASSWORD_HASH | MUST_CHANGE | UPDATED_AT
   ```

   Biarkan kosong (tanpa baris data) — sistem otomatis mengisinya sendiri saat setiap pendamping
   login pertama kali (password default = NIK mereka).

7. (Opsional) Tambahkan tab **`FieldConfig`** kalau nanti admin ingin mengelompokkan field
   tambahan yang ditaruh langsung di sheet `SDM` (misal `INSTAGRAM`, `NO HP DARURAT`):

   ```
   FIELD_NAME | GROUP_LABEL | ORDER | INPUT_TYPE
   ```

   Field yang belum didaftarkan di sini tetap otomatis muncul di form (masuk grup "Data
   Lainnya"), jadi tab ini boleh dilewati dulu kalau belum dibutuhkan.

8. Catat **ID Spreadsheet**-nya dari URL:
   `https://docs.google.com/spreadsheets/d/`**`ID_SPREADSHEET_DI_SINI`**`/edit`

### Cara menambah menu baru di kemudian hari

Tinggal buat tab baru di Google Sheet (misalnya `Pelatihan` dengan kolom apa saja sesuai
kebutuhan), lalu tambahkan satu baris di sheet `Menus` (bisa lewat menu "Kelola Menu" di admin):
`KEY=pelatihan, LABEL=Data Pelatihan, SHEET_NAME=Pelatihan, PRIMARY_KEY=ID, ICON=🎓, ORDER=4`.
Menu baru otomatis muncul di sidebar admin dan bisa langsung tambah/edit/hapus data — tanpa
sentuh kode sama sekali.

---

## 2. Buat Service Account Google Cloud (supaya aplikasi bisa akses Sheets)

1. Buka [console.cloud.google.com](https://console.cloud.google.com), buat project baru (atau
   pakai yang sudah ada).
2. Aktifkan **Google Sheets API**: menu *APIs & Services → Library* → cari "Google Sheets API" →
   Enable.
3. Buat **Service Account**: *APIs & Services → Credentials → Create Credentials → Service
   Account*. Beri nama bebas, lanjut sampai selesai (role tidak perlu diisi).
4. Buka service account yang baru dibuat → tab **Keys** → **Add Key → Create new key → JSON**.
   File JSON akan terunduh — simpan baik-baik, jangan diunggah ke GitHub.
5. Dari file JSON tersebut, catat dua nilai:
   - `client_email` → ini nilai untuk `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → ini nilai untuk `GOOGLE_PRIVATE_KEY`
6. **Share Google Sheet Anda** (yang dibuat di langkah 1) ke email `client_email` tadi, dengan
   akses **Editor** (klik tombol Share di Google Sheets seperti membagikan ke orang lain).

---

## 3. Jalankan di komputer lokal (opsional, untuk uji coba)

```bash
npm install
cp .env.example .env.local
# isi .env.local dengan nilai dari langkah 1 & 2
npm run dev
```

Buka `http://localhost:3000`.

---

## 4. Push ke GitHub

```bash
git init
git add .
git commit -m "Inisialisasi SIM SDM Pendamping"
git branch -M main
git remote add origin https://github.com/USERNAME/NAMA_REPO.git
git push -u origin main
```

> Pastikan `.env` / `.env.local` **tidak ikut ter-push** (sudah otomatis diabaikan lewat
> `.gitignore`).

---

## 5. Deploy ke Vercel

1. Buka [vercel.com](https://vercel.com) → **Add New → Project** → pilih repo GitHub yang barusan
   dibuat.
2. Sebelum klik Deploy, buka bagian **Environment Variables** dan isi persis seperti di
   `.env.example`:

   | Key | Isi |
   |---|---|
   | `GOOGLE_SERVICE_ACCOUNT_EMAIL` | dari file JSON service account |
   | `GOOGLE_PRIVATE_KEY` | dari file JSON service account (tempel apa adanya, termasuk `-----BEGIN PRIVATE KEY-----`) |
   | `GOOGLE_SHEET_ID` | ID spreadsheet dari langkah 1 |
   | `SHEET_SDM` | `SDM` |
   | `SHEET_DESA` | `DesaDampingan` |
   | `SHEET_MENUS` | `Menus` |
   | `ADMIN_USERNAME` | username admin pilihan Anda |
   | `ADMIN_PASSWORD` | password admin yang kuat |
   | `SESSION_SECRET` | string acak panjang (boleh ketik sembarang, minimal 20 karakter) |

3. Klik **Deploy**. Setelah selesai, Anda akan mendapat URL seperti
   `https://nama-project.vercel.app`.
4. Bagikan URL tersebut ke pegawai untuk login pakai NIP, dan `URL/admin/login` untuk Anda
   sebagai admin.

### Mengubah environment variable setelah deploy

*Vercel Dashboard → Project → Settings → Environment Variables* → ubah nilai → lalu
**Redeploy** (Deployments → titik tiga pada deployment terakhir → Redeploy) agar perubahan
berlaku.

---

## Fitur Data KPM (Tahap 3)

- **Admin** mengunggah CSV per kecamatan lewat menu "Upload Data KPM" — sistem otomatis membuat
  tab `KPM_[Kecamatan]`, mencocokkan kolom secara fleksibel, dan meng-upsert data by NOKK.
- **Pendamping** membuka menu "Data KPM" di halaman mereka, pilih kecamatan, lalu **"Unduh untuk
  Offline"** — sejak itu data KPM desa dampingan mereka tersimpan di HP dan bisa dibuka/diedit
  tanpa internet.
- Aplikasi ini adalah **PWA** (bisa di-"Install" ke HP dari menu browser "Add to Home Screen" /
  "Install app") — supaya bisa dibuka tanpa internet sama sekali, pendamping perlu membuka
  aplikasinya **minimal sekali** saat masih ada koneksi.
- Perubahan status KPM (Aktif/Pengaduan/Graduasi Mandiri/PPSE) yang dibuat saat offline otomatis
  masuk antrian dan terkirim ke server begitu HP kembali online.



- **`SDM`** — data induk pegawai (35 kolom), kolom `NIP`/`NIK`/`NO` bersifat baca-saja di halaman
  pegawai (hanya admin yang bisa mengubahnya lewat panel admin).
- **`DesaDampingan`** — relasi satu pegawai ke banyak desa, dihubungkan lewat kolom `NIP`.
- **`Menus`** — daftar menu yang tampil di sidebar admin; setiap baris = satu menu yang memetakan
  ke satu tab Google Sheet.

## Keamanan

- Login pegawai memakai **NIP + password** (bukan NIP saja) — password di-hash pakai bcrypt,
  tidak pernah disimpan dalam bentuk teks biasa. Login pertama kali otomatis membuat akun dengan
  password default = NIK, dan pegawai wajib menggantinya sebelum melanjutkan.
- Kalau pegawai lupa password, admin bisa mereset lewat menu **Reset Password** di panel admin
  (password kembali ke NIK, pegawai diminta ganti lagi saat login berikutnya).
- Login admin memakai username/password yang diset lewat environment variable, session disimpan
  di cookie `httpOnly` yang ditandatangani (HMAC), berlaku 8 jam. Session pegawai memakai
  mekanisme yang sama, berlaku 12 jam, dan dicocokkan dengan NIP di URL — satu pegawai tidak bisa
  membuka data NIP lain meski tahu URL-nya.
- Jangan bagikan file `.env` / nilai `GOOGLE_PRIVATE_KEY` ke siapapun — nilai ini setara kunci
  penuh ke Google Sheet Anda.
