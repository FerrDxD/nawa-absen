<div align="center">

<br/>

```
███╗   ██╗ █████╗ ██╗    ██╗ █████╗       █████╗ ██████╗ ███████╗███████╗███╗   ██╗
████╗  ██║██╔══██╗██║    ██║██╔══██╗     ██╔══██╗██╔══██╗██╔════╝██╔════╝████╗  ██║
██╔██╗ ██║███████║██║ █╗ ██║███████║     ███████║██████╔╝███████╗█████╗  ██╔██╗ ██║
██║╚██╗██║██╔══██║██║███╗██║██╔══██║     ██╔══██║██╔══██╗╚════██║██╔══╝  ██║╚██╗██║
██║ ╚████║██║  ██║╚███╔███╔╝██║  ██║     ██║  ██║██████╔╝███████║███████╗██║ ╚████║
╚═╝  ╚═══╝╚═╝  ╚═╝ ╚══╝╚══╝ ╚═╝  ╚═╝     ╚═╝  ╚═╝╚═════╝ ╚══════╝╚══════╝╚═╝  ╚═══╝
```

**Portal Presensi Digital MPLS 2026 · SMAN 2 Jonggol**

*Dibangun oleh NAWASENA IT — "Website sekolah yang kualitasnya terasa seperti startup teknologi."*

<br/>

