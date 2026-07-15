import type { RequestHandler } from './$types';
import { getRekapAbsensi, getTodayDateStrWIB } from '$lib/server/service';

export const GET: RequestHandler = async ({ url }) => {
	const gugusIdParam = url.searchParams.get('gugusId');
	const tanggalParam = url.searchParams.get('tanggal');

	const filters: { gugusId?: number; tanggal?: string } = {};
	if (gugusIdParam && gugusIdParam !== 'all') filters.gugusId = Number(gugusIdParam);
	if (tanggalParam && tanggalParam !== 'all') filters.tanggal = tanggalParam;

	const records = await getRekapAbsensi(filters);

	const headers = [
		'ID',
		'Nama Lengkap',
		'Gugus',
		'Tanggal',
		'Waktu Absen',
		'Jarak (Meter)',
		'Akurasi GPS (Meter)',
		'Status',
		'Keterangan',
		'Device / Platform'
	];

	const escapeCSV = (str: string | number | null | undefined) => {
		if (str === null || str === undefined) return '""';
		const clean = String(str).replace(/"/g, '""');
		return `"${clean}"`;
	};

	const csvRows = [headers.join(',')];

	for (const r of records) {
		const row = [
			r.id,
			escapeCSV(r.nama),
			escapeCSV(r.nama_gugus),
			escapeCSV(r.tanggal),
			escapeCSV(new Date(r.created_at).toLocaleString('id-ID')),
			r.jarak_meter,
			r.accuracy_meter,
			escapeCSV(r.status),
			escapeCSV(r.keterangan),
			escapeCSV(r.device_info)
		];
		csvRows.push(row.join(','));
	}

	const csvContent = '\uFEFF' + csvRows.join('\r\n'); // Include UTF-8 BOM for Microsoft Excel compatibility

	return new Response(csvContent, {
		status: 200,
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="Rekap_Absensi_MPLS_SMAN2Jonggol_${getTodayDateStrWIB()}.csv"`
		}
	});
};
