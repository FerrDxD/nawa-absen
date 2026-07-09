<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

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

	let {
		records = [],
		schoolLat = -6.470206,
		schoolLng = 107.074081,
		schoolRadius = 70,
		selectedGugusFilter = 'all',
		onSelectRecord = () => {}
	}: {
		records: AbsensiRecord[];
		schoolLat: number;
		schoolLng: number;
		schoolRadius: number;
		selectedGugusFilter?: string;
		onSelectRecord?: (rec: AbsensiRecord) => void;
	} = $props();

	// Warna Gugus Resmi sesuai spesifikasi User
	const GUGUS_COLORS: Record<number, { name: string; hex: string; textColor: string; border: string }> = {
		1: { name: 'GUGUS 1 Padjajaran', hex: '#FFFFFF', textColor: '#0F172A', border: '#0F172A' },
		2: { name: 'GUGUS 2 Tarumanagara', hex: '#0F172A', textColor: '#FFFFFF', border: '#475569' },
		3: { name: 'GUGUS 3 Subanglarang', hex: '#2563EB', textColor: '#FFFFFF', border: '#1D4ED8' },
		4: { name: 'GUGUS 4 Siliwangi', hex: '#EF4444', textColor: '#FFFFFF', border: '#DC2626' },
		5: { name: 'GUGUS 5 Kawali', hex: '#10B981', textColor: '#FFFFFF', border: '#059669' },
		6: { name: 'GUGUS 6 Talaga', hex: '#F59E0B', textColor: '#FFFFFF', border: '#D97706' },
		7: { name: 'GUGUS 7 Pakuwan', hex: '#EC4899', textColor: '#FFFFFF', border: '#DB2777' },
		8: { name: 'GUGUS 8 Wastukencana', hex: '#8B5CF6', textColor: '#FFFFFF', border: '#7C3AED' }
	};

	let mapContainer: HTMLDivElement | null = $state(null);
	let map: any = null;
	let L: any = null;
	let markersLayer: any = null;
	let schoolMarker: any = null;
	let schoolCircle: any = null;

	let activeGugusFilter = $state<string>('all');

	// Sinkronisasi filter dari props
	$effect(() => {
		activeGugusFilter = selectedGugusFilter;
	});

	// Filtered records untuk peta
	let displayedRecords = $derived(
		records.filter((r) => {
			if (!r.latitude || !r.longitude) return false;
			if (activeGugusFilter !== 'all' && r.gugus_id.toString() !== activeGugusFilter) {
				return false;
			}
			return true;
		})
	);

	function getMarkerHtml(gugusId: number, status: string) {
		const config = GUGUS_COLORS[gugusId] || {
			name: 'Gugus Lain',
			hex: '#64748B',
			textColor: '#FFFFFF',
			border: '#334155'
		};

		const isInvalid = status !== 'valid';

		return `
			<div style="
				position: relative;
				width: 32px;
				height: 32px;
				border-radius: 50%;
				background-color: ${config.hex};
				border: 3px solid ${isInvalid ? '#EF4444' : config.border};
				box-shadow: 0 4px 10px rgba(0,0,0,0.3);
				display: flex;
				align-items: center;
				justify-content: center;
				font-weight: 800;
				font-size: 11px;
				color: ${config.textColor};
				font-family: 'Poppins', sans-serif;
			">
				${gugusId}
				${isInvalid ? `<span style="position: absolute; top: -4px; right: -4px; width: 10px; height: 10px; border-radius: 50%; background: #EF4444; border: 1.5px solid white;"></span>` : ''}
			</div>
		`;
	}

	async function initMap() {
		if (typeof window === 'undefined' || !mapContainer) return;

		// Load Leaflet module
		const leafletModule = await import('leaflet');
		L = leafletModule.default;

		// Ensure Leaflet CSS is loaded
		if (!document.getElementById('leaflet-css')) {
			const link = document.createElement('link');
			link.id = 'leaflet-css';
			link.rel = 'stylesheet';
			link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
			document.head.appendChild(link);
		}

		// Initialize Map
		map = L.map(mapContainer, {
			zoomControl: true,
			attributionControl: false
		}).setView([schoolLat, schoolLng], 17);

		// Add OpenStreetMap CartoDB Positron / Standard Tile Layer
		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			maxZoom: 20
		}).addTo(map);

		markersLayer = L.layerGroup().addTo(map);

		renderSchoolGeofence();
		updateMarkers();
	}

	function renderSchoolGeofence() {
		if (!map || !L) return;

		if (schoolCircle) map.removeLayer(schoolCircle);
		if (schoolMarker) map.removeLayer(schoolMarker);

		// Lingkaran Radius Geofence Sekolah
		schoolCircle = L.circle([schoolLat, schoolLng], {
			radius: schoolRadius,
			color: '#2563EB',
			weight: 2,
			dashArray: '6, 6',
			fillColor: '#3B82F6',
			fillOpacity: 0.15
		}).addTo(map);

		// Icon Titik Sekolah
		const schoolIcon = L.divIcon({
			className: 'custom-school-icon',
			html: `
				<div style="
					width: 38px;
					height: 38px;
					border-radius: 12px;
					background: #2563EB;
					border: 3px solid white;
					box-shadow: 0 6px 16px rgba(37,99,235,0.45);
					display: flex;
					align-items: center;
					justify-content: center;
					color: white;
				">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
						<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
						<polyline points="9 22 9 12 15 12 15 22"/>
					</svg>
				</div>
			`,
			iconSize: [38, 38],
			iconAnchor: [19, 19]
		});

		schoolMarker = L.marker([schoolLat, schoolLng], { icon: schoolIcon })
			.addTo(map)
			.bindPopup(`
				<div style="font-family: 'Inter', sans-serif; padding: 4px;">
					<strong style="font-size: 13px; color: #0F172A;">SMAN 2 Jonggol (Pusat Geofence)</strong><br/>
					<span style="font-size: 11px; color: #64748B;">Radius Presensi Aktif: <b>${schoolRadius} Meter</b></span>
				</div>
			`);
	}

	function updateMarkers() {
		if (!map || !L || !markersLayer) return;

		markersLayer.clearLayers();

		const bounds = L.latLngBounds([ [schoolLat, schoolLng] ]);

		displayedRecords.forEach((rec) => {
			const customIcon = L.divIcon({
				className: 'student-pin-icon',
				html: getMarkerHtml(rec.gugus_id, rec.status),
				iconSize: [32, 32],
				iconAnchor: [16, 16],
				popupAnchor: [0, -18]
			});

			const marker = L.marker([rec.latitude, rec.longitude], { icon: customIcon }).addTo(markersLayer);

			bounds.extend([rec.latitude, rec.longitude]);

			const timeFormatted = new Date(rec.created_at).toLocaleTimeString('id-ID', {
				hour: '2-digit',
				minute: '2-digit'
			});

			const gugusColor = GUGUS_COLORS[rec.gugus_id] || GUGUS_COLORS[1];

			const popupHtml = `
				<div style="font-family: 'Inter', sans-serif; min-width: 200px;">
					${rec.foto_url || rec.foto_base64 ? `
						<img src="${rec.foto_url || rec.foto_base64}" alt="${rec.nama}" style="width: 100%; height: 110px; object-fit: cover; border-radius: 10px; margin-bottom: 8px;" />
					` : ''}
					<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
						<span style="background: ${gugusColor.hex}; color: ${gugusColor.textColor}; border: 1px solid ${gugusColor.border}; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 800;">
							GUGUS ${rec.gugus_id}
						</span>
						<span style="font-size: 10px; font-weight: 700; color: ${rec.status === 'valid' ? '#10B981' : '#EF4444'};">
							${rec.status.toUpperCase()}
						</span>
					</div>
					<strong style="font-size: 13px; color: #0F172A; display: block;">${rec.nama}</strong>
					<div style="font-size: 11px; color: #64748B; margin-top: 4px;">
						Jarak ke Sekolah: <b style="color: ${rec.jarak_meter <= schoolRadius ? '#10B981' : '#EF4444'};">${rec.jarak_meter}m</b><br/>
						Waktu Presensi: <b>${timeFormatted} WIB</b>
					</div>
				</div>
			`;

			marker.bindPopup(popupHtml);

			marker.on('click', () => {
				onSelectRecord(rec);
			});
		});

		// Atur zoom agar mencakup sekolah & semua penanda aktif
		if (displayedRecords.length > 0) {
			map.fitBounds(bounds, { padding: [50, 50], maxZoom: 18 });
		} else {
			map.setView([schoolLat, schoolLng], 17);
		}
	}

	$effect(() => {
		// Reactive update saat records / koordinat sekolah / filter berubah
		if (map && L) {
			renderSchoolGeofence();
			updateMarkers();
		}
	});

	onMount(() => {
		initMap();
	});

	onDestroy(() => {
		if (map) {
			map.remove();
			map = null;
		}
	});

	function setFilter(val: string) {
		activeGugusFilter = val;
	}
