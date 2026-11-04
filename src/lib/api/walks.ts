import createClient from 'openapi-fetch';
import type { paths as WalksPaths, components as WalksComponents } from './generated/walks';

export type Walk = WalksComponents['schemas']['Walk'];
export type WalkStatus = Walk['status'];
export type CancellationReason = NonNullable<Walk['cancellation_reason']>;
export type ScheduleWalkRequest = WalksComponents['schemas']['ScheduleWalkRequest'];
export type UpdateWalkRequest = WalksComponents['schemas']['UpdateWalkRequest'];

export const WALK_STATUSES: readonly WalkStatus[] = ['scheduled', 'in_progress', 'completed', 'cancelled'];

/** The closed vocabulary the contract declares, with the walker-facing label. */
export const CANCELLATION_REASONS: readonly { value: CancellationReason; label: string }[] = [
	{ value: 'client_request', label: 'Client asked to cancel' },
	{ value: 'walker_unavailable', label: 'I can’t make it' },
	{ value: 'bad_weather', label: 'Bad weather' },
	{ value: 'dog_unwell', label: 'A dog is unwell' }
];

export type WalksApi = ReturnType<typeof createWalksApi>;

/**
 * A typed client for the Walks API (walks/v1.0.0). Every call carries the
 * walker's bearer token; the API scopes every walk to that walker.
 */
export function createWalksApi(baseUrl: string, token: string, fetchImpl: typeof fetch = fetch) {
	return createClient<WalksPaths>({
		baseUrl,
		fetch: fetchImpl,
		headers: { Authorization: `Bearer ${token}` }
	});
}
