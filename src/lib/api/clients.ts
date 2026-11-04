import createClient from 'openapi-fetch';
import type { paths as ClientsPaths, components as ClientsComponents } from './generated/clients';

export type Client = ClientsComponents['schemas']['Client'];
export type Dog = ClientsComponents['schemas']['Dog'];
export type CreateClientRequest = ClientsComponents['schemas']['CreateClientRequest'];
export type UpdateClientRequest = ClientsComponents['schemas']['UpdateClientRequest'];
export type CreateDogRequest = ClientsComponents['schemas']['CreateDogRequest'];
export type UpdateDogRequest = ClientsComponents['schemas']['UpdateDogRequest'];

export type ClientsApi = ReturnType<typeof createClientsApi>;

/**
 * A typed client for the Clients API (clients/v1.0.0). Every call carries the
 * walker's bearer token; the API scopes every record to that walker.
 */
export function createClientsApi(baseUrl: string, token: string, fetchImpl: typeof fetch = fetch) {
	return createClient<ClientsPaths>({
		baseUrl,
		fetch: fetchImpl,
		headers: { Authorization: `Bearer ${token}` }
	});
}