</script>

<div class="rounded-[24px] border border-[#E5E7EB] dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-v2 space-y-5">
	<!-- HEADER PETA & LEGENDA GUGUS WARNA -->
	<div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2">
				<span class="flex h-3 w-3 rounded-full bg-[#10B981] animate-pulse"></span>
				<h3 class="font-heading text-lg font-bold text-[#0F172A] dark:text-white">
					Peta Geolocation Real-Time Peserta
				</h3>
			</div>
			<p class="text-xs text-[#64748B] mt-0.5">
				Titik koordinat akurat siswa saat presensi dipetakan dengan warna spesifik per Gugus MPLS
			</p>
		</div>

		<!-- Filter Gugus Interaktif langsung di Peta -->
		<div class="flex flex-wrap items-center gap-1.5">
			<button
				type="button"
				onclick={() => setFilter('all')}
				class="rounded-full px-3 py-1 text-xs font-bold transition {activeGugusFilter === 'all' ? 'bg-[#2563EB] text-white shadow-sm' : 'bg-[#F8FAFC] dark:bg-slate-800 text-[#64748B] hover:bg-slate-100'}"
			>
				Semua ({records.length})
			</button>

			{#each Object.entries(GUGUS_COLORS) as [id, col]}
				<button
					type="button"
					onclick={() => setFilter(id)}
					class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold transition border"
					style="
						background-color: {activeGugusFilter === id ? col.border : '#F8FAFC'};
						color: {activeGugusFilter === id ? '#FFFFFF' : col.border};
						border-color: {col.border};
					"
				>
					<span
						class="h-2.5 w-2.5 rounded-full border border-slate-300"
						style="background-color: {col.hex};"
					></span>
					<span>Gugus {id}</span>
				</button>
			{/each}
		</div>
	</div>

	<!-- KONTENER PETA INTERAKTIF -->
	<div class="relative h-[440px] w-full overflow-hidden rounded-[20px] border border-[#E5E7EB] dark:border-slate-800 shadow-inner z-0">
		<div
			bind:this={mapContainer}
			class="h-full w-full z-0"
		></div>

		<!-- Keterangan Legenda Warna Cepat di pojok bawah -->
		<div class="absolute bottom-3 left-3 z-10 hidden sm:flex flex-wrap items-center gap-1.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 p-2.5 shadow-lg border border-[#E5E7EB] dark:border-slate-800 backdrop-blur-sm max-w-xl text-[10px]">
			<span class="font-bold text-[#0F172A] dark:text-white mr-1">Legenda Warna:</span>
			{#each Object.entries(GUGUS_COLORS) as [id, col]}
				<span class="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-semibold text-[#0F172A] dark:text-slate-200">
					<span class="h-2.5 w-2.5 rounded-full border border-slate-400" style="background-color: {col.hex};"></span>
					G{id}
				</span>
			{/each}
		</div>
	</div>
</div>
