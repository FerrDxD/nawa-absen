<script lang="ts">
	import { onMount } from 'svelte';

	let {
		onPermissionGranted = () => {}
	}: {
		onPermissionGranted: () => void;
	} = $props();

	let isOpen = $state(false); // Mulai false sampai kita cek apakah sudah pernah diizinkan
	let isRequesting = $state(false);
	let errorMsg = $state<string | null>(null);
	let step = $state<'guide' | 'requesting' | 'done'>('guide');

	onMount(async () => {
		try {
			// Cek apakah user sebelumnya sudah mengizinkan akses di kunjungan terdahulu
			const savedGranted = localStorage.getItem('nawa_absen_permissions_granted') === 'true';
			if (savedGranted) {
				isOpen = false;
				onPermissionGranted();
				return;
			}

			// Cek melalui Permissions API browser jika tersedia
			if (navigator.permissions && navigator.permissions.query) {
				try {
					const [geoPerm, camPerm] = await Promise.all([
						navigator.permissions.query({ name: 'geolocation' }),
						navigator.permissions.query({ name: 'camera' as any }).catch(() => null)
					]);
					if (geoPerm.state === 'granted' && (!camPerm || camPerm.state === 'granted')) {
						localStorage.setItem('nawa_absen_permissions_granted', 'true');
						isOpen = false;
						onPermissionGranted();
						return;
					}
				} catch (e) {
					// Lanjut ke penampakan modal
				}
			}
		} catch (e) {
			// abaikan error localStorage (misal incognito ketat)
		}

		// Jika belum diizinkan sebelumnya, buka modal
		isOpen = true;
	});

	async function handleGrantPermissions() {
		isRequesting = true;
		errorMsg = null;
		step = 'requesting';

		// 1. Minta izin kamera
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
			stream.getTracks().forEach((t) => t.stop());
		} catch (err: any) {
			if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
				errorMsg = 'Izin kamera ditolak browser. Klik ikon kunci/pengaturan di bilah URL browser Anda, aktifkan Kamera, lalu muat ulang halaman.';
				isRequesting = false;
				step = 'guide';
				return;
			}
		}

		// 2. Minta izin lokasi GPS
		const locationGranted = await new Promise<boolean>((resolve) => {
			navigator.geolocation.getCurrentPosition(
				() => resolve(true),
				() => resolve(false),
				{ enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
			);
		});

		if (!locationGranted) {
			errorMsg = 'Izin lokasi GPS ditolak. Klik ikon kunci/pengaturan di bilah URL browser Anda, aktifkan Lokasi, lalu muat ulang halaman.';
			isRequesting = false;
			step = 'guide';
			return;
		}

		// Simpan status bahwa pengguna sudah memberi izin
		try {
			localStorage.setItem('nawa_absen_permissions_granted', 'true');
		} catch (e) {}

		step = 'done';
		isRequesting = false;
		await new Promise((r) => setTimeout(r, 600));
		isOpen = false;
		onPermissionGranted();
	}
</script>

