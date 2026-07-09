import { env } from '$env/dynamic/private';

export interface GeoConfig {
	namaSekolah: string;
	schoolLat: number;
	schoolLng: number;
	radiusMeter: number;
	maxAccuracyMeter: number;
}

/**
 * Menghitung jarak (meter) antara dua titik koordinat bumi menggunakan Formula Haversine.
 */
export function haversineDistance(
	lat1: number,
	lon1: number,
	lat2: number,
	lon2: number
): number {
	const R = 6371000; // Radius Bumi dalam meter
	const toRad = (deg: number) => (deg * Math.PI) / 180;

	const dLat = toRad(lat2 - lat1);
	const dLon = toRad(lon2 - lon1);

	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(toRad(lat1)) *
			Math.cos(toRad(lat2)) *
			Math.sin(dLon / 2) *
			Math.sin(dLon / 2);

	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	const distance = R * c;

	return Math.round(distance * 10) / 10;
}

/**
 * Mendapatkan konfigurasi geofencing aktif (dari ENV atau override)
 */
export function getSchoolGeoConfig(customOverride?: Partial<GeoConfig>): GeoConfig {
	const defaultLat = parseFloat(env.SCHOOL_LAT || '-6.467389');
	const defaultLng = parseFloat(env.SCHOOL_LNG || '107.039265');
	const defaultRadius = parseFloat(env.GEOFENCE_RADIUS_M || '70');
	const defaultMaxAccuracy = parseFloat(env.MAX_GPS_ACCURACY_M || '100');

	return {
		namaSekolah: 'SMAN 2 Jonggol',
		schoolLat: customOverride?.schoolLat ?? defaultLat,
		schoolLng: customOverride?.schoolLng ?? defaultLng,
		radiusMeter: customOverride?.radiusMeter ?? defaultRadius,
		maxAccuracyMeter: customOverride?.maxAccuracyMeter ?? defaultMaxAccuracy
	};
}

export interface GeofenceValidationResult {
	isValid: boolean;
	jarakMeter: number;
	radiusMeter: number;
	accuracyMeter: number;
	isAccuracyWarning: boolean;
	message: string;
	schoolLat: number;
	schoolLng: number;
}

/**
 * Server-Side Geofence Validator
 * Dilarang percaya perhitungan jarak dari client! Selalu hitung ulang di server.
 */
export function validateGeofenceServerSide(
	clientLat: number,
	clientLng: number,
	clientAccuracy: number,
	activeConfig?: { latitude: number; longitude: number; radius_meter: number; max_accuracy_meter?: number }
): GeofenceValidationResult {
	const config = getSchoolGeoConfig({
		schoolLat: activeConfig?.latitude,
		schoolLng: activeConfig?.longitude,
		radiusMeter: activeConfig?.radius_meter,
		maxAccuracyMeter: activeConfig?.max_accuracy_meter
	});

	const jarakMeter = haversineDistance(
		config.schoolLat,
		config.schoolLng,
		clientLat,
		clientLng
	);

	const isAccuracyWarning = clientAccuracy > config.maxAccuracyMeter;
	const isValid = jarakMeter <= config.radiusMeter;

	let message = 'Lokasi valid dalam radius absensi SMAN 2 Jonggol.';
	if (!isValid) {
		message = `Kamu berada di luar radius absensi, jarak: ${jarakMeter} meter dari titik sekolah (maksimal ${config.radiusMeter} meter). Silakan mendekat ke area lapangan/gerbang sekolah.`;
	} else if (isAccuracyWarning) {
		message = `Lokasi diterima (jarak: ${jarakMeter} meter), namun akurasi GPS browser lemah (${Math.round(clientAccuracy)}m). Disarankan berada di tempat terbuka.`;
	}

	return {
		isValid,
		jarakMeter,
		radiusMeter: config.radiusMeter,
		accuracyMeter: Math.round(clientAccuracy * 10) / 10,
		isAccuracyWarning,
		message,
		schoolLat: config.schoolLat,
		schoolLng: config.schoolLng
	};
}
