import type { PageServerLoad } from './$types';
import { getGugusList, getDynamicSchoolConfig } from '$lib/server/service';
import { PESERTA_MPLS_2026 } from '$lib/data/peserta_mpls_2026';

export const load: PageServerLoad = async () => {
	const gugusList = await getGugusList();
	const config = await getDynamicSchoolConfig();

	return {
		gugusList,
		schoolConfig: config,
		pesertaList: PESERTA_MPLS_2026
	};
};
