import { redirect } from '@sveltejs/kit';
import { actionFail, api, str } from '$lib/server/api';
import { loadRoster } from '$lib/server/roster';
import { buildRoster, dogsByClient } from '$lib/ui/roster';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { clients } = await api(event);
	const roster = await loadRoster(clients);
	// The same join and dog order as the schedule picker; clients keep the API's order.
	const groups = new Map(dogsByClient(buildRoster(roster.dogs, roster.clients)).map((g) => [g.client?.client_id, g.dogs]));
	return {
		clients: roster.clients.map((c) => ({
			...c,
			dogs: (groups.get(c.client_id) ?? []).map((d) => ({ dog_id: d.dog_id, name: d.name }))
		}))
	};
};

export const actions: Actions = {
	create: async (event) => {
		const data = await event.request.formData();
		const body = {
			name: str(data, 'name') ?? '',
			email: str(data, 'email'),
			phone: str(data, 'phone'),
			address: str(data, 'address'),
			notes: str(data, 'notes')
		};
		if (!body.name) {
			return actionFail(400, { error_code: 'invalid_client', message: 'Name is required.' }, { ...body, field: 'name' });
		}
		const { clients } = await api(event);
		const res = await clients.POST('/clients', { body });
		if (res.error || !res.data) return actionFail(res.response.status, res.error, body);
		redirect(303, `/clients/${res.data.client_id}`);
	}
};
