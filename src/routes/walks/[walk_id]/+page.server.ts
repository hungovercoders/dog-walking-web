import { redirect } from '@sveltejs/kit';
import { actionFail, api, loadError, patchField, str } from '$lib/server/api';
import { loadRoster } from '$lib/server/roster';
import { safeRedirectPath } from '$lib/server/redirect';
import { CANCELLATION_REASONS, readTimeZone, zonedLocalToIso, type CancellationReason, type WalksApi } from '$lib/api';
import { alreadyDone } from '$lib/ui/feedback';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

export const load: PageServerLoad = async (event) => {
	const { walks, clients } = await api(event);
	const [walkRes, roster] = await Promise.all([
		walks.GET('/walks/{walk_id}', { params: { path: { walk_id: event.params.walk_id } } }),
		loadRoster(clients)
	]);
	if (walkRes.error || !walkRes.data) loadError(walkRes.response.status, walkRes.error);
	return {
		walk: walkRes.data,
		...roster,
		// The timer's first render uses this clock, so server and browser agree.
		serverNow: Date.now(),
		// Links from walk cards land here with these when JavaScript is off.
		editRequested: event.url.searchParams.has('edit'),
		cancelRequested: event.url.searchParams.has('cancel')
	};
};

/** Where to land after a lifecycle action: the caller's page, or this walk. */
function afterAction(event: RequestEvent): never {
	const back = safeRedirectPath(event.url.searchParams.get('redirect_to'), event.url);
	redirect(303, back ?? `/walks/${event.params.walk_id}`);
}

/** A 409 from a lifecycle action may only mean an earlier tap already did it. */
async function raceNotice(walks: WalksApi, walkId: string, action: 'start' | 'complete' | 'cancel') {
	const now = await walks.GET('/walks/{walk_id}', { params: { path: { walk_id: walkId } } });
	return alreadyDone(action, now.data?.status);
}

export const actions: Actions = {
	update: async (event) => {
		const data = await event.request.formData();
		const scheduledLocal = str(data, 'scheduled_at');
		const durationRaw = str(data, 'duration_minutes');
		const dog_ids = data.getAll('dog_ids').map(String).filter(Boolean);
		const scheduled_at = scheduledLocal ? zonedLocalToIso(scheduledLocal, readTimeZone(event.cookies)) : undefined;
		if (scheduled_at === null) {
			return actionFail(400, { error_code: 'invalid_walk', message: 'Pick a date and time.' }, { form: 'update', field: 'scheduled_at' });
		}
		if (dog_ids.length === 0) {
			return actionFail(400, { error_code: 'invalid_walk', message: 'Pick at least one dog.' }, { form: 'update', field: 'dog_ids' });
		}
		const body = {
			scheduled_at,
			duration_minutes: durationRaw ? Number(durationRaw) : undefined,
			dog_ids,
			// Emptied notes are sent as "" so the API clears them.
			notes: patchField(data, 'notes')
		};
		const { walks } = await api(event);
		const res = await walks.PATCH('/walks/{walk_id}', { params: { path: { walk_id: event.params.walk_id } }, body });
		if (res.error || !res.data) return actionFail(res.response.status, res.error, { form: 'update' });
		return { updated: true };
	},
	start: async (event) => {
		const { walks } = await api(event);
		const res = await walks.POST('/walks/{walk_id}/start', { params: { path: { walk_id: event.params.walk_id } } });
		if (res.response.status === 409) {
			const notice = await raceNotice(walks, event.params.walk_id, 'start');
			if (notice) return { notice };
		}
		if (res.error || !res.data) return actionFail(res.response.status, res.error, { form: 'start' });
		afterAction(event);
	},
	complete: async (event) => {
		const data = await event.request.formData();
		// "Skip notes" completes without them even if the field has text.
		const notes = data.has('skip') ? undefined : str(data, 'notes');
		const { walks } = await api(event);
		const res = await walks.POST('/walks/{walk_id}/complete', {
			params: { path: { walk_id: event.params.walk_id } },
			body: notes ? { notes } : {}
		});
		if (res.response.status === 409) {
			const notice = await raceNotice(walks, event.params.walk_id, 'complete');
			if (notice) return { notice };
		}
		if (res.error || !res.data) return actionFail(res.response.status, res.error, { form: 'complete' });
		afterAction(event);
	},
	cancel: async (event) => {
		const data = await event.request.formData();
		const reason = str(data, 'reason') as CancellationReason | undefined;
		if (!reason || !CANCELLATION_REASONS.some((r) => r.value === reason)) {
			return actionFail(400, { error_code: 'invalid_reason', message: 'Pick a reason.' }, { form: 'cancel', field: 'reason' });
		}
		const { walks } = await api(event);
		const res = await walks.POST('/walks/{walk_id}/cancel', {
			params: { path: { walk_id: event.params.walk_id } },
			body: { reason }
		});
		if (res.response.status === 409) {
			const notice = await raceNotice(walks, event.params.walk_id, 'cancel');
			if (notice) return { notice };
		}
		if (res.error || !res.data) return actionFail(res.response.status, res.error, { form: 'cancel' });
		afterAction(event);
	}
};
