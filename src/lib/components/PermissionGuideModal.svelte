<script lang="ts">
	let {
		onPermissionGranted = () => {}
	}: {
		onPermissionGranted: () => void;
	} = $props();

	let isOpen = $state(true);
	let isRequesting = $state(false);
	let errorMsg = $state<string | null>(null);
	let step = $state<'guide' | 'requesting' | 'done'>('guide');

	async function handleGrantPermissions() {
		isRequesting = true;
		errorMsg = null;
		step = 'requesting';

		const results = { camera: false, location: false };

		// 1. Minta izin kamera
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
			stream.getTracks().forEach((t) => t.stop()); // Langsung hentikan — hanya untuk minta izin
			results.camera = true;
		} catch (err: any) {
			if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
				errorMsg = 'Izin kamera ditolak. Ketuk ikon kunci di bilah alamat browser, lalu aktifkan izin kamera dan muat ulang halaman.';
				isRequesting = false;
				step = 'guide';
				return;
			}
			// Jika kamera tidak ada (jarang), tetap lanjut ke lokasi
			results.camera = false;
		}

		// 2. Minta izin lokasi
		await new Promise<void>((resolve) => {
			navigator.geolocation.getCurrentPosition(
				() => {
					results.location = true;
					resolve();
				},
				(err) => {
					results.location = false;
					resolve();
				},
				{ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
			);
		});

		if (!results.location) {
			errorMsg = 'Izin lokasi ditolak. Ketuk ikon kunci di bilah alamat browser, lalu aktifkan izin lokasi dan muat ulang halaman.';
			isRequesting = false;
			step = 'guide';
			return;
		}

		// Semua izin diberikan
		step = 'done';
		isRequesting = false;

		// Delay singkat agar user melihat state "Siap!" sebelum modal tertutup
		await new Promise((r) => setTimeout(r, 800));
		isOpen = false;
		onPermissionGranted();
	}
</script>

{#if isOpen}
	<!-- Backdrop -->
	<div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">

		<!-- Modal Card — slide up dari bawah di mobile -->
		<div class="w-full max-w-md rounded-t-[28px] sm:rounded-[28px] border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden animate-drawer-in">

			<!-- Header Visual -->
			<div class="relative bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] px-6 pt-8 pb-10 text-white overflow-hidden">
				<!-- Dekorasi lingkaran background -->
				<div class="absolute -top-6 -right-6 h-32 w-32 rounded-full bg-white/10 pointer-events-none"></div>
				<div class="absolute -bottom-8 -left-4 h-24 w-24 rounded-full bg-white/5 pointer-events-none"></div>

				<div class="relative">
					<div class="flex gap-3 mb-4">
						<!-- Ikon Kamera -->
						<div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
							<svg class="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
								<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
								<circle cx="12" cy="13" r="3"/>
							</svg>
						</div>
						<!-- Ikon GPS -->
						<div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
							<svg class="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
								<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
								<circle cx="12" cy="10" r="3"/>
							</svg>
						</div>
					</div>

					<h2 class="font-heading text-xl font-bold leading-snug">
						Izinkan Akses untuk<br/>Melanjutkan Presensi
					</h2>
					<p class="mt-2 text-sm text-blue-100 leading-relaxed">
						NAWA-ABSEN membutuhkan dua izin perangkat untuk memverifikasi kehadiran Anda secara akurat.
					</p>
				</div>
			</div>

			<!-- Konten Panduan -->
			<div class="px-6 py-6 space-y-4">

				<!-- Panduan Item 1: Kamera -->
				<div class="flex items-start gap-4 rounded-2xl bg-[#F8FAFC] dark:bg-slate-800/60 border border-[#E5E7EB] dark:border-slate-700 p-4">
					<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] dark:bg-blue-950 text-[#2563EB]">
						<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
							<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
							<circle cx="12" cy="13" r="3"/>
						</svg>
					</div>
					<div class="min-w-0">
						<p class="text-sm font-bold text-[#0F172A] dark:text-white">Akses Kamera</p>
						<p class="mt-0.5 text-xs text-[#64748B] dark:text-slate-400 leading-relaxed">
							Digunakan untuk mengambil foto selfie sebagai bukti kehadiran. Foto disimpan di server sekolah dan tidak dikirim ke pihak manapun.
						</p>
					</div>
				</div>

				<!-- Panduan Item 2: Lokasi -->
				<div class="flex items-start gap-4 rounded-2xl bg-[#F8FAFC] dark:bg-slate-800/60 border border-[#E5E7EB] dark:border-slate-700 p-4">
					<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] dark:bg-blue-950 text-[#2563EB]">
						<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
							<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
							<circle cx="12" cy="10" r="3"/>
						</svg>
					</div>
					<div class="min-w-0">
						<p class="text-sm font-bold text-[#0F172A] dark:text-white">Akses Lokasi GPS</p>
						<p class="mt-0.5 text-xs text-[#64748B] dark:text-slate-400 leading-relaxed">
							Digunakan untuk memastikan Anda berada di area SMAN 2 Jonggol. Data koordinat hanya digunakan saat proses presensi berlangsung.
						</p>
					</div>
				</div>

				<!-- Info keamanan -->
				<div class="flex items-center gap-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-3.5 py-2.5">
					<svg class="h-4 w-4 shrink-0 text-[#10B981]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
						<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
					</svg>
					<p class="text-[11px] text-[#10B981] font-semibold">
						Data Anda aman. Tidak ada informasi yang dibagikan ke pihak ketiga.
					</p>
				</div>

				<!-- Error message -->
				{#if errorMsg}
					<div class="flex items-start gap-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 px-3.5 py-3">
						<svg class="h-4 w-4 shrink-0 text-[#EF4444] mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
							<circle cx="12" cy="12" r="10"/>
							<line x1="12" y1="8" x2="12" y2="12"/>
							<line x1="12" y1="16" x2="12.01" y2="16"/>
						</svg>
						<p class="text-[11px] text-[#EF4444] font-medium leading-relaxed">{errorMsg}</p>
					</div>
				{/if}

				<!-- CTA Button -->
				<button
					type="button"
					onclick={handleGrantPermissions}
					disabled={isRequesting || step === 'done'}
					class="w-full rounded-[18px] py-4 text-sm font-bold text-white transition-all min-h-[52px] flex items-center justify-center gap-2.5 shadow-lg
						{step === 'done'
							? 'bg-[#10B981] shadow-emerald-500/30 scale-[0.99]'
							: 'bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] shadow-blue-600/30 hover:scale-[1.01] active:scale-[0.99]'}
						disabled:opacity-70 disabled:cursor-not-allowed"
				>
					{#if step === 'requesting'}
						<span class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
						<span>Memproses Izin...</span>
					{:else if step === 'done'}
						<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
							<polyline points="20 6 9 17 4 12"/>
						</svg>
						<span>Izin Diberikan! Memuat...</span>
					{:else}
						<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
							<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
						</svg>
						<span>Saya Mengerti, Lanjutkan Presensi</span>
					{/if}
				</button>

				<p class="text-center text-[10px] text-[#64748B] dark:text-slate-500 leading-relaxed">
					Dengan melanjutkan, Anda menyetujui penggunaan data kamera dan lokasi<br/>
					semata-mata untuk keperluan presensi MPLS 2026 SMAN 2 Jonggol.
				</p>
			</div>
		</div>
	</div>
{/if}
