<script lang="ts">
	import { onMount } from 'svelte';
	import AdminAttendanceMap from '$lib/components/AdminAttendanceMap.svelte';

	interface AbsensiRecord {
		id: number;
		nama: string;
		gugus_id: number;
		nama_gugus?: string;
		foto_url?: string | null;
		foto_base64?: string | null;
		latitude: number;
		longitude: number;
		jarak_meter: number;
		accuracy_meter: number;
		status: string;
		keterangan?: string;
		tanggal: string;
		device_info?: string;
		created_at: string;
	}

	interface GugusItem {
		id: number;
		nama_gugus: string;
		ruangan: string;
	}

	// Auth state
	let isAuthenticated = $state(false);
	let passwordInput = $state('');
	let loginError = $state<string | null>(null);
	let isLoggingIn = $state(false);

	// Data states
	let records = $state<AbsensiRecord[]>([]);
	let gugusList = $state<GugusItem[]>([]);
	let stats = $state<{
		totalSemua: number;
		totalValid: number;
		totalDitolak: number;
		perGugus: Record<string, { total: number; valid: number; ditolak: number }>;
		perJam: Record<string, number>;
	}>({
		totalSemua: 0,
		totalValid: 0,
		totalDitolak: 0,
		perGugus: {},
		perJam: {}
	});

	// Filter states
	let searchQuery = $state('');
	let filterGugus = $state('all');
	let filterTanggal = $state('all');
	let filterStatus = $state('all');

	// Geofence Config modal & state
	let { data } = $props();
	let isGeoModalOpen = $state(false);
	let schoolLat = $state(-6.470206);
	let schoolLng = $state(107.074081);
	let schoolRadius = $state(70);
	let isUpdatingGeo = $state(false);
	let geoUpdateMsg = $state<string | null>(null);

	$effect(() => {
		if (data?.schoolConfig) {
			schoolLat = data.schoolConfig.latitude;
			schoolLng = data.schoolConfig.longitude;
			schoolRadius = data.schoolConfig.radius_meter;
		}
	});

	// Modal preview foto & detail
	let previewModalRecord = $state<AbsensiRecord | null>(null);

	let filteredRecords = $derived(
		records.filter((r) => {
			if (!searchQuery.trim()) return true;
			return r.nama.toLowerCase().includes(searchQuery.trim().toLowerCase());
		})
	);

	async function handleLogin(e: Event) {
		e.preventDefault();
		isLoggingIn = true;
		loginError = null;
		try {
			const res = await fetch('/api/admin/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ password: passwordInput })
			});
			const json = await res.json();
			if (res.ok && json.success) {
				isAuthenticated = true;
				passwordInput = '';
				loadAllData();
			} else {
				loginError = json.message || 'Otentikasi gagal. Silakan periksa password Anda.';
			}
		} catch (e) {
			loginError = 'Gagal terhubung ke server. Periksa jaringan Anda.';
		} finally {
			isLoggingIn = false;
		}
	}

	function handleLogout() {
		isAuthenticated = false;
		records = [];
	}

	async function loadAllData() {
		try {
			const [gugusRes, recordsRes, configRes] = await Promise.all([
				fetch('/api/gugus'),
				fetch(
					`/api/admin/records?gugusId=${filterGugus}&tanggal=${filterTanggal}&status=${filterStatus}`
				),
				fetch('/api/config')
			]);

			const gugusJson = await gugusRes.json();
			const recordsJson = await recordsRes.json();
			const configJson = await configRes.json();

			if (gugusJson.success) gugusList = gugusJson.data;
			if (recordsJson.success) {
				records = recordsJson.data.records;
				stats = recordsJson.data.stats;
			}
			if (configJson.success && configJson.data) {
				schoolLat = configJson.data.latitude;
				schoolLng = configJson.data.longitude;
				schoolRadius = configJson.data.radius_meter;
			}
		} catch (e) {
			console.error('Gagal memuat data admin:', e);
		}
	}

	function handleFilterChange() {
		loadAllData();
	}

	function handleExportCSV() {
		const url = `/api/admin/export?gugusId=${filterGugus}&tanggal=${filterTanggal}`;
		window.open(url, '_blank');
	}

	// Geofence testing tool
	function setSchoolToMyLocation() {
		isUpdatingGeo = true;
		geoUpdateMsg = 'Mendeteksi koordinat satelit perangkat saat ini...';

		navigator.geolocation.getCurrentPosition(
			async (pos) => {
				try {
					const lat = pos.coords.latitude;
					const lng = pos.coords.longitude;
					const res = await fetch('/api/config', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							latitude: lat,
							longitude: lng,
							radius_meter: schoolRadius
						})
					});
					const json = await res.json();
					if (res.ok && json.success) {
						schoolLat = lat;
						schoolLng = lng;
						geoUpdateMsg = `Sukses! Titik geofencing diperbarui ke lokasi aktif (${lat.toFixed(5)}, ${lng.toFixed(5)}).`;
					} else {
						geoUpdateMsg = json.message || 'Gagal memperbarui koordinat.';
					}
				} catch (e) {
					geoUpdateMsg = 'Kesalahan transmisi jaringan.';
				} finally {
					isUpdatingGeo = false;
				}
			},
			() => {
				isUpdatingGeo = false;
				geoUpdateMsg = 'Gagal mengakses GPS peramban. Pastikan izin lokasi diaktifkan.';
			},
			{ enableHighAccuracy: true }
		);
	}

	async function updateRadiusOnly() {
		isUpdatingGeo = true;
		geoUpdateMsg = null;
		try {
			const res = await fetch('/api/config', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					latitude: schoolLat,
					longitude: schoolLng,
					radius_meter: schoolRadius
				})
			});
			const json = await res.json();
			if (json.success) {
				geoUpdateMsg = 'Radius geofencing berhasil diperbarui!';
			}
		} finally {
			isUpdatingGeo = false;
		}
	}
