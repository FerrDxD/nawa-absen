# NAWA-ABSEN — UI Redesign Spec (v2, koreksi arah)
**Portal Presensi Calon Murid Baru · MPLS 2026 · SMAN 2 Jonggol**
**Arah desain: Native Mobile App Premium × Bottom-Sheet Split-Screen × Minimal**

---

## 0. Koreksi dari v1

v1 kebablasan ke arah cyberpunk-HUD (reticle radar, mono font, neon glow di semua tempat) — itu identitas LOGOS, bukan NAWA-ABSEN. Referensi asli (gambar 2) jauh lebih tenang: **split-screen** kamera gelap di atas + **bottom sheet putih** di bawah, pill badge translucent secukupnya, satu tombol capture polos. Kesan "premium" datang dari kebersihan & whitespace, bukan dari efek neon. Spec ini ditulis ulang berbasis itu.

---

## 1. Konsep Besar

Layout terbagi dua zona permanen (bukan scroll panjang kayak v1):
- **Zona atas (±55% viewport): Camera viewport**, background `--void` true black, live feed kamera, status pill mengambang di atasnya.
- **Zona bawah (±45% viewport, fixed bottom sheet): Form area**, background putih bersih, rounded-top besar (`radius 28-32px`), naik menutupi sedikit bagian bawah kamera — pola bottom-sheet native app (mirip Gojek/Grab check-in, bukan dashboard).

Ini SPA satu layar, tanpa scroll section terpisah kayak v1. Semua interaksi (GPS check, face capture, isi identitas, submit) terjadi di satu viewport yang sama.

---

## 2. Design Tokens (revisi)

### 2.1 Warna

| Token | Hex | Peran |
|---|---|---|
| `--void` | `#050507` | Background zona kamera |
| `--sheet` | `#FFFFFF` | Background bottom sheet |
| `--sheet-muted` | `#F4F5F7` | Input field, disabled button |
| `--pill-bg` | `rgba(10,10,12,0.55)` | Background pill status, backdrop-blur |
| `--confirm-green` | `#2ECC71` | GPS terkunci, jarak valid, tombol aktif |
| `--session-purple` | `#7C5CFC` | Label sesi ("Datang"/"Pulang") |
| `--text-hi` | `#111114` | Teks utama di atas sheet putih |
| `--text-lo` | `#8A8A93` | Caption, label kecil |
| `--text-on-void` | `#FFFFFF` | Teks di atas kamera gelap |

**Perubahan penting:** tidak ada lagi multi-neon (cyan/magenta/lime). Hanya **satu accent hijau** (status valid) + **satu accent ungu** (label sesi). Warna lain netral hitam-putih-abu. Ini yang bikin gambar 2 terasa premium — disiplin warna, bukan ramai warna.

### 2.2 Tipografi

| Peran | Font | Catatan |
|---|---|---|
| Semua teks | **Inter / SF Pro-style sans** | Tidak ada mono font lagi. Tidak ada all-caps besar-besar. |
| Judul pill/label | Inter 11-12px, uppercase, letter-spacing +0.04em, `--text-lo` | Kecil & tenang, bukan headline |
| Angka penting (jarak, waktu) | Inter Semibold 14-16px | Kontras lewat weight, bukan lewat ukuran ekstrem |
| Nama section ("Live Presensi") | Inter Semibold 16-18px, center | Ini satu-satunya elemen besar di header |

### 2.3 Layout — Mobile First SPA (sesuai gambar 2)

```
┌─────────────────────────┐
│  ‹      LIVE PRESENSI    │  ← header minimal, back button + title center
├─────────────────────────┤
│ [GPS·Terkunci][Jarak 128m][Sesi Datang]  │  ← 3 pill mengambang, row horizontal
│                          │
│      (camera feed)       │  ← void black, wajah samar terlihat natural
│                          │
│         ◎ (capture)      │  ← tombol putih polos, ring tipis, TANPA reticle
├─────────────────────────┤  ← bottom sheet mulai, rounded-top 28px, shadow soft ke atas
│  IDENTITAS SISWA         │  ← label kecil uppercase abu
│  [ Cari nama atau NISN...]│  ← input rounded-xl, bg --sheet-muted, no border tebal
│                          │
│  [ ✓  Kirim Presensi ]   │  ← tombol full-width rounded-full, abu saat disabled,
│                          │     hijau solid saat form valid
└─────────────────────────┘
```

---

## 3. Breakdown Komponen

### 3.1 Header
- Back chevron kiri, judul "LIVE PRESENSI" center, tanpa badge/status di kanan (beda dari v1 yang terlalu ramai di top bar).
- Background tetap `--void`, menyatu dengan zona kamera — header dan kamera adalah satu blok visual, bukan bar terpisah.

