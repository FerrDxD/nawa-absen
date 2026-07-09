# Panduan Berkontribusi

Terima kasih atas minat Anda untuk berkontribusi pada **NAWA-ABSEN**! Kami menyambut setiap
bentuk kontribusi — mulai dari laporan bug, usulan fitur, perbaikan dokumentasi, hingga
kontribusi kode.

Sebelum memulai, mohon luangkan waktu untuk membaca panduan ini secara menyeluruh.

---

## Daftar Isi

- [Kode Etik](#kode-etik)
- [Cara Berkontribusi](#cara-berkontribusi)
- [Alur Kerja Git](#alur-kerja-git)
- [Standar Kode](#standar-kode)
- [Konvensi Pesan Commit](#konvensi-pesan-commit)
- [Proses Review Pull Request](#proses-review-pull-request)
- [Melaporkan Bug](#melaporkan-bug)
- [Mengusulkan Fitur](#mengusulkan-fitur)
- [Lingkungan Pengembangan](#lingkungan-pengembangan)

---

## Kode Etik

Proyek ini mengadopsi [Kode Etik Kontributor](./CODE_OF_CONDUCT.md). Dengan berpartisipasi,
Anda diharapkan untuk menjunjung tinggi kode ini. Mohon laporkan perilaku yang tidak dapat
diterima ke tim NAWASENA DEVELOMPENT.

---

## Cara Berkontribusi

### 1. Laporan Bug

Bug yang dilaporkan dengan baik sangat berharga bagi kami. Sebelum membuat laporan, harap:

- Pastikan bug belum dilaporkan di [Issues](https://github.com/ferrdxd/nawa-absen/issues)
- Reproduksi bug di versi terbaru
- Sertakan informasi yang relevan (browser, OS, versi aplikasi)

Gunakan template Issue yang tersedia saat membuat laporan baru.

### 2. Usulan Fitur

Kami terbuka terhadap ide baru. Untuk mengusulkan fitur:

- Buat Issue baru dengan label `enhancement`
- Jelaskan latar belakang dan manfaat fitur
- Sertakan mockup atau contoh jika ada
- Tunggu diskusi dari tim sebelum mulai mengerjakan

### 3. Kontribusi Kode

Untuk kontribusi kode, ikuti [Alur Kerja Git](#alur-kerja-git) di bawah ini.

---

## Alur Kerja Git

```bash
# 1. Fork repositori melalui GitHub

# 2. Clone fork Anda ke lokal
git clone https://github.com/ferrdxd/nawa-absen.git
cd nawa-absen

# 3. Tambahkan remote upstream
git remote add upstream https://github.com/ferrdxd/nawa-absen.git

# 4. Buat branch baru dari main
git checkout -b feat/nama-fitur-anda
# atau untuk perbaikan bug:
git checkout -b fix/nama-bug-anda

# 5. Lakukan perubahan, commit dengan pesan konvensional
git commit -m "feat: tambahkan fitur ekspor PDF rekap absensi"

# 6. Sinkronisasi dengan upstream sebelum push
git fetch upstream
git rebase upstream/main

# 7. Push ke fork Anda
git push origin feat/nama-fitur-anda

# 8. Buat Pull Request ke branch `main` repositori utama
```

---

## Standar Kode

Proyek ini menggunakan standar kode berikut:

### TypeScript & Svelte

- Gunakan **TypeScript** untuk semua file baru — tidak ada `any` yang tidak beralasan
- Komponen Svelte menggunakan **Svelte 5 Runes** (`$state`, `$derived`, `$effect`, `$props`)
- Semua logika bisnis sensitif **wajib** berada di server (`+server.ts` atau `service.ts`)
- Hindari meng-expose variabel lingkungan ke sisi klien

### Gaya Penulisan

```typescript
// Benar: tipe eksplisit, nama deskriptif
async function getRekapAbsensi(filters: AbsensiFilter): Promise<AbsensiRecord[]> { ... }

// Hindari: any tanpa alasan, nama generik
async function getData(f: any): Promise<any> { ... }
```

### CSS & Desain

- Ikuti desain system yang ada — gunakan token warna dari `layout.css`
- Jangan menambahkan warna atau ukuran font baru di luar design system
- Semua komponen harus responsif (mobile-first)
- Dark mode wajib didukung

### Pemeriksaan Kode

Sebelum membuat Pull Request, pastikan tidak ada error atau peringatan:

```bash
npm run check
```

---

## Konvensi Pesan Commit

Kami menggunakan **Conventional Commits** untuk menjaga riwayat yang bersih dan mudah dibaca:

```
<tipe>(cakupan opsional): <deskripsi singkat>

[isi opsional]

[catatan kaki opsional]
```

### Tipe yang Tersedia

| Tipe | Keterangan |
|---|---|
| `feat` | Fitur baru |
| `fix` | Perbaikan bug |
| `docs` | Perubahan dokumentasi saja |
| `style` | Perubahan format/gaya (tidak memengaruhi logika) |
| `refactor` | Refaktor kode tanpa perubahan fitur atau bug fix |
| `perf` | Peningkatan performa |
| `test` | Penambahan atau perbaikan test |
| `chore` | Pembaruan dependensi, konfigurasi build, dsb |
| `security` | Perbaikan celah keamanan |

### Contoh

```
feat(admin): tambahkan filter tanggal pada tabel rekap absensi
fix(geo): perbaiki perhitungan haversine untuk koordinat negatif
docs: perbarui panduan instalasi di README
perf(camera): turunkan resolusi default untuk perangkat low-end
security(api): validasi input server-side pada endpoint /api/absensi
```

---

## Proses Review Pull Request

1. Semua Pull Request wajib melewati `npm run check` tanpa error atau peringatan
2. Satu Pull Request sebaiknya hanya menyelesaikan satu masalah atau fitur
3. Sertakan deskripsi yang jelas: apa yang diubah dan mengapa
4. Jika Pull Request menutup sebuah Issue, cantumkan `Closes #nomor-issue`
5. Minimal **1 review** dari anggota tim NAWASENA IT diperlukan sebelum merge
6. Setelah disetujui, PR akan di-merge oleh maintainer menggunakan **squash merge**

---

## Melaporkan Bug

Gunakan template berikut saat membuat laporan bug:

```markdown
## Deskripsi Bug
Penjelasan singkat dan jelas tentang bug yang terjadi.

## Langkah Reproduksi
1. Buka halaman '...'
2. Klik '...'
3. Gulir ke '...'
4. Lihat error

## Perilaku yang Diharapkan
Penjelasan tentang apa yang seharusnya terjadi.

## Screenshot / Video
Jika ada, tambahkan screenshot atau rekaman layar.

## Lingkungan
- OS: [contoh: Android 13, iOS 17, Windows 11]
- Browser: [contoh: Chrome 126, Safari 17]
- Versi Aplikasi: [contoh: 1.0.0]
```

---

## Mengusulkan Fitur

```markdown
## Ringkasan Fitur
Satu paragraf singkat menjelaskan fitur yang diinginkan.

## Motivasi
Mengapa fitur ini diperlukan? Masalah apa yang diselesaikan?

## Solusi yang Diusulkan
Penjelasan teknis atau UX tentang bagaimana fitur ini bekerja.

## Alternatif yang Dipertimbangkan
Apakah ada solusi alternatif yang sudah dipikirkan?

## Konteks Tambahan
Screenshot, mockup, atau referensi lain.
```

---

## Lingkungan Pengembangan

```bash
# Instal dependensi
npm install

# Salin dan isi variabel lingkungan
cp .env.example .env

# Push skema database
npm run db:push

# Jalankan server pengembangan
npm run dev

# Pemeriksaan tipe
npm run check
```

Untuk detail lebih lanjut, lihat bagian **Memulai** di [README.md](./README.md).

---

<div align="center">
  <sub>Terima kasih telah meluangkan waktu untuk membaca panduan ini. Kontribusi Anda sangat berarti!</sub>
  <br/>
  <sub>NAWASENA TEAM DEVELOPMENT · NAWA-ABSEN · MPLS 2026 · SMAN 2 Jonggol</sub>
</div>
