import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getGugusList } from '$lib/server/service';

export const GET: RequestHandler = async () => {
	const gugusList = await getGugusList();
	return json({
		success: true,
		data: gugusList
	});
};
