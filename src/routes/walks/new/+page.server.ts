import { redirect } from '@sveltejs/kit';
import { actionFail, api, loadError, str } from '$lib/server/api';
import { loadRoster } from '$lib/server/roster';
import { parseDayKey, readTimeZone, zonedLocalToIso } from '$lib/api';
import { chosenDuration, defaultStart, fieldOf, sameTimeNextWeek } from '$lib/ui/schedule';
import { isProblem } from '$lib/api';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { clients, walks } = await api(event);
	const tz = readTimeZone(event.cookies);
	const day = parseDayKey(event.url.searchParams.get('day'));
	const fromId = event.url.searchParams.get('from');

	const [roster, source] = await Promise.all([
		loadRoster(clients),
		fromId ? walks.GET('/walks/{walk_id}', { params: { path: { walk_id: fromId } } }) : Promise.resolve(null)
	]);
	if (source && (source.error || !source.data)) loadError(source.response.status, source.error);
	const again = source?.data;

	// "Book again" copies dogs, length and notes to the same time next week.
	return {
		...roster,
		bookingAgain: Boolean(again),
		initial: {
			scheduled_at: again ? sameTimeNextWeek(again.scheduled_at, tz) : defaultStart(Date.now(), tz, day),
			duration_minutes: String(again?.duration_minutes ?? 45),
			dog_ids: again?.dog_ids ?? event.url.searchParams.getAll('dog_id'),
			notes: again?.notes ?? ''
		}
	};
};

export const actions: Actions = {
	default: async (event) => {
		const data = await event.request.formData();
		const scheduledLocal = str(data, 'scheduled_at') ?? '';
		const durationChoice = str(data, 'duration_choice');
		const duration = chosenDuration(durationChoice, str(data, 'duration_minutes'));
		const dog_ids = data.getAll('dog_ids').map(String).filter(Boolean);
		const notes = str(data, 'notes');
		const values = {
			scheduled_at: scheduledLocal,
			duration_minutes: Number.isNaN(duration) ? (str(data, 'duration_minutes') ?? '') : String(duration),
			dog_ids,
			notes
		};
		const invalid = (field: string, message: string) =>
			actionFail(400, { error_code: 'invalid_walk', message }, { ...values, field });

		const scheduled_at = zonedLocalToIso(scheduledLocal, readTimeZone(event.cookies));
		if (!scheduled_at) return invalid('scheduled_at', 'Pick a date and time.');
		if (!Number.isInteger(duration) || duration < 1) return invalid('duration_minutes', 'Enter the walk length in whole minutes.');
		if (dog_ids.length === 0) return invalid('dog_ids', 'Pick at least one dog.');

		const { walks } = await api(event);
		const res = await walks.POST('/walks', { body: { scheduled_at, duration_minutes: duration, dog_ids, notes } });
		if (res.error || !res.data) {
			const field = isProblem(res.error) ? fieldOf(res.error.message) : undefined;
			return actionFail(res.response.status, res.error, { ...values, field: field ?? (res.response.status === 400 ? 'dog_ids' : undefined) });
		}
		redirect(303, `/walks/${res.data.walk_id}`);
	}
};

