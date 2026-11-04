import { error, fail } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { createClientsApi, createWalksApi, describeProblem } from '$lib/api';

/**
 * Per-request API access, one typed client per service. The token is the walker's Clerk session token,
 * or the literal `API_DEV_BEARER` when developing against an API in test
 * auth mode. `fetch` is SvelteKit's, so server-side calls are traced and
 * relative URLs would resolve.
 */
export async function api(event: RequestEvent) {
	// One URL for both services (the API worker serves both), or one each:
	// the spec repo's Microcks mocks serve every service at its own path.
	const clientsUrl = env.API_CLIENTS_URL || env.API_BASE_URL;
	const walksUrl = env.API_WALKS_URL || env.API_BASE_URL;
	if (!clientsUrl || !walksUrl) error(500, 'API_BASE_URL (or API_CLIENTS_URL and API_WALKS_URL) is not configured');
	// Truthiness, as in hooks.server.ts: an empty API_DEV_BEARER means off.
	const token = env.API_DEV_BEARER || (await event.locals.auth().getToken());
	if (!token) error(401, 'No session');
	return {
		clients: createClientsApi(clientsUrl, token, apiFetch(event, clientsUrl)),
		walks: createWalksApi(walksUrl, token, apiFetch(event, walksUrl))
	};
}

/**
 * How a request reaches the API. On Cloudflare, one Worker cannot call another
 * on the same workers.dev zone with plain `fetch` (the edge answers 404), so the
 * deployed app goes through the `API` service binding declared in
 * wrangler.jsonc. Locally there is no binding: the API or the mocks run on
 * localhost and ordinary fetch reaches them.
 */
function apiFetch(event: RequestEvent, baseUrl: string): typeof fetch {
	const binding = event.platform?.env?.API;
	if (dev || !binding || isLocal(baseUrl)) return event.fetch;
	return (input, init) => binding.fetch(input, init);
}

function isLocal(url: string): boolean {
	const host = new URL(url).hostname;
	return host === 'localhost' || host === '127.0.0.1';
}

/** Throw a SvelteKit error for a failed load, with the contract's message. */
export function loadError(status: number, body: unknown): never {
	error(status, describeProblem(body, status));
}

/** Return a form `fail()` carrying the contract's message and the submitted values. */
export function actionFail(status: number, body: unknown, values: Record<string, unknown> = {}) {
	return fail(status >= 400 && status < 600 ? status : 500, {
		message: describeProblem(body, status),
		values
	});
}

export function str(data: FormData, key: string): string | undefined {
	const v = data.get(key);
	if (typeof v !== 'string') return undefined;
	const trimmed = v.trim();
	return trimmed === '' ? undefined : trimmed;
}

/** A field for a PATCH body: undefined when the form did not send it (left
 * unchanged), "" when it was emptied (the API clears it), else trimmed. */
export function patchField(data: FormData, key: string): string | undefined {
	const v = data.get(key);
	return typeof v === 'string' ? v.trim() : undefined;
}
