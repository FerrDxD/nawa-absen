import { getDb } from './db';
import * as schema from './db/schema';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { put } from '@vercel/blob';
import { env } from '$env/dynamic/private';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export interface GugusItem {
	id: number;
	nama_gugus: string;
	ruangan: string;
	pembina: string;
}

export interface AbsensiRecord {
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
	keterangan?: string | null;
	tanggal: string;
	user_agent?: string | null;
	device_info?: string | null;
	created_at: Date;
}

// Default gugus data untuk seeding/fallback
const DEFAULT_GUGUS: GugusItem[] = [
	{ id: 1, nama_gugus: 'GUGUS 1 Padjajaran', ruangan: 'Ruang 1', pembina: 'Kakak Pembina 1' },
	{ id: 2, nama_gugus: 'GUGUS 2 Tarumanagara', ruangan: 'Ruang 2', pembina: 'Kakak Pembina 2' },
	{ id: 3, nama_gugus: 'GUGUS 3 Subanglarang', ruangan: 'Ruang 3', pembina: 'Kakak Pembina 3' },
	{ id: 4, nama_gugus: 'GUGUS 4 Siliwangi', ruangan: 'Ruang 4', pembina: 'Kakak Pembina 4' },
	{ id: 5, nama_gugus: 'GUGUS 5 Kawali', ruangan: 'Ruang 5', pembina: 'Kakak Pembina 5' },
	{ id: 6, nama_gugus: 'GUGUS 6 Talaga', ruangan: 'Ruang 6', pembina: 'Kakak Pembina 6' },
	{ id: 7, nama_gugus: 'GUGUS 7 Pakuwan', ruangan: 'Ruang 7', pembina: 'Kakak Pembina 7' },
	{ id: 8, nama_gugus: 'GUGUS 8 Wastukencana', ruangan: 'Ruang 8', pembina: 'Kakak Pembina 8' }
];

