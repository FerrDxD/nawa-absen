<script lang="ts">
	import { onMount } from 'svelte';

	let {
		onPermissionGranted = () => {}
	}: {
		onPermissionGranted: () => void;
	} = $props();

	// 'camera' = step kamera, 'location' = step lokasi, 'done' = selesai, 'closed' = tutup
	let currentStep = $state<'camera' | 'location' | 'done' | 'closed'>('closed');
	let isRequesting = $state(false);
	let cameraGranted = $state(false);
	let isDone = $state(false);
	let errorMsg = $state<string | null>(null);

	onMount(async () => {
		try {
			const savedGranted = localStorage.getItem('nawa_absen_permissions_granted') === 'true';
			if (savedGranted) {
				currentStep = 'closed';
				onPermissionGranted();
				return;
			}

			if (navigator.permissions && navigator.permissions.query) {
				try {
					const [geoPerm, camPerm] = await Promise.all([
						navigator.permissions.query({ name: 'geolocation' }),
						navigator.permissions.query({ name: 'camera' as any }).catch(() => null)
					]);
					if (geoPerm.state === 'granted' && (!camPerm || camPerm.state === 'granted')) {
						localStorage.setItem('nawa_absen_permissions_granted', 'true');
						currentStep = 'closed';
						onPermissionGranted();
						return;
					}
				} catch (e) {}
			}
		} catch (e) {}

		// Mulai dari step kamera
		currentStep = 'camera';
	});

	async function handleGrantCamera() {
		isRequesting = true;
		errorMsg = null;

		try {
			const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
			stream.getTracks().forEach((t) => t.stop());
			cameraGranted = true;
			isRequesting = false;
			// Lanjut ke step lokasi
			currentStep = 'location';
		} catch (err: any) {
			isRequesting = false;
			if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
				errorMsg =
					'Izin kamera ditolak. Klik ikon 🔒 di bilah URL browser, aktifkan Kamera, lalu muat ulang halaman.';
			} else {
				errorMsg = 'Tidak bisa mengakses kamera. Pastikan kamera perangkat Anda berfungsi.';
			}
		}
	}

	async function handleGrantLocation() {
		isRequesting = true;
		errorMsg = null;

		const locationGranted = await new Promise<boolean>((resolve) => {
			navigator.geolocation.getCurrentPosition(
				() => resolve(true),
				() => resolve(false),
				{ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
			);
		});

		if (!locationGranted) {
			isRequesting = false;
			errorMsg =
				'Izin lokasi ditolak. Klik ikon 🔒 di bilah URL browser, aktifkan Lokasi, lalu muat ulang halaman.';
			return;
		}

		try {
			localStorage.setItem('nawa_absen_permissions_granted', 'true');
		} catch (e) {}

		isDone = true;
		isRequesting = false;
		await new Promise((r) => setTimeout(r, 700));
		currentStep = 'closed';
		onPermissionGranted();
	}

	let isOpen = $derived(currentStep !== 'closed');
</script>

{#if isOpen}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-md"
	>
		<!-- Ambient glow -->
		<div
			class="absolute w-80 h-80 rounded-full blur-3xl pointer-events-none animate-pulse
			{currentStep === 'camera'
				? 'bg-blue-600/25'
				: currentStep === 'location'
					? 'bg-amber-500/20'
					: 'bg-emerald-500/25'}"
		></div>

		<!-- Modal Card -->
		<div
			class="relative w-full sm:max-w-md sm:mx-4 sm:mb-4 flex flex-col max-h-[92dvh] sm:max-h-[88vh]
			rounded-t-[32px] sm:rounded-[32px] border border-white/20 dark:border-slate-700/80
			bg-white/97 dark:bg-slate-900/97 shadow-2xl overflow-hidden"
		>
			<!-- ============================== -->
			<!-- STEP 1: KAMERA -->
			<!-- ============================== -->
			{#if currentStep === 'camera'}
				<!-- Header Gradient Biru -->
				<div
					class="relative bg-gradient-to-br from-[#1E40AF] via-[#2563EB] to-[#3B82F6] px-6 pt-7 pb-8 text-white overflow-hidden shrink-0"
				>
					<div class="absolute -top-10 -right-10 h-36 w-36 rounded-full bg-white/10 blur-xl pointer-events-none"></div>
					<div class="absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-blue-300/10 blur-lg pointer-events-none"></div>

					<div class="relative z-10">
						<div class="flex items-center gap-3 mb-4">
							<!-- Ikon kamera besar -->
							<div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 shadow-inner">
								<svg class="h-7 w-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
									<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
									<circle cx="12" cy="13" r="3"/>
								</svg>
							</div>
							<!-- Step indicator -->
							<div class="ml-auto flex items-center gap-2">
								<div class="flex items-center gap-1.5">
									<span class="h-2 w-2 rounded-full bg-white shadow-sm"></span>
									<span class="h-2 w-2 rounded-full bg-white/30"></span>
								</div>
								<span class="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-md px-3 py-1 text-[11px] font-bold tracking-wide uppercase border border-white/25">
									<span class="h-1.5 w-1.5 rounded-full bg-blue-200 animate-pulse"></span>
									Langkah 1 / 2
								</span>
							</div>
						</div>

						<h2 class="text-xl sm:text-2xl font-extrabold tracking-tight leading-snug">
							Izin Akses Kamera
						</h2>
						<p class="mt-1.5 text-xs sm:text-sm text-blue-100/90 leading-relaxed max-w-sm">
							Aplikasi presensi membutuhkan kamera untuk mengambil foto selfie sebagai bukti kehadiran Anda.
						</p>
					</div>
				</div>

				<!-- Konten Step Kamera -->
				<div class="overflow-y-auto flex-1 px-5 py-5 sm:px-6 sm:py-6 space-y-3.5">
					<!-- Info kamera -->
					<div class="group flex items-start gap-3.5 rounded-2xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/60 p-4">
						<div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20">
							<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
								<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
								<circle cx="12" cy="13" r="3"/>
							</svg>
						</div>
						<div class="min-w-0">
							<p class="text-sm font-bold text-slate-900 dark:text-white">Kamera Wajah (Selfie)</p>
							<p class="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
								Foto selfie real-time digunakan sebagai bukti kehadiran Anda yang terpercaya. Foto disimpan terenkripsi dan hanya bisa diakses oleh panitia MPLS.
							</p>
						</div>
					</div>

					<!-- Panduan cara mengizinkan -->
					<div class="rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 p-4 space-y-2.5">
						<p class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Cara Mengizinkan</p>
						<div class="flex items-start gap-2.5">
							<span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white mt-0.5">1</span>
							<p class="text-xs text-slate-600 dark:text-slate-300">Klik tombol <span class="font-semibold text-blue-600 dark:text-blue-400">"Izinkan Kamera"</span> di bawah</p>
						</div>
						<div class="flex items-start gap-2.5">
							<span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white mt-0.5">2</span>
							<p class="text-xs text-slate-600 dark:text-slate-300">Pop-up browser akan muncul — pilih <span class="font-semibold">"Izinkan"</span> atau <span class="font-semibold">"Allow"</span></p>
						</div>
						<div class="flex items-start gap-2.5">
							<span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white mt-0.5">3</span>
							<p class="text-xs text-slate-600 dark:text-slate-300">Setelah kamera diizinkan, lanjut ke langkah berikutnya</p>
						</div>
					</div>

					<!-- Privasi -->
					<div class="flex items-center gap-3 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/30 dark:border-emerald-800/60 p-3.5">
						<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
							<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
								<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
							</svg>
						</div>
						<p class="text-xs text-emerald-800 dark:text-emerald-300 font-semibold leading-snug">
							Kamera hanya aktif saat pengambilan foto, tidak direkam terus-menerus.
						</p>
					</div>

					<!-- Error -->
					{#if errorMsg}
						<div class="flex items-start gap-3 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-800/70 p-4">
							<svg class="h-5 w-5 shrink-0 text-red-500 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
								<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
							</svg>
							<p class="text-xs text-red-700 dark:text-red-300 font-medium leading-relaxed">{errorMsg}</p>
						</div>
					{/if}
				</div>

				<!-- CTA Kamera -->
				<div class="px-5 pb-6 pt-3 sm:px-6 sm:pb-6 border-t border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 shrink-0">
					<button
						type="button"
						onclick={handleGrantCamera}
						disabled={isRequesting}
						class="w-full rounded-2xl py-4 text-sm font-bold text-white transition-all duration-200 flex items-center justify-center gap-2.5 shadow-lg
						bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 shadow-blue-600/35 hover:shadow-blue-600/50 hover:scale-[1.01] active:scale-[0.99]
						disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
					>
						{#if isRequesting}
							<span class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
							<span>Menunggu Pop-up Browser...</span>
						{:else}
							<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
								<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
								<circle cx="12" cy="13" r="3"/>
							</svg>
							<span>Izinkan Akses Kamera</span>
						{/if}
					</button>
					<p class="mt-3 text-center text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
						Setelah kamera diizinkan, Anda akan diminta mengizinkan GPS lokasi.
					</p>
				</div>

			<!-- ============================== -->
			<!-- STEP 2: LOKASI GPS -->
			<!-- ============================== -->
			{:else if currentStep === 'location'}
				<!-- Header Gradient Amber/Oranye — tegas & perhatian -->
				<div
					class="relative bg-gradient-to-br from-[#92400E] via-[#D97706] to-[#F59E0B] px-6 pt-7 pb-8 text-white overflow-hidden shrink-0"
				>
					<div class="absolute -top-10 -right-10 h-36 w-36 rounded-full bg-white/10 blur-xl pointer-events-none"></div>
					<div class="absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-amber-300/15 blur-lg pointer-events-none"></div>

					<div class="relative z-10">
						<div class="flex items-center gap-3 mb-4">
							<!-- Ikon GPS besar -->
							<div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 shadow-inner">
								<svg class="h-7 w-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
									<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
									<circle cx="12" cy="10" r="3"/>
								</svg>
							</div>
							<!-- Centang kamera berhasil -->
							<div class="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 border border-white/25">
								<svg class="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
									<polyline points="20 6 9 17 4 12"/>
								</svg>
							</div>
							<!-- Step indicator -->
							<div class="ml-auto flex items-center gap-2">
								<div class="flex items-center gap-1.5">
									<span class="h-2 w-2 rounded-full bg-white/40"></span>
									<span class="h-2 w-2 rounded-full bg-white shadow-sm"></span>
								</div>
								<span class="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-md px-3 py-1 text-[11px] font-bold tracking-wide uppercase border border-white/25">
									<span class="h-1.5 w-1.5 rounded-full bg-amber-200 animate-pulse"></span>
									Langkah 2 / 2
								</span>
							</div>
						</div>

						<h2 class="text-xl sm:text-2xl font-extrabold tracking-tight leading-snug">
							Izin Akses Lokasi GPS
						</h2>
						<p class="mt-1.5 text-xs sm:text-sm text-amber-100/90 leading-relaxed max-w-sm">
							Lokasi GPS digunakan untuk memverifikasi bahwa Anda benar-benar berada di area SMAN 2 Jonggol.
						</p>
					</div>
				</div>

				<!-- Konten Step Lokasi -->
				<div class="overflow-y-auto flex-1 px-5 py-5 sm:px-6 sm:py-6 space-y-3.5">

					<!-- ⚠️ BANNER PERHATIAN PRESISI GPS — menonjol -->
					<div class="rounded-2xl border-2 border-amber-400/80 dark:border-amber-600/70 bg-amber-50 dark:bg-amber-950/40 p-4">
						<div class="flex items-center gap-2.5 mb-2.5">
							<div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/30 dark:bg-amber-700/40 text-amber-700 dark:text-amber-300">
								<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
									<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
									<line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
								</svg>
							</div>
							<p class="text-sm font-extrabold text-amber-800 dark:text-amber-300 tracking-tight">
								Perhatian: Lokasi Harus Presisi!
							</p>
						</div>
						<ul class="space-y-1.5 pl-1">
							<li class="flex items-start gap-2">
								<span class="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"></span>
								<p class="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
									Pilih <span class="font-bold">"Izinkan selalu"</span> atau <span class="font-bold">"Precise location"</span> — bukan perkiraan.
								</p>
							</li>
							<li class="flex items-start gap-2">
								<span class="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"></span>
								<p class="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
									Jika Anda menggunakan iPhone, pastikan GPS diatur ke <span class="font-bold">"Saat Menggunakan Aplikasi"</span> dengan akurasi penuh.
								</p>
							</li>
							<li class="flex items-start gap-2">
								<span class="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"></span>
								<p class="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
									Matikan VPN & lokasi palsu. Sistem akan mendeteksi koordinat manipulasi dan otomatis menolak presensi.
								</p>
							</li>
						</ul>
					</div>

					<!-- Info lokasi -->
					<div class="group flex items-start gap-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 p-4">
						<div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20">
							<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
								<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
								<circle cx="12" cy="10" r="3"/>
							</svg>
						</div>
						<div class="min-w-0">
							<p class="text-sm font-bold text-slate-900 dark:text-white">Verifikasi Geofencing GPS</p>
							<p class="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
								Sistem secara otomatis mengukur jarak Anda dari titik pusat SMAN 2 Jonggol. Presensi hanya diterima jika Anda berada dalam radius yang ditentukan.
							</p>
						</div>
					</div>

					<!-- Tips lanjutan: sinyal GPS bagus -->
					<div class="flex items-start gap-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/50 p-3.5">
						<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400">
							<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M3 3l4.5 4.5M7.5 7.5L12 12M12 12l4.5-4.5M12 12l4.5 4.5"/>
								<circle cx="12" cy="12" r="9"/>
							</svg>
						</div>
						<p class="text-xs text-blue-800 dark:text-blue-300 font-medium leading-snug">
							<span class="font-bold">Tips:</span> Untuk sinyal GPS terbaik, pastikan Anda berada di area terbuka, bukan di dalam gedung tertutup saat memulai absensi.
						</p>
					</div>

					<!-- Error -->
					{#if errorMsg}
						<div class="flex items-start gap-3 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-800/70 p-4">
							<svg class="h-5 w-5 shrink-0 text-red-500 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
								<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
							</svg>
							<p class="text-xs text-red-700 dark:text-red-300 font-medium leading-relaxed">{errorMsg}</p>
						</div>
					{/if}
				</div>

				<!-- CTA Lokasi -->
				<div class="px-5 pb-6 pt-3 sm:px-6 sm:pb-6 border-t border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 shrink-0 space-y-3">
					<button
						type="button"
						onclick={handleGrantLocation}
						disabled={isRequesting || isDone}
						class="w-full rounded-2xl py-4 text-sm font-bold text-white transition-all duration-200 flex items-center justify-center gap-2.5 shadow-lg
						{isDone
							? 'bg-emerald-600 shadow-emerald-600/30'
							: 'bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 shadow-amber-500/35 hover:shadow-amber-500/50 hover:scale-[1.01] active:scale-[0.99]'}
						disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
					>
						{#if isRequesting}
							<span class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
							<span>Mendeteksi Lokasi GPS...</span>
						{:else if isDone}
							<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
								<polyline points="20 6 9 17 4 12"/>
							</svg>
							<span>Semua Izin Diberikan! Memuat...</span>
						{:else}
							<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
								<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
								<circle cx="12" cy="10" r="3"/>
							</svg>
							<span>Izinkan Akses Lokasi GPS</span>
						{/if}
					</button>

					<p class="text-center text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
						Pada kunjungan berikutnya, izin akan diingat dan sistem terbuka otomatis.
					</p>
				</div>
			{/if}
		</div>
	</div>
{/if}
