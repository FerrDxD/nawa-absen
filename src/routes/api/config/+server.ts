import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDynamicSchoolConfig, updateDynamicSchoolConfig } from '$lib/server/service';

export const GET: RequestHandler = async () => {
	const config = await getDynamicSchoolConfig();
	return json({
		success: true,
		data: config
	});
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { latitude, longitude, radius_meter } = body;

		if (typeof latitude !== 'number' || typeof longitude !== 'number') {
			return json({ success: false, message: 'Koordinat tidak valid.' }, { status: 400 });
		}

		const updated = await updateDynamicSchoolConfig({
			latitude,
			longitude,
			radius_meter: Number(radius_meter) || 70
		});

		return json({
			success: true,
			message: 'Konfigurasi lokasi sekolah berhasil diperbarui untuk pengujian!',
			data: updated
		});
	} catch (e: any) {
		return json({ success: false, message: e.message }, { status: 500 });
	}
};