{#if isOpen}
	<!-- Backdrop Blur dengan Efek Ambient Glow -->
	<div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-md transition-opacity duration-300">
		<!-- Efek glow di belakang modal -->
		<div class="absolute w-72 h-72 bg-blue-600/20 rounded-full blur-3xl pointer-events-none animate-pulse"></div>

		<!-- Card Modal -->
		<div class="relative w-full sm:max-w-md sm:mx-4 sm:mb-4 flex flex-col max-h-[92dvh] sm:max-h-[88vh] rounded-t-[32px] sm:rounded-[32px] border border-white/20 dark:border-slate-700/80 bg-white/95 dark:bg-slate-900/95 shadow-[0_25px_70px_-15px_rgba(37,99,235,0.35)] overflow-hidden transition-all duration-300">
			
			<!-- Header Premium Gradient -->
			<div class="relative bg-gradient-to-br from-[#1E40AF] via-[#2563EB] to-[#3B82F6] px-6 pt-7 pb-8 text-white overflow-hidden shrink-0">
				<!-- Lingkaran dekorasi geometris -->
				<div class="absolute -top-10 -right-10 h-36 w-36 rounded-full bg-white/10 blur-xl pointer-events-none"></div>
				<div class="absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-blue-300/10 blur-lg pointer-events-none"></div>

				<div class="relative z-10">
					<!-- Badge lencana ikon kamera & satelit -->
					<div class="flex items-center gap-3 mb-4">
						<div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 shadow-inner">
							<svg class="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
								<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
								<circle cx="12" cy="13" r="3"/>
							</svg>
						</div>
						<div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 shadow-inner">
							<svg class="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
								<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
								<circle cx="12" cy="10" r="3"/>
							</svg>
						</div>
						<div class="ml-auto">
							<span class="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-md px-3 py-1 text-[11px] font-bold tracking-wide uppercase border border-white/25">
								<span class="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse"></span>
								Verifikasi Aman
							</span>
						</div>
					</div>

					<h2 class="text-xl sm:text-2xl font-extrabold tracking-tight leading-snug">
						Izin Akses Presensi
					</h2>
					<p class="mt-1.5 text-xs sm:text-sm text-blue-100/90 leading-relaxed max-w-sm">
						Untuk menjamin presensi yang akurat dan transparan, aktifkan akses sensor kamera dan satelit GPS perangkat Anda.
					</p>
				</div>
			</div>

			<!-- Konten Informasi Akses -->
			<div class="overflow-y-auto flex-1 px-5 py-5 sm:px-6 sm:py-6 space-y-3.5">
				
				<!-- Item 1: Kamera -->
				<div class="group flex items-start gap-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 p-4 hover:border-blue-300 dark:hover:border-blue-700 transition">
					<div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 group-hover:scale-105 transition">
						<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
							<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
							<circle cx="12" cy="13" r="3"/>
						</svg>
					</div>
					<div class="min-w-0">
						<div class="flex items-center gap-2">
							<p class="text-sm font-bold text-slate-900 dark:text-white">Kamera Wajah (Selfie)</p>
							<span class="rounded-md bg-blue-100 dark:bg-blue-900/60 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300">Wajib</span>
						</div>
						<p class="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
							Mengambil bukti kehadiran real-time. Foto disimpan terenkripsi di server sekolah.
						</p>
					</div>
				</div>

				<!-- Item 2: Lokasi GPS -->
				<div class="group flex items-start gap-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 p-4 hover:border-blue-300 dark:hover:border-blue-700 transition">
					<div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 group-hover:scale-105 transition">
						<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
							<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
							<circle cx="12" cy="10" r="3"/>
						</svg>
					</div>
					<div class="min-w-0">
						<div class="flex items-center gap-2">
							<p class="text-sm font-bold text-slate-900 dark:text-white">Satelit Lokasi (GPS)</p>
							<span class="rounded-md bg-blue-100 dark:bg-blue-900/60 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300">Geofencing</span>
						</div>
						<p class="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
							Memvalidasi keberadaan Anda di area SMAN 2 Jonggol saat melakukan absensi.
						</p>
					</div>
				</div>

				<!-- Privasi & Keamanan -->
				<div class="flex items-center gap-3 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/30 dark:border-emerald-800/60 p-3.5">
					<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
						<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
							<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
						</svg>
					</div>
					<p class="text-xs text-emerald-800 dark:text-emerald-300 font-semibold leading-snug">
						Privasi Terjamin. Akses hanya aktif selama proses absensi berlangsung.
					</p>
				</div>

				<!-- Pesan error -->
				{#if errorMsg}
					<div class="flex items-start gap-3 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-800/70 p-4 animate-shake">
						<svg class="h-5 w-5 shrink-0 text-red-500 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
							<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
						</svg>
						<p class="text-xs text-red-700 dark:text-red-300 font-medium leading-relaxed">{errorMsg}</p>
					</div>
				{/if}
			</div>

			<!-- Tombol Aksi CTA -->
			<div class="px-5 pb-6 pt-3 sm:px-6 sm:pb-6 space-y-3 border-t border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 shrink-0">
				<button
					type="button"
					onclick={handleGrantPermissions}
					disabled={isRequesting || step === 'done'}
					class="w-full rounded-2xl py-4 text-sm font-bold text-white transition-all duration-200 flex items-center justify-center gap-2.5 shadow-lg
						{step === 'done'
							? 'bg-emerald-600 shadow-emerald-600/30'
							: 'bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 shadow-blue-600/35 hover:shadow-blue-600/50 hover:scale-[1.01] active:scale-[0.99]'}
						disabled:opacity-75 disabled:cursor-not-allowed"
				>
					{#if step === 'requesting'}
						<span class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
						<span>Meminta Izin Browser...</span>
					{:else if step === 'done'}
						<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
							<polyline points="20 6 9 17 4 12"/>
						</svg>
						<span>Izin Diberikan! Memuat...</span>
					{:else}
						<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
							<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
						</svg>
						<span>Aktifkan Izin & Lanjutkan Presensi</span>
					{/if}
				</button>

				<p class="text-center text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
					Pada kunjungan berikutnya, izin akan diingat dan sistem langsung terbuka otomatis.
				</p>
			</div>
		</div>
	</div>
{/if}
