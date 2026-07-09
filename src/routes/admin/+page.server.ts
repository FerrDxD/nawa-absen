import type { PageServerLoad } from './$types';
import { getDynamicSchoolConfig, getGugusList } from '$lib/server/service';

export const load: PageServerLoad = async () => {
	const schoolConfig = await getDynamicSchoolConfig();
	const gugusList = await getGugusList();

	return {
		schoolConfig,
		gugusList
	};
};
