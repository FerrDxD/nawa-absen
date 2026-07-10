<script lang="ts">
	import CameraCapture from '$lib/components/CameraCapture.svelte';
	import GeoStatus from '$lib/components/GeoStatus.svelte';
	import SwipeToConfirm from '$lib/components/SwipeToConfirm.svelte';
	import PermissionGuideModal from '$lib/components/PermissionGuideModal.svelte';

	let { data } = $props();

	// State Form
	let namaLengkap = $state('');
	let selectedGugusId = $state<number | ''>('');
	let gugusList = $derived(data.gugusList || []);
	let fotoBase64 = $state<string>('');
	let userLat = $state<number | null>(null);
	let userLng = $state<number | null>(null);
	let userAccuracy = $state<number | null>(null);
	let userDistance = $state<number | null>(null);
	let userGpsIntegrity = $state<any>(null);

	// UI States
	let permissionGranted = $state(false);
	let isCrossCheckOpen = $state(false);
	let isSubmitting = $state(false);
	let submitError = $state<string | null>(null);
	let successReceipt = $state<{
		id: number;
		nama: string;
		nama_gugus: string;
		waktu: string;
		jarakMeter: number;
		fotoSnapshot: string;
	} | null>(null);

	let maxRadius = $derived(data.schoolConfig?.radius_meter ?? 70);

	let isFormValid = $derived(
		namaLengkap.trim().length >= 3 &&
		selectedGugusId !== '' &&
		fotoBase64 !== '' &&
		userLat !== null &&
		userLng !== null &&
		userDistance !== null &&
		userDistance <= maxRadius
	);

	let selectedGugusName = $derived(
		gugusList.find((g: any) => g.id === selectedGugusId)?.nama_gugus || '-'
	);

	function handlePhotoTaken(base64: string) {
		fotoBase64 = base64;
		submitError = null;
	}

	function handleLocationObtained(
		lat: number,
		lng: number,
		acc: number,
		distance: number,
		integrityToken?: any
	) {
		userLat = lat;
		userLng = lng;
		userAccuracy = acc;
		userDistance = distance;
		userGpsIntegrity = integrityToken || null;
		submitError = null;
	}

	function handleOpenCrossCheck(e: Event) {
		e.preventDefault();
		if (!isFormValid || isSubmitting) return;
		isCrossCheckOpen = true;
	}

	async function handleSubmitAttendance() {
		if (!isFormValid || isSubmitting) return;

		isSubmitting = true;
		submitError = null;

		try {
			const fingerprint = {
				screen: typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : 'SSR',
				platform: typeof navigator !== 'undefined' ? navigator.platform : 'SSR',
				language: typeof navigator !== 'undefined' ? navigator.language : 'id',
				timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
			};

			const response = await fetch('/api/absensi', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					nama: namaLengkap.trim(),
					gugus_id: selectedGugusId,
					foto_base64: fotoBase64,
					latitude: userLat,
					longitude: userLng,
					accuracy_meter: userAccuracy,
					device_fingerprint: fingerprint,
					gps_integrity: userGpsIntegrity
				})
			});

			const result = await response.json();

			if (response.ok && result.success) {
				isCrossCheckOpen = false;
				successReceipt = {
					id: result.data.id,
					nama: result.data.nama,
					nama_gugus: result.data.nama_gugus,
					waktu: new Date(result.data.waktu).toLocaleTimeString('id-ID', {
						hour: '2-digit',
						minute: '2-digit'
					}) + ' WIB',
					jarakMeter: result.data.jarakMeter,
					fotoSnapshot: fotoBase64
				};
			} else {
				submitError = result.message || 'Gagal mengirim data absensi.';
				isCrossCheckOpen = false;
			}
		} catch (err: any) {
			submitError = 'Terjadi kesalahan koneksi internet. Coba periksa jaringan Anda.';
			isCrossCheckOpen = false;
		} finally {
			isSubmitting = false;
		}
	}

	function resetForm() {
		namaLengkap = '';
		selectedGugusId = '';
		fotoBase64 = '';
		successReceipt = null;
		submitError = null;
		isCrossCheckOpen = false;
	}
