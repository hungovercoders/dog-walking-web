import { redirect } from '@sveltejs/kit';
import { actionFail, api, loadError, patchField, str } from '$lib/server/api';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { clients } = await api(event);
	const path = { client_id: event.params.client_id };
	const [clientRes, dogsRes] = await Promise.all([
		clients.GET('/clients/{client_id}', { params: { path } }),
		clients.GET('/dogs', { params: { query: { client_id: event.params.client_id } } })
	]);
	if (clientRes.error || !clientRes.data) loadError(clientRes.response.status, clientRes.error);
	if (dogsRes.error || !dogsRes.data) loadError(dogsRes.response.status, dogsRes.error);
	return { client: clientRes.data, dogs: dogsRes.data.dogs };
};

export const actions: Actions = {
	update: async (event) => {
		const data = await event.request.formData();
		// Emptied optional fields go as "" so the API clears them; an emptied
		// name is refused here rather than silently kept.
		const body = {
			name: patchField(data, 'name'),
			email: patchField(data, 'email'),
			phone: patchField(data, 'phone'),
			address: patchField(data, 'address'),
			notes: patchField(data, 'notes')
		};
		if (body.name === '') {
			return actionFail(
				400,
				{ error_code: 'invalid_client', message: 'Name is required.' },
				{ form: 'update', field: 'name', ...body }
			);
		}
		const { clients } = await api(event);
		const res = await clients.PATCH('/clients/{client_id}', {
			params: { path: { client_id: event.params.client_id } },
			body
		});
		if (res.error || !res.data) return actionFail(res.response.status, res.error, { form: 'update', ...body });
		return { updated: true };
	},
	delete: async (event) => {
		const { clients } = await api(event);
		const res = await clients.DELETE('/clients/{client_id}', {
			params: { path: { client_id: event.params.client_id } }
		});
		if (res.response.status !== 204) return actionFail(res.response.status, res.error, { form: 'delete' });
		redirect(303, '/clients');
	},
	addDog: async (event) => {
		const data = await event.request.formData();
		const body = {
			client_id: event.params.client_id,
			name: str(data, 'name') ?? '',
			breed: str(data, 'breed'),
			date_of_birth: str(data, 'date_of_birth'),
			notes: str(data, 'notes')
		};
		if (!body.name) {
			return actionFail(
				400,
				{ error_code: 'invalid_dog', message: 'Name is required.' },
				{ form: 'addDog', field: 'name', ...body }
			);
		}
		const { clients } = await api(event);
		const res = await clients.POST('/dogs', { body });
		if (res.error || !res.data) return actionFail(res.response.status, res.error, { form: 'addDog', ...body });
		return { dogAdded: res.data.name };
	}
};
