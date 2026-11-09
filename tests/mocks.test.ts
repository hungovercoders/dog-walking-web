/**
 * The consumer's contract check: the generated clients against the pinned
 * Microcks REST mocks (`task -d .contracts/<service> mocks:load SERVICE=...`).
 * Runs only when MOCKS_BASE_URL points at the stack, e.g.
 * MOCKS_BASE_URL=http://localhost:8585/rest npx vitest run tests
 * (the CI `mocks` job does exactly this).
 */
import { describe, expect, it } from 'vitest';
import { createClientsApi } from '../src/lib/api/clients';
import { createWalksApi } from '../src/lib/api/walks';

const base = process.env.MOCKS_BASE_URL;
const clientsBase = `${base}/Clients+API/1.0.0`;
const walksBase = `${base}/Walks+API/1.0.0`;

// Fixture ids from the spec repo's mocks/*.rest.examples.yaml
const ALICE = '11111111-1111-4111-8111-111111111111';
const BISCUIT = '22222222-2222-4222-8222-222222222222';
const REX = '88888888-8888-4888-8888-888888888888';
const WALK = '33333333-3333-4333-8333-333333333333';
const MISSING = '99999999-9999-4999-8999-999999999999';

describe.skipIf(!base)('generated clients against the pinned mocks', () => {
	const clients = createClientsApi(clientsBase, 'mock');
	const walks = createWalksApi(walksBase, 'mock');

	it('lists and fetches clients through the typed client', async () => {
		const list = await clients.GET('/clients');
		expect(list.response.status).toBe(200);
		expect(list.data?.clients.some((c) => c.client_id === ALICE)).toBe(true);

		const one = await clients.GET('/clients/{client_id}', { params: { path: { client_id: ALICE } } });
		expect(one.data?.name).toBe('Alice Ahmed');
	});

	it('surfaces a Problem for an unknown client', async () => {
		const res = await clients.GET('/clients/{client_id}', { params: { path: { client_id: MISSING } } });
		expect(res.response.status).toBe(404);
		expect(res.error?.error_code).toBe('client_not_found');
	});

	it('fetches dogs and walks with their relationships intact', async () => {
		const dog = await clients.GET('/dogs/{dog_id}', { params: { path: { dog_id: BISCUIT } } });
		expect(dog.data?.client_id).toBe(ALICE);

		const walk = await walks.GET('/walks/{walk_id}', { params: { path: { walk_id: WALK } } });
		expect(walk.data?.status).toBe('scheduled');
		expect(walk.data?.dog_ids).toContain(BISCUIT);
	});

	it('lists every dog and the week of walks the screens render', async () => {
		const dogs = await clients.GET('/dogs');
		expect(dogs.response.status).toBe(200);
		expect(dogs.data?.dogs.map((d) => d.dog_id)).toEqual(expect.arrayContaining([BISCUIT, REX]));

		const list = await walks.GET('/walks');
		expect(list.response.status).toBe(200);
		expect(list.data?.walks.some((w) => w.walk_id === WALK)).toBe(true);
	});

	it('schedules a walk and reads the contract shape back', async () => {
		const res = await walks.POST('/walks', {
			body: { scheduled_at: '2026-11-02T09:00:00Z', duration_minutes: 45, dog_ids: [BISCUIT], notes: 'Meet at the park gate' }
		});
		expect(res.response.status).toBe(201);
		expect(res.data?.walk_id).toBeDefined();
		expect(res.data?.status).toBe('scheduled');
	});
});