[![License: MIT](https://img.shields.io/badge/Lisensi-MIT-blue.svg?style=flat-square)](./LICENSE)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-5.x-FF3E00?style=flat-square&logo=svelte)](https://kit.svelte.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle-ORM-C5F74F?style=flat-square)](https://orm.drizzle.team)
[![Neon DB](https://img.shields.io/badge/Neon-PostgreSQL-00E5CC?style=flat-square)](https://neon.tech)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?style=flat-square&logo=vercel)](https://vercel.com)

</div>

---

## Tentang Proyek

**NAWA-ABSEN** adalah sistem presensi digital berbasis web untuk kegiatan MPLS (Masa Pengenalan Lingkungan Sekolah) di SMAN 2 Jonggol. Dirancang dengan filosofi _SaaS Startup_ — ringan, cepat, dan mampu berjalan di perangkat apapun mulai dari HP entry-level (2/32 GB RAM) hingga laptop premium.

Sistem ini mengintegrasikan tiga lapisan verifikasi kehadiran secara bersamaan:

- **Verifikasi Wajah** — Kamera depan dengan deteksi wajah otomatis berbasis pixel analysis
- **Verifikasi Lokasi** — GPS multi-sample dengan _weighted average positioning_ untuk presisi di dalam ruangan
- **Konfirmasi Swipe** — Mekanisme geser untuk konfirmasi layaknya Google Play, mencegah tap tidak sengaja

---

## Fitur Utama

| Fitur | Keterangan |
|---|---|
| Presensi Berbasis GPS | Geofencing radius dari titik koordinat sekolah |
| Verifikasi Foto Wajah | Deteksi wajah otomatis + snapshot real-time |
| Swipe to Confirm | Mekanisme konfirmasi geser anti-salah-tekan |
| Admin Dashboard | Dasbor enterprise dengan KPI, grafik, tabel rekap |
| Peta Geolokasi Real-Time | Leaflet + OpenStreetMap dengan kode warna 8 Gugus |
| Ekspor CSV | Unduh rekap kehadiran per gugus/tanggal |
| Dark Mode | Dukungan tema gelap/terang adaptif |
| Adaptif Low-End | Deteksi otomatis perangkat, resolusi & interval menyesuaikan |
| Anti-Titip Absen | Validasi duplikasi nama + gugus + tanggal di server |
| Zero ENV Leak | Semua validasi sensitif dilakukan di server-side |

---

## Tumpukan Teknologi

```
Frontend       SvelteKit 5 (Svelte Runes) · TypeScript · Tailwind CSS v4
Backend        SvelteKit Server Routes (SSR API)
Database       Neon PostgreSQL (Serverless) + Drizzle ORM
Storage        Vercel Blob (foto) / Base64 fallback (database)
Peta           Leaflet.js + OpenStreetMap
Deploy         Vercel (Serverless Functions)
```

---

## Struktur Proyek

```
nawa-absen/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── AdminAttendanceMap.svelte   # Peta interaktif Leaflet (8 Gugus)
│   │   │   ├── CameraCapture.svelte        # Kamera + deteksi wajah
│   │   │   └── GeoStatus.svelte            # GPS multi-sample indoor
│   │   └── server/
│   │       ├── db/
│   │       │   └── schema.ts               # Skema Drizzle ORM
│   │       ├── db.ts                       # Koneksi Neon DB
│   │       └── service.ts                  # Business logic layer
│   └── routes/
│       ├── +layout.svelte                  # Layout global + dark mode
│       ├── +page.svelte                    # Halaman utama presensi peserta
│       ├── admin/
│       │   ├── +page.server.ts             # Server load (koordinat dari .env)
│       │   └── +page.svelte                # Admin Control Panel
│       └── api/
│           ├── absensi/+server.ts          # POST presensi
│           ├── admin/
│           │   ├── login/+server.ts        # Autentikasi admin (server-only)
│           │   ├── records/+server.ts      # GET rekap + statistik
│           │   └── export/+server.ts       # Ekspor CSV
│           ├── config/+server.ts           # GET/POST konfigurasi geofence
│           └── gugus/+server.ts            # GET daftar gugus
├── drizzle.config.ts
├── .env                                    # Variabel lingkungan (JANGAN di-commit)
└── vite.config.ts
```

---

## Memulai

### Prasyarat

- **Node.js** >= 20.x
- **npm** >= 10.x
- Akun **Neon** (PostgreSQL serverless gratis) — [console.neon.tech](https://console.neon.tech)
- Akun **Vercel** untuk deployment — [vercel.com](https://vercel.com)

### Instalasi Lokal

```bash
# 1. Clone repositori
git clone https://github.com/ferrdxd/nawa-absen.git
cd nawa-absen

# 2. Instal dependensi
npm install

# 3. Salin template variabel lingkungan
cp .env.example .env
```

### Konfigurasi Variabel Lingkungan

Buka file `.env` dan isi setiap nilai:

```env
# Database (dapatkan dari https://console.neon.tech)
DATABASE_URL="postgresql://..."

# Koordinat sekolah (titik pusat geofence)
SCHOOL_LAT="-6.470206"
SCHOOL_LNG="107.074081"

# Radius geofence dalam meter
GEOFENCE_RADIUS_M="70"

# Toleransi akurasi GPS (meter)
MAX_GPS_ACCURACY_M="100"

# Kata sandi halaman /admin
ADMIN_PASSWORD="kata_sandi_rahasia"

# Vercel Blob (opsional — jika kosong, foto disimpan sebagai Base64 di DB)
BLOB_READ_WRITE_TOKEN=""
```

> **Peringatan:** Jangan pernah meng-commit file `.env` ke repositori. File ini sudah terdaftar di `.gitignore`.

### Migrasi Database

```bash
# Push skema ke Neon PostgreSQL
npm run db:push

# (Opsional) Buka Drizzle Studio untuk inspeksi data
npm run db:studio
```

### Menjalankan Server Pengembangan

```bash
npm run dev
```

Buka [http://localhost:5173](http://localhost:5173) di browser.

---

## Panduan Gugus

Sistem mendukung 8 Gugus MPLS dengan identitas warna unik pada peta:

| # | Nama Gugus | Warna | Kode Hex |
|---|---|---|---|
| 1 | Padjajaran | Putih | `#FFFFFF` |
| 2 | Tarumanagara | Hitam | `#0F172A` |
| 3 | Subanglarang | Biru | `#2563EB` |
| 4 | Siliwangi | Merah | `#EF4444` |
| 5 | Kawali | Hijau | `#10B981` |
| 6 | Talaga | Kuning | `#F59E0B` |
| 7 | Pakuwan | Pink | `#EC4899` |
| 8 | Wastukencana | Ungu | `#8B5CF6` |

---

## Deployment ke Vercel

```bash
# Instal Vercel CLI
npm i -g vercel

# Login dan deploy
vercel --prod
```

Pastikan semua variabel lingkungan dari `.env` sudah ditambahkan di **Vercel Dashboard → Settings → Environment Variables** sebelum deploy.

---

## Skrip yang Tersedia

| Skrip | Keterangan |
|---|---|
| `npm run dev` | Server pengembangan lokal |
| `npm run build` | Build produksi |
| `npm run preview` | Preview hasil build |
| `npm run check` | Pemeriksaan tipe TypeScript + Svelte |
| `npm run db:push` | Sinkronisasi skema ke database |
| `npm run db:studio` | Buka GUI Drizzle Studio |

---

## Lisensi

Didistribusikan di bawah **Lisensi MIT**. Lihat [LICENSE](./LICENSE) untuk informasi selengkapnya.

---

## Tim Pengembang

Dikembangkan dengan dedikasi oleh **OSIS/MPK NAWASENA** untuk SMAN 2 Jonggol.

> *"Menghadirkan teknologi kelas dunia untuk lingkungan pendidikan Indonesia."*

---

<div align="center">
  <sub>NAWA-ABSEN v1.0.0 · MPLS 2026 · SMAN 2 Jonggol · &copy; 2026 NAWASENA IT</sub>
</div>
