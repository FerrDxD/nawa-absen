import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { password } = await request.json();
		const expectedPassword = env.ADMIN_PASSWORD || 'mplsman2jonggol2026';

		if (password === expectedPassword) {
			return json({
				success: true,
				token: 'admin-session-mpls-2026',
				message: 'Login Admin Berhasil!'
			});
		}

		return json(
			{
				success: false,
				message: 'Password Admin salah. Silakan periksa kredensial Anda.'
			},
			{ status: 401 }
		);
	} catch (e: any) {
		return json({ success: false, message: e.message }, { status: 500 });
	}
};
