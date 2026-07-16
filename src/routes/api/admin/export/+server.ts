import type { RequestHandler } from './$types';
import { getRekapAbsensi, getTodayDateStrWIB } from '$lib/server/service';
import { PESERTA_MPLS_2026 } from '$lib/data/peserta_mpls_2026';
import * as XLSX from 'xlsx';

export const GET: RequestHandler = async ({ url }) => {
	const tanggalParam = url.searchParams.get('tanggal');

	const filters: { tanggal?: string } = {};
	if (tanggalParam && tanggalParam !== 'all') filters.tanggal = tanggalParam;

	// Ambil data absensi berdasarkan filter tanggal (jika ada)
	const records = await getRekapAbsensi(filters);

	// Inisialisasi workbook baru
	const wb = XLSX.utils.book_new();

	// Buat 8 sheet untuk Gugus 1 s.d 8
	for (let gId = 1; gId <= 8; gId++) {
		// Filter record untuk gugus ini saja
		const gugusRecords = records.filter((r) => r.gugus_id === gId);

		// Urutkan berdasarkan nama siswa secara abjad
		gugusRecords.sort((a, b) => a.nama.localeCompare(b.nama));

		// Transformasi data ke format yang diminta:
		// no, hari (tanggal), nama, asal, waktu absen, status (tepat waktu, terlambat)
		const sheetData = gugusRecords.map((r, index) => {
			const waktuAbsen = new Date(r.created_at).toLocaleTimeString('id-ID', {
				hour: '2-digit',
				minute: '2-digit',
				hour12: false,
				timeZone: 'Asia/Jakarta'
			}) + ' WIB';

			let statusLabel = 'Terlambat';
			if (r.status === 'tepat_waktu' || r.status === 'valid') {
				statusLabel = 'Tepat Waktu';
			} else if (r.status === 'terlambat') {
				statusLabel = 'Terlambat';
			} else {
				statusLabel = r.status;
			}

			// Cari sekolah asal dari data peserta mpls 2026
			const studentInfo = PESERTA_MPLS_2026.find(
				(p) => p.nama.trim().toLowerCase() === r.nama.trim().toLowerCase()
			);
			const asalSekolah = studentInfo ? studentInfo.sekolah_asal : '-';

			return {
				'No': index + 1,
				'Hari (Tanggal)': r.tanggal,
				'Nama': r.nama,
				'Asal': asalSekolah,
				'Waktu Absen': waktuAbsen,
				'Status': statusLabel
			};
		});

		// Konversi array ke worksheet SheetJS
		const ws = XLSX.utils.json_to_sheet(sheetData);

		// Atur lebar kolom agar terlihat rapi dan tidak terpotong di Excel
		const colWidths = [
			{ wch: 6 },  // No
			{ wch: 18 }, // Hari (Tanggal)
			{ wch: 30 }, // Nama
			{ wch: 30 }, // Asal (Sekolah Asal)
			{ wch: 16 }, // Waktu Absen
			{ wch: 16 }  // Status
		];
		ws['!cols'] = colWidths;

		// Tambahkan sheet ke workbook dengan nama Gugus X
		XLSX.utils.book_append_sheet(wb, ws, `Gugus ${gId}`);
	}

	// Tulis workbook ke buffer biner xlsx
	const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

	return new Response(buf, {
		status: 200,
		headers: {
			'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': `attachment; filename="Rekap_Absensi_MPLS_SMAN2Jonggol_${getTodayDateStrWIB()}.xlsx"`
		}
	});
};
