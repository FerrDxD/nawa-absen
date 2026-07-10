import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRekapAbsensi, getAbsensiStats } from '$lib/server/service';

export const GET: RequestHandler = async ({ url }) => {
	const gugusIdParam = url.searchParams.get('gugusId');
	const tanggalParam = url.searchParams.get('tanggal');
	const statusParam = url.searchParams.get('status');

	const filters: { gugusId?: number; tanggal?: string; status?: string } = {};
	if (gugusIdParam && gugusIdParam !== 'all') filters.gugusId = Number(gugusIdParam);
	if (tanggalParam && tanggalParam !== 'all') filters.tanggal = tanggalParam;
	if (statusParam && statusParam !== 'all') filters.status = statusParam;

	const records = await getRekapAbsensi(filters);
	const stats = await getAbsensiStats(filters);

	return json({
		success: true,
		data: {
			records,
			stats
		}
	});
};
