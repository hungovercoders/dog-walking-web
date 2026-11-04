import { api, loadError } from '$lib/server/api';
import { loadRoster } from '$lib/server/roster';
import { dayWindow, readTimeZone, todayKey } from '$lib/api';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { walks, clients } = await api(event);
	const tz = readTimeZone(event.cookies);
	const today = todayKey(tz);
	// Today and the six days after it, in every status: today needs its
	// completed and cancelled walks for the summary, the rest are filtered.
	const { from, to } = dayWindow(today, 7, tz);
	const [walksRes, roster] = await Promise.all([
		walks.GET('/walks', { params: { query: { scheduled_from: from, scheduled_to: to } } }),
		loadRoster(clients)
	]);
	if (walksRes.error || !walksRes.data) loadError(walksRes.response.status, walksRes.error);
	return { walks: walksRes.data.walks, ...roster };
};