let memoryGugus: GugusItem[] = [...DEFAULT_GUGUS];
let memoryAbsensi: AbsensiRecord[] = [
	{
		id: 101,
		nama: 'Ahmad Fauzi (Padjajaran)',
		gugus_id: 1,
		nama_gugus: 'GUGUS 1 Padjajaran',
		foto_base64: '',
		latitude: -6.470180,
		longitude: 107.074050,
		jarak_meter: 15.2,
		accuracy_meter: 6.0,
		status: 'valid',
		keterangan: 'Lokasi valid dalam radius absensi SMAN 2 Jonggol.',
		tanggal: '2026-07-15', // Hari 1
		user_agent: 'Mozilla/5.0 (Mobile; Chrome/126.0)',
		device_info: 'Android 14 - 360x800',
		created_at: new Date('2026-07-15T06:45:00Z')
	},
	{
		id: 102,
		nama: 'Bunga Kirana (Tarumanagara)',
		gugus_id: 2,
		nama_gugus: 'GUGUS 2 Tarumanagara',
		foto_base64: '',
		latitude: -6.470230,
		longitude: 107.074110,
		jarak_meter: 21.4,
		accuracy_meter: 7.0,
		status: 'valid',
		keterangan: 'Lokasi valid dalam radius absensi SMAN 2 Jonggol.',
		tanggal: '2026-07-15', // Hari 1
		user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)',
		device_info: 'iOS 17 - 390x844',
		created_at: new Date('2026-07-15T06:50:00Z')
	},
	{
		id: 103,
		nama: 'Dimas Aditya (Subanglarang)',
		gugus_id: 3,
		nama_gugus: 'GUGUS 3 Subanglarang',
		foto_base64: '',
		latitude: -6.470195,
		longitude: 107.074130,
		jarak_meter: 18.0,
		accuracy_meter: 8.5,
		status: 'valid',
		keterangan: 'Lokasi valid dalam radius absensi SMAN 2 Jonggol.',
		tanggal: '2026-07-16', // Hari 2
		user_agent: 'Mozilla/5.0 (Mobile; Chrome/126.0)',
		device_info: 'Android 13 - 360x800',
		created_at: new Date('2026-07-16T06:40:00Z')
	},
	{
		id: 104,
		nama: 'Farah Nabila (Siliwangi)',
		gugus_id: 4,
		nama_gugus: 'GUGUS 4 Siliwangi',
		foto_base64: '',
		latitude: -6.470240,
		longitude: 107.074020,
		jarak_meter: 25.1,
		accuracy_meter: 9.0,
		status: 'valid',
		keterangan: 'Lokasi valid dalam radius absensi SMAN 2 Jonggol.',
		tanggal: '2026-07-16', // Hari 2
		user_agent: 'Mozilla/5.0 (Mobile; Chrome/126.0)',
		device_info: 'Android 14 - 412x915',
		created_at: new Date('2026-07-16T06:55:00Z')
	},
	{
		id: 105,
		nama: 'Gilang Ramadhan (Kawali)',
		gugus_id: 5,
		nama_gugus: 'GUGUS 5 Kawali',
		foto_base64: '',
		latitude: -6.470160,
		longitude: 107.074140,
		jarak_meter: 31.5,
		accuracy_meter: 10.0,
		status: 'valid',
		keterangan: 'Lokasi valid dalam radius absensi SMAN 2 Jonggol.',
		tanggal: '2026-07-17', // Hari 3
		user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4)',
		device_info: 'iOS 17.4 - 393x852',
		created_at: new Date('2026-07-17T06:42:00Z')
	},
	{
		id: 106,
		nama: 'Hana Maharani (Talaga)',
		gugus_id: 6,
		nama_gugus: 'GUGUS 6 Talaga',
		foto_base64: '',
		latitude: -6.470270,
		longitude: 107.074060,
		jarak_meter: 38.0,
		accuracy_meter: 7.5,
		status: 'valid',
		keterangan: 'Lokasi valid dalam radius absensi SMAN 2 Jonggol.',
		tanggal: '2026-07-20', // Hari 4
		user_agent: 'Mozilla/5.0 (Mobile; Chrome/126.0)',
		device_info: 'Android 14 - 360x800',
		created_at: new Date('2026-07-20T06:48:00Z')
	},
	{
		id: 107,
		nama: 'Indra Pratama (Pakuwan)',
		gugus_id: 7,
		nama_gugus: 'GUGUS 7 Pakuwan',
		foto_base64: '',
		latitude: -6.470140,
		longitude: 107.074010,
		jarak_meter: 45.2,
		accuracy_meter: 11.0,
		status: 'valid',
		keterangan: 'Lokasi valid dalam radius absensi SMAN 2 Jonggol.',
		tanggal: '2026-07-21', // Hari 5
		user_agent: 'Mozilla/5.0 (Mobile; Chrome/126.0)',
		device_info: 'Android 13 - 384x854',
		created_at: new Date('2026-07-21T06:51:00Z')
	},
	{
		id: 108,
		nama: 'Jasmine Putri (Wastukencana)',
		gugus_id: 8,
		nama_gugus: 'GUGUS 8 Wastukencana',
		foto_base64: '',
		latitude: -6.470210,
		longitude: 107.074180,
		jarak_meter: 52.0,
		accuracy_meter: 6.5,
		status: 'valid',
		keterangan: 'Lokasi valid dalam radius absensi SMAN 2 Jonggol.',
		tanggal: getTodayDateStrWIB(), // Hari Ini
		user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6)',
		device_info: 'iOS 16.6 - 375x812',
		created_at: new Date()
	}
];

let memoryConfig = {
	nama_sekolah: 'SMAN 2 Jonggol',
	latitude: parseFloat(env.SCHOOL_LAT || '-6.470206'),
	longitude: parseFloat(env.SCHOOL_LNG || '107.074081'),
	radius_meter: parseFloat(env.GEOFENCE_RADIUS_M || '70'),
	max_accuracy_meter: parseFloat(env.MAX_GPS_ACCURACY_M || '100'),
	is_active: true
};

/**
 * Dapatkan daftar gugus dari DB atau fallback
 */
export async function getGugusList(): Promise<GugusItem[]> {
	const db = getDb();
	if (db) {
		try {
			const list = await db.select().from(schema.gugus);
			if (list.length === 0) {
				// Seed automatically if empty
				await db.insert(schema.gugus).values(DEFAULT_GUGUS.map(g => ({
					nama_gugus: g.nama_gugus,
					ruangan: g.ruangan,
					pembina: g.pembina
				})));
				const newRows = await db.select().from(schema.gugus);
				return newRows as GugusItem[];
			}
			return list as GugusItem[];
		} catch (e) {
			console.warn('Fallback ke memori gugus dikarenakan:', e);
		}
	}
	return memoryGugus;
}

/**
 * Dapatkan string tanggal hari ini (YYYY-MM-DD) sesuai zona waktu WIB (Asia/Jakarta)
 */