### 3.2 Status Pills (pengganti stat card v1)
- 3 pill sejajar horizontal, melayang di atas kamera dengan `backdrop-filter: blur(10px)` + `--pill-bg`.
- Tiap pill: label kecil abu di atas, value bold di bawah. Value dikasih warna sesuai makna (hijau = valid, ungu = info sesi, putih = netral).
- Radius pill besar (pill-shape penuh, bukan rounded-rect kotak).
- **Tidak ada** animasi rotate/radar. Titik status GPS boleh pulse halus (opacity 0.6→1, 2s) — itu satu-satunya motion di sini.

### 3.3 Camera Viewport
- Full width, dark, tanpa overlay grid/scan-line/reticle kotak.
- Wajah terlihat natural dengan sedikit vignette gelap di tepi biar fokus ke tengah — bukan dibingkai kotak targeting.
- Tombol capture: lingkaran putih solid + ring tipis abu di luar (gaya tombol kamera native iOS/Android), posisinya overlap dikit ke bottom sheet — jadi jembatan visual antara dua zona.

### 3.4 Bottom Sheet — Identitas & Submit
- Putih bersih, shadow lembut ke atas (`box-shadow: 0 -8px 24px rgba(0,0,0,0.08)`), rounded-top 28-32px.
- Label "IDENTITAS SISWA" kecil, uppercase, abu, letter-spacing lebar.
- Input search rounded-xl, background `--sheet-muted`, placeholder abu, tanpa border tebal — cukup halus.
- Tombol "Kirim Presensi": full-width, rounded-full, icon check di kiri teks.
  - State disabled: abu (`--sheet-muted` bg, teks abu).
  - State aktif/valid: hijau solid `--confirm-green`, teks putih.
  - State submitting: spinner kecil menggantikan icon check.
  - State sukses: icon check animasi scale-in singkat, lalu auto-transisi ke state berikutnya.

---

## 4. Motion Principles (revisi — jauh lebih minim dari v1)

1. GPS status dot: pulse halus, satu-satunya ambient motion.
2. Tombol capture: scale 0.95 saat ditekan, kembali on release.
3. Transisi status pill (misal jarak berubah dari "128m" ke "Valid"): crossfade angka, bukan slide/bounce.
4. Bottom sheet muncul pertama kali dengan slide-up ease-out 300ms, sekali saja saat halaman load.
5. **Dihapus dari v1:** rotate reticle, sonar-pulse ring, diagonal divider, count-up angka besar, flash-highlight feed item. Semua itu terlalu "loud" untuk konteks ini.

---

## 5. Implementation Notes (stack tetap sama)

- **Svelte 5 + TypeScript + Tailwind**, custom properties untuk token warna di atas.
- Layout pakai `position: fixed` dua zona: camera container `inset: 0 0 45% 0`, sheet container `position: fixed; bottom: 0` dengan `border-radius` di top corners saja.
- Pill status: `<div>` flex row, `backdrop-filter: blur(10px)`, posisi `absolute` di atas video element, bukan bagian dari document flow kamera.
- Kamera: `getUserMedia` seperti sebelumnya, video element `object-fit: cover`, vignette pakai `radial-gradient` overlay tipis di atas video.
- Bottom sheet: gunakan native `<form>` state (Svelte) untuk validasi realtime nama/NISN sebelum enable tombol submit — jangan enable tombol sebelum GPS+jarak+wajah semua valid.

---

## 6. Prompt Siap Pakai (Antigravity-style)

```
Redesign NAWA-ABSEN jadi mobile-first SPA satu layar dengan split-screen:
zona atas kamera dark (true black #050507) untuk live face capture,
zona bawah bottom-sheet putih rounded-top 28px untuk form identitas.

Header minimal: back chevron kiri, judul "LIVE PRESENSI" center, di atas
background gelap yang menyatu dengan kamera.

Di atas kamera: 3 pill status horizontal (GPS Terkunci, Jarak Xm/maks,
Sesi Datang/Pulang) dengan backdrop-blur dan background rgba hitam
transparan. Value pill: hijau untuk valid, ungu untuk info sesi.
TIDAK ADA reticle kotak, TIDAK ADA radar/scan-line, TIDAK ADA glow neon.

Tombol capture: lingkaran putih polos dengan ring tipis, posisi
overlap antara kamera dan bottom sheet.

Bottom sheet: label kecil uppercase abu "IDENTITAS SISWA", input search
rounded-xl background abu muda tanpa border tebal, tombol full-width
rounded-full "Kirim Presensi" (abu saat disabled, hijau solid saat valid).

Tipografi: Inter/SF Pro-style saja, tanpa mono font, tanpa all-caps
headline besar. Motion minim: hanya pulse halus di status dot dan
transisi crossfade angka. Warna dibatasi: hitam-putih-abu netral +
satu hijau (valid) + satu ungu (sesi) — tidak multi-neon.

Stack: Svelte 5, TypeScript, Tailwind, CSS custom properties.
```

---

*v2 ini fix arah biar tidak ketuker sama identitas LOGOS. Kalau masih ada elemen yang kerasa norak pas di-build, kirim screenshot lagi — gampang di-tune dari sini.*