</script>

<div class="min-h-screen bg-v2-gradient pb-16">
	<!-- HERO SECTION (CERIA, MODERN, TRUSTWORTHY SAAS STYLE) -->
	<section class="mx-auto max-w-3xl px-4 pt-10 pb-6 text-center sm:px-6">
		<!-- 3 Ilustrasi Ikon Besar (Shield, Face Recognition, GPS) -->
		<div class="mb-5 flex items-center justify-center gap-3 sm:gap-4">
			<div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF6FF] dark:bg-blue-950 text-[#2563EB] dark:text-blue-400 shadow-sm">
				<!-- Shield Icon -->
				<svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3">
					<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
				</svg>
			</div>
			<div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2563EB] text-white shadow-md shadow-blue-500/25">
				<!-- Face Recognition Icon -->
				<svg class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3">
					<path d="M4 8V6a2 2 0 0 1 2-2h2"/><path d="M4 16v2a2 2 0 0 0 2 2h2"/><path d="M16 4h2a2 2 0 0 1 2 2v2"/><path d="M16 20h2a2 2 0 0 0 2-2v-2"/>
					<circle cx="12" cy="12" r="3"/>
				</svg>
			</div>
			<div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF6FF] dark:bg-blue-950 text-[#2563EB] dark:text-blue-400 shadow-sm">
				<!-- GPS Map Pin Icon -->
				<svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3">
					<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
				</svg>
			</div>
		</div>

		<h1 class="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-[#0F172A] dark:text-white">
			Portal Presensi MPLS 2026
		</h1>
		<p class="mt-3 text-sm sm:text-base text-[#64748B] dark:text-slate-300 max-w-xl mx-auto leading-relaxed">
			Verifikasi wajah otomatis dan lokasi GPS untuk memastikan proses presensi berlangsung aman, cepat, dan akurat.
		</p>
	</section>

	<!-- MAIN CONTENT CONTAINER (WHITE SPACE 70%, LEGA & BERNAPAS) -->
	<div id="main-attendance-form" class="mx-auto max-w-2xl px-4 sm:px-6">
		{#if successReceipt}
			<!-- SUCCESS PAGE CERIA & BERKELAS (Version 2.0 Spec) -->
			<div class="rounded-[24px] border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-900 p-8 text-center shadow-v2 card-hover">
				<div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-[#10B981] shadow-md">
					<svg class="h-9 w-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
						<polyline points="20 6 9 17 4 12"/>
					</svg>
				</div>
				<h2 class="font-heading text-2xl font-bold text-[#0F172A] dark:text-white">
					Presensi Berhasil
				</h2>
				<p class="mt-1 text-sm text-[#64748B] dark:text-slate-300">
					Selamat datang di MPLS 2026 SMAN 2 Jonggol
				</p>

				<div class="my-6 rounded-2xl bg-[#F8FAFC] dark:bg-slate-950 p-5 border border-[#E5E7EB] dark:border-slate-800 text-left space-y-3">
					<div class="flex items-center justify-between text-xs">
						<span class="text-[#64748B] dark:text-slate-400">Nama Lengkap</span>
						<span class="font-bold text-[#0F172A] dark:text-white">{successReceipt.nama}</span>
					</div>
					<div class="flex items-center justify-between text-xs">
						<span class="text-[#64748B] dark:text-slate-400">Gugus</span>
						<span class="font-bold text-[#2563EB] dark:text-blue-400">{successReceipt.nama_gugus}</span>
					</div>
					<div class="flex items-center justify-between text-xs">
						<span class="text-[#64748B] dark:text-slate-400">Jam Presensi</span>
						<span class="font-bold text-[#0F172A] dark:text-white">{successReceipt.waktu}</span>
					</div>
					<div class="flex items-center justify-between text-xs">
						<span class="text-[#64748B] dark:text-slate-400">Lokasi</span>
						<span class="font-bold text-[#10B981]">{successReceipt.jarakMeter}m dari sekolah</span>
					</div>
				</div>

				<button
					type="button"
					onclick={resetForm}
					class="w-full rounded-[18px] bg-[#2563EB] py-3.5 text-sm font-semibold text-white hover:bg-[#1D4ED8] transition shadow-md shadow-blue-600/20"
				>
					Selesai
				</button>
			</div>
		{:else}
			{#if submitError}
				<div class="mb-5 rounded-[20px] bg-red-50 dark:bg-red-950/40 border border-red-200 p-4 text-xs font-semibold text-[#EF4444]">
					{submitError}
				</div>
			{/if}

			<form onsubmit={handleOpenCrossCheck} class="space-y-6">
				<!-- CARD 1: FORM DATA DIRI (RINGKAS & LEGA) -->
				<div class="rounded-[24px] border border-[#E5E7EB] dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-v2 card-hover space-y-5">
					<div>
						<label for="namaLengkap" class="block text-xs font-semibold text-[#0F172A] dark:text-white mb-2">
							Nama Lengkap
						</label>
						<input
							id="namaLengkap"
							type="text"
							bind:value={namaLengkap}
							required
							minlength="3"
							placeholder="Masukkan nama lengkap"
							class="w-full rounded-[16px] border border-[#E5E7EB] dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-950 px-4 py-3.5 text-sm text-[#0F172A] dark:text-white placeholder-[#64748B] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15 transition min-h-[48px]"
						/>
					</div>

					<div>
						<label for="gugusSelect" class="block text-xs font-semibold text-[#0F172A] dark:text-white mb-2">
							Pilih Gugus MPLS
						</label>
						<select
							id="gugusSelect"
							bind:value={selectedGugusId}
							required
							class="w-full rounded-[16px] border border-[#E5E7EB] dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-950 px-4 py-3.5 text-sm font-medium text-[#0F172A] dark:text-white focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15 transition min-h-[48px]"
						>
							<option value="" disabled>Pilih Gugus MPLS</option>
							{#each gugusList as gugus (gugus.id)}
								<option value={gugus.id}>
									{gugus.nama_gugus}
								</option>
							{/each}
						</select>
					</div>
				</div>

				<!-- CARD 2: FACE RECOGNITION (PUSAT PERHATIAN) -->
				<CameraCapture autoStart={permissionGranted} onPhotoTaken={handlePhotoTaken} />

				<!-- CARD 3: VERIFIKASI LOKASI GPS -->
				<GeoStatus
					autoStart={permissionGranted}
					initialConfig={data.schoolConfig}
					onLocationObtained={handleLocationObtained}
				/>

				<!-- BUTTON PRIMARY SAAS STYLE: Membuka Banner Konfirmasi Cross-Check -->
				<button
					type="submit"
					disabled={!isFormValid || isSubmitting}
					class="w-full rounded-[18px] bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] py-4 px-6 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:scale-[1.01] disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed min-h-[52px] flex items-center justify-center gap-2"
				>
					<span>Lanjut Konfirmasi Presensi</span>
					<svg class="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
						<polyline points="9 18 15 12 9 6"/>
					</svg>
				</button>
			</form>
		{/if}
	</div>
</div>

<!-- BACKDROP & SLIDE-UP PREMIUM BENTO DRAWER ("seperti laci yang ditarik mulus") -->
{#if isCrossCheckOpen}
	<div
		role="presentation"
		class="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 backdrop-blur-md animate-backdrop-in"
		onclick={(e) => {
			if (e.target === e.currentTarget && !isSubmitting) isCrossCheckOpen = false;
		}}
	>
		<!-- Drawer Sheet Meluncur dari Bawah dengan Spring Animation -->
		<div class="w-full max-w-xl rounded-t-[36px] border-t border-[#E5E7EB] dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-2xl animate-drawer-up">
			<!-- Grabber Handle Indicator ala iOS -->
			<div class="mx-auto h-1.5 w-14 rounded-full bg-[#E5E7EB] dark:bg-slate-700 mb-6"></div>

			<!-- Header Strip Eksklusif -->
			<div class="flex items-center justify-between mb-5">
				<div class="flex items-center gap-3">
					<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EFF6FF] dark:bg-blue-950 text-[#2563EB] dark:text-blue-400 shadow-sm border border-blue-200/60 dark:border-blue-800/60">
						<svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
							<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
						</svg>
					</div>
					<div>
						<span class="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-950 px-2.5 py-0.5 text-[10px] font-bold text-[#2563EB] dark:text-blue-300 border border-blue-200 dark:border-blue-800">
							VERIFIKASI TERAKHIR
						</span>
						<h3 class="font-heading text-xl font-bold text-[#0F172A] dark:text-white mt-0.5">
							Konfirmasi Identitas MPLS
						</h3>
					</div>
				</div>
			</div>

			<!-- LUXURY BENTO TICKET CARD (Hanya Berisi Nama & Gugus) -->
			<div class="rounded-[26px] border border-[#E5E7EB] dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-950/80 p-5 shadow-sm mb-6 space-y-4">
				<div class="flex items-center justify-between border-b border-[#E5E7EB] dark:border-slate-800 pb-3">
					<span class="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
						TIKET PRESENSI RESMI • SMAN 2 JONGGOL
					</span>
					<span class="flex items-center gap-1.5 text-xs font-bold text-[#10B981]">
						<span class="h-2 w-2 rounded-full bg-[#10B981] animate-pulse"></span>
						SIAP KIRIM
					</span>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<!-- Bento Box 1: Nama Lengkap -->
					<div class="rounded-[20px] border border-[#E5E7EB] dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
						<span class="block text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">
							NAMA PESERTA
						</span>
						<p class="mt-1 font-heading text-lg sm:text-xl font-bold text-[#0F172A] dark:text-white truncate">
							{namaLengkap}
						</p>
					</div>

					<!-- Bento Box 2: Gugus MPLS -->
					<div class="rounded-[20px] border border-blue-200 dark:border-blue-800/80 bg-[#EFF6FF] dark:bg-blue-950/70 p-4 shadow-sm">
						<span class="block text-[10px] font-semibold uppercase tracking-wider text-[#2563EB] dark:text-blue-400">
							GUGUS MPLS
						</span>
						<p class="mt-1 font-heading text-lg sm:text-xl font-bold text-[#2563EB] dark:text-blue-300 truncate">
							{selectedGugusName}
						</p>
					</div>
				</div>

				<!-- Verification Status Strip -->
				<div class="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs font-semibold text-[#64748B]">
					<span class="flex items-center gap-1.5 text-[#10B981]">
						<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
							<polyline points="20 6 9 17 4 12"/>
						</svg>
						<span>Foto Wajah Terdeteksi</span>
					</span>
					<span class="flex items-center gap-1.5 text-[#10B981]">
						<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
							<polyline points="20 6 9 17 4 12"/>
						</svg>
						<span>Radius Satelit Valid (≤ {maxRadius}m)</span>
					</span>
				</div>
			</div>

			<!-- Mekanisme Geser Slider untuk Konfirmasi ala Google Play -->
			<div class="space-y-3.5">
				<SwipeToConfirm
					isLoading={isSubmitting}
					text="Geser untuk Konfirmasi Presensi →"
					onConfirm={handleSubmitAttendance}
				/>

				<button
					type="button"
					onclick={() => (isCrossCheckOpen = false)}
					disabled={isSubmitting}
					class="w-full py-2.5 text-center text-xs font-semibold text-[#64748B] hover:text-[#0F172A] dark:hover:text-white transition"
				>
					← Kembali & Koreksi Data
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- MODAL PANDUAN IZIN — muncul pertama kali sebelum kamera & GPS aktif -->
<PermissionGuideModal onPermissionGranted={() => (permissionGranted = true)} />
