# Pribadi · Manajemen Seragam

Aplikasi persediaan seragam bersama untuk SD, SMP, dan SMA Pribadi. Antarmuka berbahasa Indonesia, ringkas, dengan matriks ukuran dan pencatatan cepat.

## Menjalankan lokal

Gunakan Node.js 22.13 atau lebih baru, lalu:

```sh
npm ci
npm run dev
```

`npm run dev` membangun aplikasi lalu membuka http://127.0.0.1:5173 (hanya loopback). Database pengembangan tersimpan di `.data/dev.sqlite` dan diabaikan Git. Setelah mengubah kode, hentikan lalu jalankan ulang `npm run dev`.

```sh
npm test
npx tsc --noEmit
```

## Cara kerja

Aplikasi berjalan sebagai satu server Node.js (`app.cjs` → `server/index.mjs`) tanpa layanan pihak ketiga:

- `npm run build` (esbuild) menghasilkan halaman browser di `dist/public` dan API di `dist/api.mjs`.
- Server menyajikan halaman tersebut dan menangani `/api/...` memakai aturan stok di `lib/server.ts`.
- Data disimpan dalam **satu berkas SQLite** (`node:sqlite`, bawaan Node.js 22.13+). Migrasi di `drizzle` dijalankan otomatis saat server mulai.

Variabel lingkungan:

| Nama | Fungsi | Bawaan |
|---|---|---|
| `SERAGAM_DATABASE_PATH` | Lokasi berkas database | `~/seragam-data/inventory.sqlite` |
| `SERAGAM_PASSWORD` | Kata sandi masuk: halaman masuk hanya meminta password (tanpa nama pengguna). Mengganti password mengeluarkan semua orang. | kosong = tanpa kata sandi |
| `SERAGAM_ORIGIN` | Alamat publik, mis. `https://uniform.pribadidepok.sch.id`, bila proxy menyembunyikan HTTPS | dibaca dari permintaan |
| `PORT` | Port server | `3000` |

Database sengaja disimpan di luar folder aplikasi dan `public_html`, sehingga pembaruan Git dan build ulang tidak menyentuh data. Cadangkan berkas `inventory.sqlite` secara berkala.

## Hosting dengan Node.js (cPanel)

GitHub yang membangun aplikasi, bukan cPanel. Setiap push ke `main` menjalankan **Build for cPanel** (GitHub Actions): pemeriksaan tipe, tes, build, lalu hasil siap pakai diterbitkan ke branch `deploy`. Aplikasi yang berjalan tidak membutuhkan paket npm, hanya Node.js 22.13+.

Pemasangan pertama:

1. Di Terminal cPanel, ambil branch `deploy` di luar `public_html`:
   ```sh
   git clone -b deploy https://github.com/pribadi-school/uniform.git ~/repositories/uniform
   ```
2. Di **Setup Node.js App** → *Create Application*: Node.js 22.13 atau lebih baru, mode *Production*, Application root `repositories/uniform`, Application URL domain/subdomain tujuan, Startup file `app.cjs`.
3. Tambahkan variabel lingkungan `SERAGAM_ORIGIN` (alamat situs) dan, bila perlu, `SERAGAM_PASSWORD`, lalu simpan dan jalankan.

Untuk pembaruan cukup satu perintah di Terminal:

```sh
bash ~/repositories/uniform/update.sh
```

Skrip ini mengambil versi terbaru yang sudah dibangun GitHub (`git pull`), lalu memulai ulang aplikasi. Tidak ada pemasangan paket atau build di cPanel. Data tetap di `~/seragam-data/inventory.sqlite`.

### Menyalin data dari Cloudflare

`node scripts/import-cloudflare.mjs` mengunduh stok, seluruh riwayat, pengaturan, dan cadangan tersimpan dari versi Cloudflare lama, lalu memasukkannya ke database dalam satu transaksi. Skrip hanya mau mengisi database yang masih kosong; pindahkan database lama terlebih dahulu (mis. `mv ~/seragam-data ~/seragam-data-lama`) dan hentikan aplikasi selama impor. Salinan data Cloudflare disimpan di samping database sebagai `cloudflare-export-*.json`.

## Akses

Pengelolaan akun aplikasi **dinonaktifkan sementara** melalui `accountsEnabled = false` di `lib/access.ts`. Semua orang yang dapat membuka aplikasi bisa mencatat penerimaan, pengeluaran, penyesuaian, impor, cadangan, dan pengaturan stok. Karena itu lindungi hosting online dengan `SERAGAM_PASSWORD`. Daftar anggota lama, termasuk Rahma dan Afro, tetap tersimpan di database. Mode akun dulu bergantung pada Sign in with ChatGPT dari hosting lama dan belum memiliki pengganti, jadi biarkan flag tetap `false`.

## Aturan stok

- 21 seragam tetap: 12 nasional per jenjang dan 9 seragam dengan persediaan bersama.
- Ukuran lama 0 serta 1–2 sampai 29–30 dan ukuran baru 0–15 memakai persediaan terpisah.
- Penerimaan baru hanya ke ukuran Baru. Pengeluaran dapat memakai stok Lama hingga habis.
- Pengeluaran wajib memiliki nama siswa dan kelas. Penyesuaian wajib memiliki alasan.
- Jumlah harus bilangan bulat; stok tidak boleh negatif. Permintaan berulang memakai ID yang sama untuk menghindari pencatatan ganda. Perubahan bersamaan diperiksa secara atomik di database.
- Riwayat baru pada mode bersama memakai label **Pengunjung tanpa akun**, waktu, dan nilai sebelum/sesudah. Riwayat lama mempertahankan nama asli. Detail riwayat (tanggal, staff, siswa, kelas, catatan) dapat diubah dengan jejak "Diubah". Riwayat dapat dihapus setelah mengetik HAPUS; menghapus stok masuk/keluar/penyesuaian mengembalikan jumlah stoknya.
- Stok kosong ditampilkan terpisah dari stok menipis. Batas menipis dapat diatur, awalnya 5 pcs.

## Impor, ekspor, dan cadangan

Impor `.xlsx`, CSV, atau JSON sampai 5 MB. Pilih lembar, baris judul, bentuk tabel, dan pemetaan kolom; periksa pratinjau sebelum menerapkan. Mode penggantian hanya mengubah kombinasi yang tercantum pada berkas. Data yang tidak tercantum tetap ada. Perubahan stok setelah pratinjau mengharuskan pratinjau ulang. Impor membuat cadangan otomatis data sebelumnya dan menyimpan rincian perubahan.

Cadangan JSON mencakup stok dan riwayat. Riwayat dari prototype/berkas lama disimpan sebagai arsip sumber, tanpa mengatasnamakan akun pengguna baru. Ekspor stok dan riwayat menggunakan Excel.

Repositori publik ini hanya berisi kode aplikasi dan migrasi skema. Data stok operasional, database lokal, ekspor inventaris, dan migrasi impor workbook tidak disertakan. Aplikasi dimulai dengan saldo kosong; impor stok nyata melalui halaman Impor & cadangan.

## Struktur

`app/uniform-app.tsx` dan `app/import-panel.tsx` berisi UI; `lib/server.ts` menangani izin dan transaksi; `server/index.mjs` menangani HTTP dan `server/database.mjs` membuka database SQLite; `db/schema.ts` dan `drizzle` berisi skema/migrasi. `tests` menguji aturan stok, akses, transaksi bersamaan, dan impor. `PRODUCT.md` dan `DESIGN.md` merekam konteks produk dan sistem desain.
