# Kebijakan Keamanan

## Versi yang Didukung

Berikut adalah versi NAWA-ABSEN yang saat ini menerima pembaruan keamanan:

| Versi | Status |
|-------|--------|
| 1.0.x | Didukung |
| < 1.0 | Tidak didukung |

---

## Melaporkan Kerentanan

Kami menganggap serius keamanan NAWA-ABSEN. Jika Anda menemukan kerentanan keamanan,
**jangan** melaporkannya melalui GitHub Issues publik.

### Cara Melaporkan

Kirim laporan kerentanan secara privat ke tim keamanan NAWASENA IT melalui salah satu kanal berikut:

- **Email:** ferdi@nawasena.site
- **Subject:** `[SECURITY] Nama Kerentanan — NAWA-ABSEN`

### Informasi yang Perlu Disertakan

Untuk membantu kami menangani laporan dengan cepat dan tepat, sertakan informasi berikut:

1. **Deskripsi kerentanan** — Penjelasan teknis yang jelas
2. **Langkah reproduksi** — Petunjuk langkah demi langkah untuk mereproduksi masalah
3. **Dampak potensial** — Estimasi risiko dan dampak terhadap pengguna atau data
4. **Versi yang terpengaruh** — Versi NAWA-ABSEN mana yang terdampak
5. **Bukti konsep (PoC)** — Kode atau screenshot jika tersedia (opsional)
6. **Saran mitigasi** — Jika Anda memiliki saran perbaikan (opsional)

---

## Komitmen Kami

Setelah menerima laporan kerentanan yang valid, kami berkomitmen untuk:

| Jangka Waktu | Tindakan |
|---|---|
| **48 jam** | Konfirmasi penerimaan laporan |
| **5 hari kerja** | Penilaian awal dan klasifikasi risiko |
| **30 hari** | Penerapan perbaikan dan koordinasi pengungkapan |

---

## Cakupan

Kebijakan ini berlaku untuk komponen berikut:

**Dalam Cakupan:**
- Kode sumber di repositori `nawa-absen`
- Endpoint API (`/api/*`)
- Sistem autentikasi admin (`/admin`)
- Mekanisme geofencing dan validasi GPS
- Penyimpanan dan transmisi data pribadi siswa (nama, foto, koordinat)

**Di Luar Cakupan:**
- Infrastruktur pihak ketiga (Neon, Vercel, Vercel Blob)
- Kerentanan pada browser atau sistem operasi pengguna

---

## Pengungkapan yang Bertanggung Jawab

Kami mendukung praktik **Responsible Disclosure**. Setelah kerentanan diperbaiki dan
rilis keamanan tersedia, kami akan:

- Mempublikasikan advisory keamanan
- Memberikan kredit kepada peneliti yang melaporkan (jika diinginkan)

Kami meminta agar Anda tidak mengungkapkan kerentanan secara publik sebelum perbaikan
diterapkan dan koordinasi pengungkapan selesai.

---

## Penghargaan

Kami berterima kasih kepada individu-individu berikut yang telah membantu meningkatkan
keamanan NAWA-ABSEN melalui pengungkapan yang bertanggung jawab:

*Tidak ada laporan yang diterima sejauh ini. Jadilah yang pertama!*

---

<div align="center">
  <sub>Nawasena Team Development · Kebijakan Keamanan v1.0 · Berlaku sejak Juli 2026</sub>
</div>
