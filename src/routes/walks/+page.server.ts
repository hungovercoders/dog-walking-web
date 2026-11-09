import { api, loadError } from '$lib/server/api';
import { loadRoster } from '$lib/server/roster';
import { parseDayKey, readTimeZone, todayKey, weekBounds, weekStartKey } from '$lib/api';
import { apiStatus, parseWeekFilter } from '$lib/ui/week';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const tz = readTimeZone(event.cookies);
	// A ?week that is not a real day (2026-13-01) falls back to this week.
	const day = parseDayKey(event.url.searchParams.get('week')) ?? todayKey(tz);
	const filter = parseWeekFilter(event.url.searchParams.get('status'));
	const { from, to } = weekBounds(day, tz);

	const { walks, clients } = await api(event);
	const [walksRes, roster] = await Promise.all([
		walks.GET('/walks', { params: { query: { scheduled_from: from, scheduled_to: to, status: apiStatus(filter) } } }),
		loadRoster(clients)
	]);
	if (walksRes.error || !walksRes.data) loadError(walksRes.response.status, walksRes.error);

	return {
		weekStart: weekStartKey(day),
		thisWeek: weekStartKey(todayKey(tz)),
		filter,
		walks: walksRes.data.walks,
		...roster
	};
};
