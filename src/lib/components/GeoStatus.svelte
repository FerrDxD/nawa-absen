<script lang="ts">
	import { onDestroy } from 'svelte';

	let {
		autoStart = false,
		initialConfig = null,
		onLocationObtained = (
			lat: number,
			lng: number,
			acc: number,
			distance: number,
			integrityToken?: any
		) => {}
	}: {
		autoStart?: boolean;
		initialConfig?: any;
		onLocationObtained: (
			lat: number,
			lng: number,
			acc: number,
			distance: number,
			integrityToken?: any
		) => void;
	} = $props();

	let schoolLat = $state(-6.470206);
	let schoolLng = $state(107.074081);
	let maxRadius = $state(70);

	$effect(() => {
		if (initialConfig) {
			schoolLat = initialConfig.latitude ?? -6.470206;
			schoolLng = initialConfig.longitude ?? 107.074081;
			maxRadius = initialConfig.radius_meter ?? 70;
		}
	});

	let isLocating = $state(false);
	let locationError = $state<string | null>(null);

	let userLat = $state<number | null>(null);
	let userLng = $state<number | null>(null);
	let accuracyMeter = $state<number | null>(null);
	let distanceMeter = $state<number | null>(null);
	let locatingLabel = $state('Mendeteksi lokasi...');

	// --- Multi-sample collection untuk akurasi indoor yang lebih baik ---
	let collectedSamples = $state<GeolocationPosition[]>([]);
	let watchId: number | null = null;
	let bestSample: GeolocationPosition | null = null;
	const MAX_SAMPLES = 3;          // Kumpulkan maksimal 3 pembacaan (cepat)
	const TARGET_ACCURACY_M = 65;   // Fast-track: langsung selesai jika ≤65m (sangat akurat untuk sekolah)
	const MAX_WAIT_MS = 6000;       // Batas waktu total: 6 detik (cepat dan anti kepanikan)
	let samplingTimeout: any = null;

	function calcHaversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
		const R = 6371000;
		const toRad = (d: number) => (d * Math.PI) / 180;
		const dLat = toRad(lat2 - lat1);
		const dLon = toRad(lon2 - lon1);
		const a =
			Math.sin(dLat / 2) * Math.sin(dLat / 2) +
			Math.cos(toRad(lat1)) *
				Math.cos(toRad(lat2)) *
				Math.sin(dLon / 2) *
				Math.sin(dLon / 2);
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
		return Math.round(R * c * 10) / 10;
	}

	function analyzeGpsIntegrity(pos: GeolocationPosition): any {
		return {
			clientTimestamp: pos.timestamp,
			sysTime: Date.now(),
			delta: Math.abs(Date.now() - pos.timestamp),
			acc: pos.coords.accuracy,
			alt: pos.coords.altitude,
			speed: pos.coords.speed
		};
	}

	/** Pilih sampel terbaik: bobot rata-rata posisi dari 3 terbaik berdasarkan akurasi */
	function resolveBestPosition(samples: GeolocationPosition[]): GeolocationPosition {
		const sorted = [...samples].sort((a, b) => a.coords.accuracy - b.coords.accuracy);
		const top = sorted.slice(0, Math.min(3, sorted.length));

		// Weighted average — bobot = 1/akurasi (semakin akurat → bobot lebih besar)
		let sumW = 0;
		let sumLat = 0;
		let sumLng = 0;
		for (const s of top) {
			const w = 1 / s.coords.accuracy;
			sumW += w;
			sumLat += s.coords.latitude * w;
			sumLng += s.coords.longitude * w;
		}
		const avgLat = sumLat / sumW;
		const avgLng = sumLng / sumW;
		const bestAcc = top[0].coords.accuracy;

		// Return pseudo-position based on best sample but with averaged coords
		return {
			coords: {
				latitude: avgLat,
				longitude: avgLng,
				accuracy: bestAcc,
				altitude: top[0].coords.altitude,
				altitudeAccuracy: top[0].coords.altitudeAccuracy,
				heading: top[0].coords.heading,
				speed: top[0].coords.speed
			},
			timestamp: top[0].timestamp
		} as GeolocationPosition;
	}

	function stopWatching() {
		if (watchId !== null) {
			navigator.geolocation.clearWatch(watchId);
			watchId = null;
		}
		if (samplingTimeout) {
			clearTimeout(samplingTimeout);
			samplingTimeout = null;
		}
	}

	function commitPosition(pos: GeolocationPosition) {
		stopWatching();

		const lat = pos.coords.latitude;
		const lng = pos.coords.longitude;
		const acc = pos.coords.accuracy;
		const token = analyzeGpsIntegrity(pos);

		userLat = lat;
		userLng = lng;
		accuracyMeter = Math.round(acc * 10) / 10;

		const dist = calcHaversine(schoolLat, schoolLng, lat, lng);
		distanceMeter = dist;

		isLocating = false;
		onLocationObtained(lat, lng, acc, dist, token);
	}

	async function requestLocation() {
		stopWatching();
		isLocating = true;
		locationError = null;
		collectedSamples = [];
		bestSample = null;
		locatingLabel = 'Mencari sinyal GPS...';

		if (typeof navigator === 'undefined' || !navigator.geolocation) {
			locationError = 'Browser Anda tidak mendukung fitur geolokasi GPS.';
			isLocating = false;
			return;
		}

		// Gunakan watchPosition untuk mengumpulkan beberapa pembacaan GPS secara berurutan.
		// maximumAge: 15000 → izinkan cache GPS 15 detik terakhir agar instan setelah modal izin ditutup.
		// timeout per‑sample: 6 detik.
		watchId = navigator.geolocation.watchPosition(
			(pos) => {
				collectedSamples.push(pos);

				// Update label progres (reassuring, no panic)
				const sampleAcc = Math.round(pos.coords.accuracy);
				locatingLabel = `Sinyal GPS terdeteksi (±${sampleAcc}m)...`;

				// Tentukan sampel terbaik saat ini
				if (!bestSample || pos.coords.accuracy < bestSample.coords.accuracy) {
					bestSample = pos;
				}

				// Fast-Track: Hentikan langsung jika sampel pertama/kapanpun sudah ≤65m, ATAU sudah terkumpul MAX_SAMPLES
				const enoughSamples = collectedSamples.length >= MAX_SAMPLES;
				const goodEnough = pos.coords.accuracy <= TARGET_ACCURACY_M;
				if (enoughSamples || goodEnough) {
					const resolved = resolveBestPosition(collectedSamples);
					commitPosition(resolved);
				}
			},
			(err) => {
				// Jika ada error tapi sudah ada sampel, gunakan yang terbaik
				if (bestSample) {
					const resolved = resolveBestPosition(collectedSamples);
					commitPosition(resolved);
				} else {
					// Fallback cepat via getCurrentPosition jika watchPosition gagal langsung
					navigator.geolocation.getCurrentPosition(
						(pos) => commitPosition(pos),
						() => {
							stopWatching();
							isLocating = false;
							locationError = 'Gagal mengakses lokasi GPS. Pastikan fitur lokasi diaktifkan dan izin diberikan di browser Anda.';
						},
						{ enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
					);
				}
			},
			{
				enableHighAccuracy: true,
				timeout: 6000,
				maximumAge: 15000 // Izinkan cache 15 detik agar langsung instan setelah modal izin
			}
		);

		// Batas waktu total 6 detik: commit sampel terbaik jika sudah ada, atau coba fallback
		samplingTimeout = setTimeout(() => {
			if (isLocating) {
				if (bestSample) {
					locatingLabel = 'Menggunakan titik lokasi terbaik...';
					const resolved = resolveBestPosition(collectedSamples);
					commitPosition(resolved);
				} else {
					// Fallback cepat jika dalam 6 detik watchPosition belum mengembalikan sampel apa pun
					navigator.geolocation.getCurrentPosition(
						(pos) => commitPosition(pos),
						() => {
							stopWatching();
							isLocating = false;
							locationError = 'Sinyal GPS lemah di area tertutup. Silakan bergerak sedikit ke area terbuka/teras dan tekan Perbarui Lokasi.';
						},
						{ enableHighAccuracy: false, timeout: 4000, maximumAge: 60000 }
					);
				}
			}
		}, MAX_WAIT_MS);
	}

	// Reaktif terhadap perubahan autoStart — aktif saat izin diberikan dari modal
	$effect(() => {
		if (autoStart && !isLocating && userLat === null) {
			requestLocation();
		}
	});

	onDestroy(() => {
		stopWatching();
	});
</script>

<div class="rounded-[24px] border border-[#E5E7EB] dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-v2 card-hover">
	<div class="flex items-center justify-between mb-4">
		<div class="flex items-center gap-3">
			<div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EFF6FF] dark:bg-blue-950 text-[#2563EB] dark:text-blue-400">
				<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
					<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
					<circle cx="12" cy="10" r="3"/>
				</svg>
			</div>
			<div>
				<h3 class="font-heading text-base font-bold text-[#0F172A] dark:text-white">
					Verifikasi Lokasi GPS
				</h3>
				<p class="text-xs text-[#64748B] dark:text-slate-400">
					Radius presensi maksimal {maxRadius} meter dari sekolah
				</p>
			</div>
		</div>

		<button
			type="button"
			onclick={requestLocation}
			disabled={isLocating}
			class="rounded-[16px] border border-[#E5E7EB] dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-[#0F172A] dark:text-slate-200 hover:bg-slate-100 transition min-h-[36px] disabled:opacity-60"
		>
			{isLocating ? 'Mendeteksi...' : 'Perbarui Lokasi'}
		</button>
	</div>

	{#if isLocating}
		<div class="space-y-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 p-4 border border-[#E5E7EB] dark:border-slate-800">
			<div class="flex items-center gap-3">
				<div class="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent"></div>
				<p class="text-xs font-medium text-[#0F172A] dark:text-slate-200">{locatingLabel}</p>
			</div>
			<!-- Progress bar animasi -->
			<div class="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
				<div class="h-full rounded-full bg-[#2563EB] animate-pulse transition-all duration-500" style="width: {Math.max(40, Math.min(collectedSamples.length / MAX_SAMPLES * 100, 95))}%"></div>
			</div>
			<p class="text-[11px] text-[#64748B]">
				Sistem mendeteksi dan memverifikasi koordinat tercepat dengan presisi tinggi.
			</p>
		</div>
	{:else if userLat !== null && distanceMeter !== null}
		<div class="rounded-2xl {distanceMeter <= maxRadius ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800'} p-4 flex items-center justify-between gap-3">
			<div class="flex items-center gap-3 min-w-0">
				<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl {distanceMeter <= maxRadius ? 'bg-emerald-100 dark:bg-emerald-900 text-[#10B981]' : 'bg-rose-100 dark:bg-rose-900 text-[#EF4444]'}">
					{#if distanceMeter <= maxRadius}
						<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
							<polyline points="20 6 9 17 4 12"/>
						</svg>
					{:else}
						<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
							<circle cx="12" cy="12" r="10"/>
							<line x1="15" y1="9" x2="9" y2="15"/>
							<line x1="9" y1="9" x2="15" y2="15"/>
						</svg>
					{/if}
				</div>
				<div class="min-w-0">
					<p class="text-xs font-bold {distanceMeter <= maxRadius ? 'text-[#10B981]' : 'text-[#EF4444]'}">
						{distanceMeter <= maxRadius ? 'DALAM RADIUS RESMI SEKOLAH' : 'DI LUAR RADIUS RESMI'}
					</p>
					<p class="text-xs text-[#64748B] dark:text-slate-300 mt-0.5">
						Jarak Anda: <strong class="text-[#0F172A] dark:text-white">{distanceMeter} meter</strong> (Maks {maxRadius}m)
					</p>
				</div>
			</div>

			<div class="text-right text-xs shrink-0">
				<span class="text-[#64748B] dark:text-slate-400 block">Akurasi</span>
				<span class="font-semibold text-[#0F172A] dark:text-white">±{accuracyMeter}m</span>
			</div>
		</div>
	{:else}
		<div class="rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 p-4 text-xs text-amber-800 dark:text-amber-300">
			{locationError || 'Lokasi belum terdeteksi. Tekan tombol Perbarui Lokasi di atas.'}
		</div>
	{/if}
</div>