</script>

<div class="min-h-screen bg-v2-gradient pb-16">
	{#if !isAuthenticated}
		<!-- LOGIN ADMIN CARD (SAAS ENTERPRISE TECH STARTUP LEVEL — ZERO ENV LEAK) -->
		<div class="flex min-h-[82vh] items-center justify-center px-4 py-12">
			<div class="w-full max-w-md rounded-[24px] border border-[#E5E7EB] dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-10 shadow-v2 transition-all">
				<div class="mb-8 text-center">
					<div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EFF6FF] dark:bg-blue-950 text-[#2563EB] dark:text-blue-400 border border-blue-200 dark:border-blue-800 shadow-sm">
						<svg class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3">
							<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
							<path d="M7 11V7a5 5 0 0 1 10 0v4"/>
						</svg>
					</div>
					<h1 class="font-heading text-2xl font-bold text-[#0F172A] dark:text-white tracking-tight">
						Admin Control Panel
					</h1>
					<p class="mt-1.5 text-xs text-[#64748B] dark:text-slate-400 font-medium">
						Portal Rekapitulasi Presensi MPLS 2026 • SMAN 2 Jonggol
					</p>
				</div>

				{#if loginError}
					<div class="mb-5 flex items-center gap-2.5 rounded-[16px] border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 p-3.5 text-xs font-semibold text-[#EF4444]">
						<svg class="h-4.5 w-4.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
							<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
						</svg>
						<span>{loginError}</span>
					</div>
				{/if}

				<form onsubmit={handleLogin} class="space-y-5">
					<div>
						<label for="password" class="block text-xs font-semibold text-[#0F172A] dark:text-white mb-2">
							Kata Sandi Keamanan Admin
						</label>
						<input
							id="password"
							type="password"
							bind:value={passwordInput}
							placeholder="Masukkan kata sandi admin..."
							required
							class="w-full rounded-[16px] border border-[#E5E7EB] dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-950 px-4 py-3.5 text-sm text-[#0F172A] dark:text-white placeholder-[#64748B] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15 transition min-h-[48px]"
						/>
					</div>

					<button
						type="submit"
						disabled={isLoggingIn}
						class="w-full rounded-[18px] bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] py-3.5 px-6 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:scale-[1.01] transition disabled:opacity-50 min-h-[50px] flex items-center justify-center gap-2"
					>
						{#if isLoggingIn}
							<span class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
							<span>Memverifikasi Akses...</span>
						{:else}
							<span>Masuk ke Dashboard</span>
						{/if}
					</button>
				</form>
			</div>
		</div>
	{:else}
		<!-- AUTHENTICATED ADMIN DASHBOARD -->
		<div class="mx-auto max-w-7xl px-4 pt-8 sm:px-6 space-y-8">
			<!-- SAAS HEADER BAR -->
			<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E7EB] dark:border-slate-800 pb-6">
				<div class="flex items-start sm:items-center gap-3">
					<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EFF6FF] dark:bg-blue-950 text-[#2563EB] dark:text-blue-400 shadow-sm">
						<svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3">
							<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
						</svg>
					</div>
					<div>
						<div class="flex items-center gap-2">
							<span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 px-2.5 py-0.5 text-[10px] font-bold text-[#10B981] border border-emerald-300 dark:border-emerald-800">
								<span class="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-pulse"></span>
								LIVE STREAM
							</span>
							<h1 class="font-heading text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white">
								Dashboard Presensi MPLS 2026
							</h1>
						</div>
						<p class="text-xs text-[#64748B] dark:text-slate-400 mt-1">
							Pantau verifikasi foto wajah, keakuratan satelit GPS, dan rekapitulasi kehadiran peserta real-time.
						</p>
					</div>
				</div>

				<div class="flex flex-wrap items-center gap-2.5">
					<button
						type="button"
						onclick={() => (isGeoModalOpen = true)}
						class="inline-flex items-center gap-1.5 rounded-[16px] border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs font-semibold text-[#0F172A] dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm"
					>
						<svg class="h-4 w-4 text-[#2563EB]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
							<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
						</svg>
						<span>Pengaturan Geofence</span>
					</button>

					<button
						type="button"
						onclick={loadAllData}
						class="inline-flex items-center gap-1.5 rounded-[16px] border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs font-semibold text-[#0F172A] dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm"
					>
						<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
							<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
						</svg>
						<span>Refresh</span>
					</button>

					<button
						type="button"
						onclick={handleExportCSV}
						class="inline-flex items-center gap-1.5 rounded-[16px] bg-[#10B981] hover:bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white transition shadow-md shadow-emerald-600/25"
					>
						<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
							<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
						</svg>
						<span>Unduh Laporan (CSV)</span>
					</button>

					<button
						type="button"
						onclick={handleLogout}
						class="inline-flex items-center gap-1 rounded-[16px] border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/30 px-3.5 py-2.5 text-xs font-semibold text-[#EF4444] hover:bg-red-100 transition"
					>
						<span>Keluar</span>
					</button>
				</div>
			</div>

			<!-- FILTER HARI PELAKSANAAN MPLS (5 HARI) — PILL SWITCHER -->
			<div class="rounded-[24px] border border-[#E5E7EB] dark:border-slate-800 bg-white dark:bg-slate-900 p-3 sm:p-4 shadow-v2">
				<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
					<div class="flex items-center gap-2">
						<div class="flex h-8 w-8 items-center justify-center rounded-xl bg-[#EFF6FF] dark:bg-blue-950 text-[#2563EB]">
							<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
								<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
							</svg>
						</div>
						<div>
							<p class="font-heading text-xs sm:text-sm font-bold text-[#0F172A] dark:text-white">
								Sortir Berdasarkan Hari MPLS (5 Hari)
							</p>
							<p class="text-[11px] text-[#64748B]">
								Filter KPI, Peta, Grafik, dan Tabel Absensi sesuai jadwal hari
							</p>
						</div>
					</div>

					<div class="flex flex-wrap items-center gap-1.5">
						{#each [
							{ id: 'all', label: 'Semua Hari' },
							{ id: '2026-07-15', label: 'Hari ke-1 (15 Jul)' },
							{ id: '2026-07-16', label: 'Hari ke-2 (16 Jul)' },
							{ id: '2026-07-17', label: 'Hari ke-3 (17 Jul)' },
							{ id: '2026-07-20', label: 'Hari ke-4 (20 Jul)' },
							{ id: '2026-07-21', label: 'Hari ke-5 (21 Jul)' }
						] as hari}
							<button
								type="button"
								onclick={() => { filterTanggal = hari.id; handleFilterChange(); }}
								class="rounded-[14px] px-3.5 py-2 text-xs font-bold transition-all {filterTanggal === hari.id
									? 'bg-[#2563EB] text-white shadow-md shadow-blue-600/30 scale-[1.02]'
									: 'bg-[#F8FAFC] dark:bg-slate-800/70 text-[#64748B] dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800'}"
							>
								{hari.label}
							</button>
						{/each}
					</div>
				</div>
			</div>

			<!-- 3 KPI SUMMARY CARDS -->
			<div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
				<!-- KPI Card 1: Total -->
				<div class="rounded-[24px] border border-[#E5E7EB] dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-v2 card-hover">
					<div class="flex items-center justify-between">
						<span class="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
							TOTAL PRESENSI MASUK
						</span>
						<div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EFF6FF] dark:bg-blue-950 text-[#2563EB]">
							<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3">
								<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
							</svg>
						</div>
					</div>
					<div class="mt-3 font-heading text-3xl font-bold text-[#0F172A] dark:text-white">
						{stats.totalSemua} <span class="text-xs font-medium text-[#64748B]">Siswa</span>
					</div>
				</div>

				<!-- KPI Card 2: Valid -->
				<div class="rounded-[24px] border border-emerald-200 dark:border-emerald-900/60 bg-white dark:bg-slate-900 p-6 shadow-v2 card-hover">
					<div class="flex items-center justify-between">
						<span class="text-xs font-semibold uppercase tracking-wider text-[#10B981]">
							KEHADIRAN VALID (DALAM RADIUS)
						</span>
						<div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-[#10B981]">
							<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
								<polyline points="20 6 9 17 4 12"/>
							</svg>
						</div>
					</div>
					<div class="mt-3 font-heading text-3xl font-bold text-[#10B981]">
						{stats.totalValid} <span class="text-xs font-medium text-[#64748B]">Terverifikasi</span>
					</div>
				</div>

				<!-- KPI Card 3: Ditolak -->
				<div class="rounded-[24px] border border-red-200 dark:border-red-900/60 bg-white dark:bg-slate-900 p-6 shadow-v2 card-hover">
					<div class="flex items-center justify-between">
						<span class="text-xs font-semibold uppercase tracking-wider text-[#EF4444]">
							DITOLAK / LUAR RADIUS
						</span>
						<div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950 text-[#EF4444]">
							<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
								<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
							</svg>
						</div>
					</div>
					<div class="mt-3 font-heading text-3xl font-bold text-[#EF4444]">
						{stats.totalDitolak} <span class="text-xs font-medium text-[#64748B]">Ditolak</span>
					</div>
				</div>
			</div>

			<!-- PETA SUNGGUHAN INTERAKTIF DENGAN KODE WARNA GUGUS 1 - 8 -->
			<AdminAttendanceMap
				records={records}
				schoolLat={schoolLat}
				schoolLng={schoolLng}
				schoolRadius={schoolRadius}
				onSelectRecord={(rec) => (previewModalRecord = rec)}
			/>

			<!-- CHARTS & GUGUS DISTRIBUTION -->
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<!-- Gugus Distribution -->
				<div class="rounded-[24px] border border-[#E5E7EB] dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-v2">
					<h3 class="font-heading text-base font-bold text-[#0F172A] dark:text-white mb-4">
						Rekap Kehadiran per Gugus
					</h3>
					<div class="space-y-3 max-h-64 overflow-y-auto pr-1">
						{#each Object.entries(stats.perGugus) as [namaGugus, info]}
							<div class="flex items-center justify-between rounded-[18px] bg-[#F8FAFC] dark:bg-slate-950 p-3.5 border border-[#E5E7EB] dark:border-slate-800">
								<div>
									<p class="text-xs font-bold text-[#0F172A] dark:text-white">{namaGugus}</p>
									<p class="text-[11px] text-[#64748B]">
										Valid: <span class="text-[#10B981] font-semibold">{info.valid}</span> • Ditolak: <span class="text-[#EF4444] font-semibold">{info.ditolak}</span>
									</p>
								</div>
								<span class="rounded-full bg-[#EFF6FF] dark:bg-blue-950 px-3 py-1 text-xs font-bold text-[#2563EB] dark:text-blue-300">
									{info.total} Hadir
								</span>
							</div>
						{/each}
						{#if Object.keys(stats.perGugus).length === 0}
							<p class="text-xs text-[#64748B] text-center py-8">Belum ada absensi tercatat</p>
						{/if}
					</div>
				</div>

				<!-- Waktu Kedatangan Bar Chart -->
				<div class="rounded-[24px] border border-[#E5E7EB] dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-v2">
					<h3 class="font-heading text-base font-bold text-[#0F172A] dark:text-white mb-4">
						Grafik Kedatangan Siswa (Per Jam)
					</h3>
					<div class="flex items-end justify-between gap-2 h-52 pt-4 pb-2 border-b border-[#E5E7EB] dark:border-slate-800">
						{#each Object.entries(stats.perJam) as [jam, count]}
							<div class="flex flex-col items-center flex-1">
								<span class="text-[11px] font-bold text-[#0F172A] dark:text-white mb-1.5">{count > 0 ? count : ''}</span>
								<div
									class="w-full max-w-[32px] rounded-t-lg bg-gradient-to-t from-[#2563EB] to-[#60A5FA] transition-all duration-300"
									style="height: {Math.max((count / Math.max(1, ...Object.values(stats.perJam))) * 140, 6)}px;"
								></div>
								<span class="mt-2.5 text-[10px] font-semibold text-[#64748B]">{jam}</span>
							</div>
						{/each}
						{#if Object.keys(stats.perJam).length === 0}
							<p class="w-full text-center text-xs text-[#64748B] self-center">Belum ada aktivitas presensi hari ini</p>
						{/if}
					</div>
				</div>
			</div>

			<!-- DATA TABLE SECTION -->
			<div class="rounded-[24px] border border-[#E5E7EB] dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-v2 space-y-4">
				<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
					<div>
						<h3 class="font-heading text-lg font-bold text-[#0F172A] dark:text-white">
							Daftar Presensi Peserta
						</h3>
						<p class="text-xs text-[#64748B]">Menampilkan {filteredRecords.length} catatan kehadiran</p>
					</div>

					<div class="flex flex-wrap items-center gap-2.5">
						<!-- Search input -->
						<div class="relative">
							<input
								type="text"
								bind:value={searchQuery}
								placeholder="Cari nama peserta..."
								class="rounded-[16px] border border-[#E5E7EB] dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-950 pl-9 pr-4 py-2 text-xs text-[#0F172A] dark:text-white placeholder-[#64748B] focus:border-[#2563EB] focus:outline-none min-w-[200px]"
							/>
							<svg class="absolute left-3 top-2.5 h-4 w-4 text-[#64748B]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
							</svg>
						</div>

						<!-- Filter Gugus -->
						<select
							bind:value={filterGugus}
							onchange={handleFilterChange}
							class="rounded-[16px] border border-[#E5E7EB] dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-950 px-3.5 py-2 text-xs font-semibold text-[#0F172A] dark:text-white focus:outline-none"
						>
							<option value="all">Semua Gugus</option>
							{#each gugusList as g}
								<option value={g.id}>{g.nama_gugus}</option>
							{/each}
						</select>

						<!-- Filter Hari / Tanggal -->
						<select
							bind:value={filterTanggal}
							onchange={handleFilterChange}
							class="rounded-[16px] border border-[#E5E7EB] dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-950 px-3.5 py-2 text-xs font-semibold text-[#0F172A] dark:text-white focus:outline-none"
						>
							<option value="all">Semua Hari</option>
							<option value="2026-07-15">Hari ke-1 (15 Jul 2026)</option>
							<option value="2026-07-16">Hari ke-2 (16 Jul 2026)</option>
							<option value="2026-07-17">Hari ke-3 (17 Jul 2026)</option>
							<option value="2026-07-20">Hari ke-4 (20 Jul 2026)</option>
							<option value="2026-07-21">Hari ke-5 (21 Jul 2026)</option>
						</select>

						<!-- Filter Status -->
						<select
							bind:value={filterStatus}
							onchange={handleFilterChange}
							class="rounded-[16px] border border-[#E5E7EB] dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-950 px-3.5 py-2 text-xs font-semibold text-[#0F172A] dark:text-white focus:outline-none"
						>
							<option value="all">Semua Status</option>
							<option value="valid">Valid (Dalam Radius)</option>
							<option value="ditolak_radius">Ditolak Radius</option>
						</select>
					</div>
				</div>

				<div class="overflow-x-auto">
					<table class="w-full border-collapse text-left text-xs">
						<thead>
							<tr class="border-b border-[#E5E7EB] dark:border-slate-800 text-[#64748B] uppercase tracking-wider font-semibold">
								<th class="py-3.5 px-3">Foto</th>
								<th class="py-3.5 px-3">Nama Lengkap</th>
								<th class="py-3.5 px-3">Gugus</th>
								<th class="py-3.5 px-3">Waktu</th>
								<th class="py-3.5 px-3">Jarak Satelit</th>
								<th class="py-3.5 px-3">Status</th>
								<th class="py-3.5 px-3 text-right">Aksi</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-[#E5E7EB]/60 dark:divide-slate-800/60">
							{#each filteredRecords as row (row.id)}
								<tr class="hover:bg-[#F8FAFC] dark:hover:bg-slate-800/40 transition">
									<td class="py-3 px-3">
										{#if row.foto_url || row.foto_base64}
											<button
												type="button"
												onclick={() => (previewModalRecord = row)}
												class="block h-11 w-11 overflow-hidden rounded-xl border border-[#E5E7EB] dark:border-slate-700 hover:scale-105 transition shadow-sm"
											>
												<img
													src={row.foto_url || row.foto_base64}
													alt={row.nama}
													class="h-full w-full object-cover"
												/>
											</button>
										{:else}
											<span class="text-[#64748B]">-</span>
										{/if}
									</td>

									<td class="py-3 px-3 font-bold text-[#0F172A] dark:text-white">
										{row.nama}
									</td>

									<td class="py-3 px-3">
										<span class="inline-flex rounded-full bg-[#EFF6FF] dark:bg-blue-950 px-2.5 py-1 text-[11px] font-semibold text-[#2563EB] dark:text-blue-300">
											{row.nama_gugus || `Gugus ${row.gugus_id}`}
										</span>
									</td>

									<td class="py-3 px-3 text-[#64748B]">
										{new Date(row.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
									</td>

									<td class="py-3 px-3">
										<span class="font-bold {row.jarak_meter <= schoolRadius ? 'text-[#10B981]' : 'text-[#EF4444]'}">
											{row.jarak_meter}m
										</span>
										<span class="text-[10px] text-[#64748B] block">
											acc: ±{row.accuracy_meter}m
										</span>
									</td>

									<td class="py-3 px-3">
										<span
											class="inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide {row.status === 'valid' ? 'bg-emerald-100 dark:bg-emerald-950 text-[#10B981]' : 'bg-red-100 dark:bg-red-950 text-[#EF4444]'}"
										>
											{row.status}
										</span>
									</td>

									<td class="py-3 px-3 text-right">
										<button
											type="button"
											onclick={() => (previewModalRecord = row)}
											class="rounded-[14px] border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-[#0F172A] dark:text-white hover:bg-[#F8FAFC] transition shadow-sm"
										>
											Detail
										</button>
									</td>
								</tr>
							{/each}

							{#if filteredRecords.length === 0}
								<tr>
									<td colspan="7" class="py-12 text-center text-xs text-[#64748B]">
										Tidak ada catatan presensi yang sesuai kriteria pencarian/filter.
									</td>
								</tr>
							{/if}
						</tbody>
					</table>
				</div>
			</div>
		</div>

		<!-- MODAL PENGATURAN GEOFENCING SEKOLAH -->
		{#if isGeoModalOpen}
			<div
				role="presentation"
				class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
				onclick={(e) => {
					if (e.target === e.currentTarget) isGeoModalOpen = false;
				}}
			>
				<div class="w-full max-w-lg rounded-[24px] border border-[#E5E7EB] dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-2xl">
					<div class="flex items-center justify-between border-b border-[#E5E7EB] dark:border-slate-800 pb-4">
						<div>
							<h3 class="font-heading text-lg font-bold text-[#0F172A] dark:text-white">
								Pengaturan Geofencing Sekolah
							</h3>
							<p class="text-xs text-[#64748B]">Atur titik koordinat dan radius batas presensi</p>
						</div>
						<button
							type="button"
							onclick={() => (isGeoModalOpen = false)}
							class="rounded-lg p-2 text-[#64748B] hover:text-[#0F172A]"
						>
							✕
						</button>
					</div>

					<div class="mt-5 space-y-4">
						<div class="rounded-2xl bg-[#F8FAFC] dark:bg-slate-950 p-4 border border-[#E5E7EB] dark:border-slate-800 text-xs space-y-2">
							<div class="flex justify-between">
								<span class="text-[#64748B]">Latitude Sekolah:</span>
								<span class="font-bold text-[#0F172A] dark:text-white">{schoolLat}</span>
							</div>
							<div class="flex justify-between">
								<span class="text-[#64748B]">Longitude Sekolah:</span>
								<span class="font-bold text-[#0F172A] dark:text-white">{schoolLng}</span>
							</div>
							<div class="flex justify-between">
								<span class="text-[#64748B]">Batas Radius Aktif:</span>
								<span class="font-bold text-[#2563EB]">{schoolRadius} Meter</span>
							</div>
						</div>

						<button
							type="button"
							onclick={setSchoolToMyLocation}
							disabled={isUpdatingGeo}
							class="w-full rounded-[16px] bg-[#2563EB] py-3 text-xs font-semibold text-white hover:bg-[#1D4ED8] transition shadow-md shadow-blue-600/20 disabled:opacity-50"
						>
							📍 Kalibrasi ke Lokasi Anda Sekarang (Untuk Uji Coba)
						</button>

						{#if geoUpdateMsg}
							<div class="rounded-[14px] bg-[#EFF6FF] dark:bg-blue-950 p-3 text-xs text-[#2563EB] dark:text-blue-300 font-medium">
								{geoUpdateMsg}
							</div>
						{/if}

						<button
							type="button"
							onclick={() => (isGeoModalOpen = false)}
							class="w-full rounded-[16px] border border-[#E5E7EB] dark:border-slate-700 py-2.5 text-xs font-semibold text-[#64748B]"
						>
							Tutup Pengaturan
						</button>
					</div>
				</div>
			</div>
		{/if}

		<!-- MODAL PREVIEW FOTO DAN DETAIL RECORD -->
		{#if previewModalRecord}
			<div
				role="presentation"
				class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in"
				onclick={(e) => {
					if (e.target === e.currentTarget) previewModalRecord = null;
				}}
			>
				<div class="w-full max-w-md overflow-hidden rounded-[24px] border border-[#E5E7EB] dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl">
					<div class="flex items-center justify-between border-b border-[#E5E7EB] dark:border-slate-800 pb-3">
						<h3 class="font-heading text-base font-bold text-[#0F172A] dark:text-white">Detail Verifikasi Presensi</h3>
						<button
							type="button"
							onclick={() => (previewModalRecord = null)}
							class="rounded-lg p-1.5 text-[#64748B] hover:text-[#0F172A]"
						>
							✕
						</button>
					</div>

					<div class="mt-4 space-y-4">
						{#if previewModalRecord.foto_url || previewModalRecord.foto_base64}
							<div class="overflow-hidden rounded-2xl border border-[#E5E7EB] dark:border-slate-700 bg-[#F8FAFC]">
								<img
									src={previewModalRecord.foto_url || previewModalRecord.foto_base64}
									alt={previewModalRecord.nama}
									class="max-h-72 w-full object-cover"
								/>
							</div>
						{/if}

						<div class="space-y-2.5 text-xs rounded-2xl bg-[#F8FAFC] dark:bg-slate-950 p-4 border border-[#E5E7EB] dark:border-slate-800">
							<div class="flex justify-between">
								<span class="text-[#64748B]">Nama Lengkap:</span>
								<span class="font-bold text-[#0F172A] dark:text-white">{previewModalRecord.nama}</span>
							</div>
							<div class="flex justify-between">
								<span class="text-[#64748B]">Gugus MPLS:</span>
								<span class="font-semibold text-[#2563EB]">{previewModalRecord.nama_gugus}</span>
							</div>
							<div class="flex justify-between">
								<span class="text-[#64748B]">Jarak dari Satelit Sekolah:</span>
								<span class="font-bold text-[#10B981]">{previewModalRecord.jarak_meter} meter</span>
							</div>
							<div class="flex justify-between">
								<span class="text-[#64748B]">Akurasi Satelit GPS:</span>
								<span class="font-semibold text-[#64748B]">±{previewModalRecord.accuracy_meter} meter</span>
							</div>
							<div class="flex justify-between">
								<span class="text-[#64748B]">Perangkat / Fingerprint:</span>
								<span class="text-[#64748B]">{previewModalRecord.device_info || 'Perangkat Seluler'}</span>
							</div>
						</div>

						<button
							type="button"
							onclick={() => (previewModalRecord = null)}
							class="w-full rounded-[16px] bg-[#2563EB] py-3 text-xs font-semibold text-white hover:bg-[#1D4ED8]"
						>
							Tutup Modal
						</button>
					</div>
				</div>
			</div>
		{/if}
	{/if}
</div>