export function getTodayDateStrWIB(date: Date = new Date()): string {
	const parts = new Intl.DateTimeFormat('id-ID', {
		timeZone: 'Asia/Jakarta',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).formatToParts(date);

	const year = parts.find((p) => p.type === 'year')?.value || '2026';
	const month = parts.find((p) => p.type === 'month')?.value || '01';
	const day = parts.find((p) => p.type === 'day')?.value || '01';
	return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

/**
 * Cek apakah sudah absen hari ini (Anti Titip Absen / Double Submission)
 */
export async function checkDuplicateSubmission(
	nama: string,
	gugusId: number,
	tanggal: string
): Promise<boolean> {
	const normalizedNama = nama.trim().toLowerCase();
	const db = getDb();
	if (db) {
		try {
			const rows = await db
				.select()
				.from(schema.absensi)
				.where(
					and(
						sql`LOWER(${schema.absensi.nama}) = ${normalizedNama}`,
						eq(schema.absensi.gugus_id, gugusId),
						eq(schema.absensi.tanggal, tanggal),
						inArray(schema.absensi.status, ['valid', 'tepat_waktu', 'terlambat'])
					)
				);
			return rows.length > 0;
		} catch (e) {
			console.warn('Check duplicate via fallback store');
		}
	}

	return memoryAbsensi.some(
		(a) =>
			a.nama.trim().toLowerCase() === normalizedNama &&
			a.gugus_id === gugusId &&
			a.tanggal === tanggal &&
			['valid', 'tepat_waktu', 'terlambat'].includes(a.status)
	);
}

/**
 * Helper untuk inisialisasi S3Client Cloudflare R2
 */
function getR2Client(): S3Client | null {
	if (!env.R2_ENDPOINT || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
		return null;
	}
	return new S3Client({
		region: 'auto',
		endpoint: env.R2_ENDPOINT,
		credentials: {
			accessKeyId: env.R2_ACCESS_KEY_ID,
			secretAccessKey: env.R2_SECRET_ACCESS_KEY
		}
	});
}

export interface PhotoStorageOptions {
	nama: string;
	gugusId?: number;
	tanggal?: string;
}

/**
 * Format string nama siswa menjadi slug bersih
 * Contoh: "Ahmad Fauzi (Padjajaran)" -> "ahmad-fauzi-padjajaran"
 */
function slugifyName(str: string): string {
	return str
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '') || 'siswa';
}

/**
 * Simpan foto snapshot:
 * Pilihan 1: Upload ke Cloudflare R2 Storage (dari Juan) jika tersedia
 * Pilihan 2: Upload ke Vercel Blob Storage jika BLOB_READ_WRITE_TOKEN tersedia
 * Pilihan 3: Simpan compressed Base64 JPEG langsung di database Postgres / store
 */
export async function handlePhotoStorage(
	fotoBase64: string,
	optionsOrNama: string | PhotoStorageOptions
): Promise<{ fotoUrl: string | null; fotoBase64Stored: string | null; storageType: 'r2' | 'blob' | 'base64' }> {
	const base64Data = fotoBase64.replace(/^data:image\/\w+;base64,/, '');
	const buffer = Buffer.from(base64Data, 'base64');

	// Extract informasi pengorganisasian (organize & proper naming)
	const nama = typeof optionsOrNama === 'string' ? optionsOrNama : optionsOrNama.nama;
	const gugusId = typeof optionsOrNama === 'string' ? undefined : optionsOrNama.gugusId;
	const tanggal = typeof optionsOrNama === 'string' ? undefined : optionsOrNama.tanggal;

	const dateStr = tanggal || getTodayDateStrWIB();
	const gugusFolder = gugusId ? `gugus-${gugusId}` : 'gugus-umum';
	const slugNama = slugifyName(nama);
	const timestamp = Date.now();

	// Format penamaan file terorganisir rapi di R2:
	// selfie-mpls-2026/{YYYY-MM-DD}/gugus-{id}/{slug-nama}-{timestamp}.jpg
	const organizedKey = `selfie-mpls-2026/${dateStr}/${gugusFolder}/${slugNama}-${timestamp}.jpg`;

	// Pilihan 1: Upload ke Cloudflare R2 (Juan)
	if (env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET_NAME && fotoBase64.startsWith('data:image')) {
		try {
			const r2Client = getR2Client();
			if (r2Client) {
				await r2Client.send(
					new PutObjectCommand({
						Bucket: env.R2_BUCKET_NAME,
						Key: organizedKey,
						Body: buffer,
						ContentType: 'image/jpeg',
						CacheControl: 'public, max-age=31536000',
						Metadata: {
							student_name: encodeURIComponent(nama.trim()),
							gugus_id: String(gugusId || '0'),
							attendance_date: dateStr
						}
					})
				);

				const publicUrl = env.R2_PUBLIC_URL
					? `${env.R2_PUBLIC_URL.replace(/\/$/, '')}/${organizedKey}`
					: `/api/photo?key=${encodeURIComponent(organizedKey)}`;

				return {
					fotoUrl: publicUrl,
					fotoBase64Stored: null,
					storageType: 'r2'
				};
			}
		} catch (err) {
			console.error('Gagal upload ke Cloudflare R2, fallback ke storage berikutnya:', err);
		}
	}

	// Pilihan 2: Jika token Vercel Blob tersedia, kita bisa upload sebagai binary blob
	if (env.BLOB_READ_WRITE_TOKEN && fotoBase64.startsWith('data:image')) {
		try {
			const blobResult = await put(organizedKey, buffer, {
				access: 'public',
				contentType: 'image/jpeg'
			});

			return {
				fotoUrl: blobResult.url,
				fotoBase64Stored: null,
				storageType: 'blob'
			};
		} catch (err) {
			console.error('Gagal upload ke Vercel Blob, fallback ke simpan Base64:', err);
		}
	}

	// Default fallback: Simpan base64 terkompresi di database
	return {
		fotoUrl: null,
		fotoBase64Stored: fotoBase64,
		storageType: 'base64'
	};
}

/**
 * Simpan absensi baru ke DB
 */
export async function saveAbsensiRecord(data: {
	nama: string;
	gugus_id: number;
	foto_url?: string | null;
	foto_base64?: string | null;
	latitude: number;
	longitude: number;
	jarak_meter: number;
	accuracy_meter: number;
	status: string;
	keterangan?: string;
	tanggal: string;
	user_agent?: string;
	device_info?: string;
}): Promise<AbsensiRecord> {
	const db = getDb();
	const gugusList = await getGugusList();
	const gugusObj = gugusList.find((g) => g.id === data.gugus_id);

	if (db) {
		try {
			const [inserted] = await db
				.insert(schema.absensi)
				.values({
					nama: data.nama,
					gugus_id: data.gugus_id,
					foto_url: data.foto_url || null,
					foto_base64: data.foto_base64 || null,
					latitude: data.latitude,
					longitude: data.longitude,
					jarak_meter: data.jarak_meter,
					accuracy_meter: data.accuracy_meter,
					status: data.status,
					keterangan: data.keterangan || null,
					tanggal: data.tanggal,
					user_agent: data.user_agent || null,
					device_info: data.device_info || null
				})
				.returning();

			return {
				...inserted,
				nama_gugus: gugusObj?.nama_gugus || `Gugus ${data.gugus_id}`
			};
		} catch (e) {
			console.warn('Gagal insert ke DB Neon, fallback memory store:', e);
		}
	}

	const newId = memoryAbsensi.length ? Math.max(...memoryAbsensi.map((x) => x.id)) + 1 : 101;
	const newRecord: AbsensiRecord = {
		id: newId,
		nama: data.nama,
		gugus_id: data.gugus_id,
		nama_gugus: gugusObj?.nama_gugus || `Gugus ${data.gugus_id}`,
		foto_url: data.foto_url || null,
		foto_base64: data.foto_base64 || null,
		latitude: data.latitude,
		longitude: data.longitude,
		jarak_meter: data.jarak_meter,
		accuracy_meter: data.accuracy_meter,
		status: data.status,
		keterangan: data.keterangan || null,
		tanggal: data.tanggal,
		user_agent: data.user_agent || null,
		device_info: data.device_info || null,
		created_at: new Date()
	};

	memoryAbsensi.unshift(newRecord);
	return newRecord;
}

/**
 * Rekap Absensi untuk Admin Page dengan Filter
 */
export async function getRekapAbsensi(filters?: {
	gugusId?: number;
	tanggal?: string;
	status?: string;
}): Promise<AbsensiRecord[]> {
	const db = getDb();
	if (db) {
		try {
			const query = db
				.select({
					id: schema.absensi.id,
					nama: schema.absensi.nama,
					gugus_id: schema.absensi.gugus_id,
					nama_gugus: schema.gugus.nama_gugus,
					foto_url: schema.absensi.foto_url,
					foto_base64: schema.absensi.foto_base64,
					latitude: schema.absensi.latitude,
					longitude: schema.absensi.longitude,
					jarak_meter: schema.absensi.jarak_meter,
					accuracy_meter: schema.absensi.accuracy_meter,
					status: schema.absensi.status,
					keterangan: schema.absensi.keterangan,
					tanggal: schema.absensi.tanggal,
					user_agent: schema.absensi.user_agent,
					device_info: schema.absensi.device_info,
					created_at: schema.absensi.created_at
				})
				.from(schema.absensi)
				.leftJoin(schema.gugus, eq(schema.absensi.gugus_id, schema.gugus.id))
				.orderBy(desc(schema.absensi.created_at));

			const result = await query;
			let filtered = result.map((r) => {
				// Hitung tanggal WIB yang sebenarnya dari created_at untuk mengoreksi data akibat bug UTC sebelumnya
				const trueTanggal = getTodayDateStrWIB(new Date(r.created_at));
				return {
					...r,
					tanggal: trueTanggal,
					nama_gugus: r.nama_gugus || `Gugus ${r.gugus_id}`
				};
			}) as AbsensiRecord[];

			if (filters?.gugusId) {
				filtered = filtered.filter((r) => r.gugus_id === filters.gugusId);
			}
			if (filters?.tanggal) {
				filtered = filtered.filter((r) => r.tanggal === filters.tanggal);
			}
			if (filters?.status && filters.status !== 'all') {
				if (filters.status === 'valid') {
					filtered = filtered.filter((r) => ['valid', 'tepat_waktu', 'terlambat'].includes(r.status));
				} else {
					filtered = filtered.filter((r) => r.status === filters.status);
				}
			}
			return filtered;
		} catch (e) {
			console.warn('Gagal load dari DB Neon, fallback memory store:', e);
		}
	}

	let filtered = memoryAbsensi.map((r) => ({
		...r,
		tanggal: getTodayDateStrWIB(new Date(r.created_at))
	}));
	if (filters?.gugusId) {
		filtered = filtered.filter((r) => r.gugus_id === filters.gugusId);
	}
	if (filters?.tanggal) {
		filtered = filtered.filter((r) => r.tanggal === filters.tanggal);
	}
	if (filters?.status && filters.status !== 'all') {
		if (filters.status === 'valid') {
			filtered = filtered.filter((r) => ['valid', 'tepat_waktu', 'terlambat'].includes(r.status));
		} else {
			filtered = filtered.filter((r) => r.status === filters.status);
		}
	}
	return filtered;
}

/**
 * Dapatkan Statistik Kehadiran (Total Hadir, Per Gugus, Kehadiran per Jam)
 */
export async function getAbsensiStats(filters?: {
	gugusId?: number;
	tanggal?: string;
	status?: string;
}) {
	const all = await getRekapAbsensi(filters);
	const validRecords = all.filter((r) => ['valid', 'tepat_waktu', 'terlambat'].includes(r.status));
	const ditolakRecords = all.filter((r) => !['valid', 'tepat_waktu', 'terlambat'].includes(r.status));

	// Total per Gugus
	const perGugus: Record<string, { total: number; valid: number; ditolak: number }> = {};
	for (const rec of all) {
		const gName = rec.nama_gugus || `Gugus ${rec.gugus_id}`;
		if (!perGugus[gName]) perGugus[gName] = { total: 0, valid: 0, ditolak: 0 };
		perGugus[gName].total++;
		if (['valid', 'tepat_waktu', 'terlambat'].includes(rec.status)) perGugus[gName].valid++;
		else perGugus[gName].ditolak++;
	}

	// Grafik per Jam (06:00 - 18:00)
	const perJam: Record<string, number> = {};
	for (let i = 6; i <= 17; i++) {
		const label = `${String(i).padStart(2, '0')}:00`;
		perJam[label] = 0;
	}
	for (const rec of validRecords) {
		const hour = Number(new Intl.DateTimeFormat('id-ID', {
			timeZone: 'Asia/Jakarta',
			hour: 'numeric',
			hour12: false
		}).format(new Date(rec.created_at)));
		const label = `${String(hour).padStart(2, '0')}:00`;
		perJam[label] = (perJam[label] || 0) + 1;
	}

	return {
		totalSemua: all.length,
		totalValid: validRecords.length,
		totalDitolak: ditolakRecords.length,
		perGugus,
		perJam
	};
}

/**
 * Konfigurasi Titik Sekolah (Dinamis dari memori/DB atau dari .env)
 */
export async function getDynamicSchoolConfig() {
	return memoryConfig;
}

export async function updateDynamicSchoolConfig(newConfig: {
	latitude: number;
	longitude: number;
	radius_meter: number;
}) {
	memoryConfig = {
		...memoryConfig,
		latitude: newConfig.latitude,
		longitude: newConfig.longitude,
		radius_meter: newConfig.radius_meter
	};
	return memoryConfig;
}
