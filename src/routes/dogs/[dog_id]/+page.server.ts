import { redirect } from '@sveltejs/kit';
import { actionFail, api, loadError, patchField } from '$lib/server/api';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { clients } = await api(event);
	const dogRes = await clients.GET('/dogs/{dog_id}', { params: { path: { dog_id: event.params.dog_id } } });
	if (dogRes.error || !dogRes.data) loadError(dogRes.response.status, dogRes.error);
	const clientRes = await clients.GET('/clients/{client_id}', {
		params: { path: { client_id: dogRes.data.client_id } }
	});
	return { dog: dogRes.data, owner: clientRes.data ?? null };
};

export const actions: Actions = {
	update: async (event) => {
		const data = await event.request.formData();
		// Emptied optional fields go as "" so the API clears them; an emptied
		// name is refused here rather than silently kept.
		const body = {
			name: patchField(data, 'name'),
			breed: patchField(data, 'breed'),
			date_of_birth: patchField(data, 'date_of_birth'),
			notes: patchField(data, 'notes')
		};
		if (body.name === '') {
			return actionFail(400, { error_code: 'invalid_dog', message: 'Name is required.' }, { form: 'update', field: 'name', ...body });
		}
		const { clients } = await api(event);
		const res = await clients.PATCH('/dogs/{dog_id}', { params: { path: { dog_id: event.params.dog_id } }, body });
		if (res.error || !res.data) return actionFail(res.response.status, res.error, { form: 'update', ...body });
		return { updated: true };
	},
	delete: async (event) => {
		const { clients } = await api(event);
		const dog = await clients.GET('/dogs/{dog_id}', { params: { path: { dog_id: event.params.dog_id } } });
		const res = await clients.DELETE('/dogs/{dog_id}', { params: { path: { dog_id: event.params.dog_id } } });
		if (res.response.status !== 204) return actionFail(res.response.status, res.error, { form: 'delete' });
		redirect(303, dog.data ? `/clients/${dog.data.client_id}` : '/clients');
	}
};
