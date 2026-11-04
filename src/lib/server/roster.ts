import type { ClientsApi } from '$lib/api';
import { loadError } from './api';

/** Every dog and client of the walker, for joining walks to who and where. */
export async function loadRoster(clients: ClientsApi) {
	const [dogsRes, clientsRes] = await Promise.all([clients.GET('/dogs'), clients.GET('/clients')]);
	if (dogsRes.error || !dogsRes.data) loadError(dogsRes.response.status, dogsRes.error);
	if (clientsRes.error || !clientsRes.data) loadError(clientsRes.response.status, clientsRes.error);
	return { dogs: dogsRes.data.dogs, clients: clientsRes.data.clients };
}
