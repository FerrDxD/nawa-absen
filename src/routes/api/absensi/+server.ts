import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	checkDuplicateSubmission,
	handlePhotoStorage,
	saveAbsensiRecord,
	getDynamicSchoolConfig
} from '$lib/server/service';
import { validateGeofenceServerSide } from '$lib/server/geo';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const {
			nama,
			gugus_id,
			foto_base64,
			latitude,
			longitude,
			accuracy_meter = 10,
			device_fingerprint,
			gps_integrity
		} = body;

		// 1. Validasi Input Dasar
		if (!nama || typeof nama !== 'string' || nama.trim().length < 3) {
			return json(
				{ success: false, message: 'Nama lengkap minimal 3 karakter.' },
				{ status: 400 }
			);
		}
		const gugusIdNum = Number(gugus_id);
		if (!gugusIdNum || isNaN(gugusIdNum)) {
			return json(
				{ success: false, message: 'Silakan pilih Gugus yang valid.' },
				{ status: 400 }
			);
		}
		if (!foto_base64 || typeof foto_base64 !== 'string') {
			return json(
				{ success: false, message: 'Foto kamera wajib diambil sebelum absensi.' },
				{ status: 400 }
			);
		}
		if (typeof latitude !== 'number' || typeof longitude !== 'number') {
			return json(
				{ success: false, message: 'Koordinat GPS tidak valid.' },
				{ status: 400 }
			);
		}

		// 2. CEK INTEGRITAS SENSOR GPS (ANTI-SPOOFING / FAKE GPS DETECTION)
		if (gps_integrity && gps_integrity.code === 'SYNTHETIC_COORDS') {
			return json(
				{
					success: false,
					code: 'FAKE_GPS_DETECTED',
					message: 'Verifikasi keamanan gagal: Koordinat terdeteksi sintetis atau hasil manipulasi emulator GPS.'
				},
				{ status: 403 }
			);
		}

		// 3. SERVER-SIDE GEOFENCING VALIDATION (WAJIB DI SERVER, JANGAN PERCAYA CLIENT)
		const currentConfig = await getDynamicSchoolConfig();
		const geoResult = validateGeofenceServerSide(
			latitude,
			longitude,
			Number(accuracy_meter) || 0,
			currentConfig
		);

		// Jika jarak > radius, TOLAK dan JANGAN simpan ke database
		if (!geoResult.isValid) {
			return json(
				{
					success: false,
					code: 'OUT_OF_GEOFENCE',
					message: `Kamu berada di luar radius absensi, jarak: ${geoResult.jarakMeter} meter dari titik sekolah (maksimal ${geoResult.radiusMeter} meter).`,
					jarakMeter: geoResult.jarakMeter,
					radiusMeter: geoResult.radiusMeter,
					accuracyMeter: geoResult.accuracyMeter
				},
				{ status: 403 }
			);
		}

		// 4. ANTI TITIP ABSEN / DUPLICATE PREVENTION
		const todayStr = new Date().toISOString().split('T')[0];
		const isDuplicate = await checkDuplicateSubmission(
			nama.trim(),
			gugusIdNum,
			todayStr
		);

		if (isDuplicate) {
			return json(
				{
					success: false,
					code: 'DUPLICATE_SUBMISSION',
					message: `Atas nama "${nama.trim()}" di gugus terpilih sudah melakukan absensi hari ini (${todayStr}).`
				},
				{ status: 409 }
			);
		}

		// 5. SIMPAN FOTO SELFIE SISWA KE CLOUDFLARE R2 (ORGANIZED)
		const storageResult = await handlePhotoStorage(foto_base64, {
			nama: nama.trim(),
			gugusId: gugusIdNum,
			tanggal: todayStr
		});

		// 6. AMBIL USER AGENT & DEVICE FINGERPRINT
		const userAgent = request.headers.get('user-agent') || 'Unknown User-Agent';
		const deviceInfoStr = device_fingerprint
			? typeof device_fingerprint === 'object'
				? JSON.stringify(device_fingerprint)
				: String(device_fingerprint)
			: 'Simple Fingerprint';

		// 7. CEK WAKTU PRESENSI (TEPAT WAKTU <= 06:30 ATAU TERLAMBAT > 06:30 WIB)
		const now = new Date();
		const timeParts = new Intl.DateTimeFormat('id-ID', {
			timeZone: 'Asia/Jakarta',
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		}).formatToParts(now);
		const hours = Number(timeParts.find((p) => p.type === 'hour')?.value || 0);
		const minutes = Number(timeParts.find((p) => p.type === 'minute')?.value || 0);

		const isTepatWaktu = hours < 6 || (hours === 6 && minutes <= 30);
		const statusRecord = isTepatWaktu ? 'tepat_waktu' : 'terlambat';
		const statusWaktuLabel = isTepatWaktu ? 'Tepat Waktu' : 'Terlambat';

		// 8. SIMPAN REKORD KE DATABASE
		const savedRecord = await saveAbsensiRecord({
			nama: nama.trim(),
			gugus_id: gugusIdNum,
			foto_url: storageResult.fotoUrl,
			foto_base64: storageResult.fotoBase64Stored,
			latitude,
			longitude,
			jarak_meter: geoResult.jarakMeter,
			accuracy_meter: geoResult.accuracyMeter,
			status: statusRecord,
			keterangan: geoResult.message,
			tanggal: todayStr,
			user_agent: userAgent,
			device_info: deviceInfoStr
		});

		return json({
			success: true,
			message: 'Absensi NAWA-ABSEN berhasil dicatat!',
			data: {
				id: savedRecord.id,
				nama: savedRecord.nama,
				nama_gugus: savedRecord.nama_gugus,
				waktu: savedRecord.created_at,
				jarakMeter: savedRecord.jarak_meter,
				accuracyMeter: savedRecord.accuracy_meter,
				isAccuracyWarning: geoResult.isAccuracyWarning,
				keterangan: geoResult.message,
				statusRecord,
				statusWaktuLabel,
				isTepatWaktu
			}
		});
	} catch (err: any) {
		console.error('Error in POST /api/absensi:', err);
		return json(
			{
				success: false,
				message: 'Terjadi kesalahan pada server saat memproses data.'
			},
			{ status: 500 }
		);
	}
};
