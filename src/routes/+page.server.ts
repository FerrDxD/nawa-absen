import type { PageServerLoad } from './$types';
import { getGugusList, getDynamicSchoolConfig } from '$lib/server/service';

export const load: PageServerLoad = async () => {
	const gugusList = await getGugusList();
	const config = await getDynamicSchoolConfig();

	return {
		gugusList,
		schoolConfig: config
	};
};
