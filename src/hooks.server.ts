import { redirect, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { withClerkHandler } from 'svelte-clerk/server';
import { env } from '$env/dynamic/private';
import { resolveLocale } from '$lib/api';

/** Routes a signed-out visitor may see. Everything else needs a session. */
const PUBLIC_ROUTES = [/^\/sign-in(\/|$)/, /^\/sign-up(\/|$)/];

// Built once: the handler carries Clerk's options and clients.
const clerkHandle = withClerkHandler();

const clerk: Handle = ({ event, resolve }) => {
	if (env.API_DEV_BEARER) {
		// Local development against an API in test auth mode: no Clerk at all.
		// The literal bearer is sent to the API; locals.auth() reports a fake
		// signed-in session so the pages render.
		event.locals.auth = (() => ({
			userId: env.API_DEV_BEARER!.replace(/^test:/, ''),
			sessionId: 'dev',
			getToken: async () => env.API_DEV_BEARER!
		})) as unknown as App.Locals['auth'];
		return resolve(event);
	}
	return clerkHandle({ event, resolve });
};

const guard: Handle = ({ event, resolve }) => {
	const isPublic = PUBLIC_ROUTES.some((re) => re.test(event.url.pathname));
	if (isPublic && env.API_DEV_BEARER) {
		// Clerk's components are not mounted in dev-bearer mode; there is
		// nothing to sign in to.
		redirect(303, '/');
	}
	if (!isPublic && !event.locals.auth().userId) {
		const next = encodeURIComponent(event.url.pathname + event.url.search);
		redirect(303, `/sign-in?redirect_url=${next}`);
	}
	return resolve(event);
};

/** `<html lang>` per request from Accept-Language (en-GB when absent): the
 * document language screen readers pronounce and browsers spell-check in.
 * Native date and time inputs are not driven by it - browsers format those
 * in their own (operating-system) locale - so every date the app writes
 * itself goes through `Intl` with the same resolved locale. */
const lang: Handle = ({ event, resolve }) => {
	const locale = resolveLocale(event.request.headers.get('accept-language'));
	return resolve(event, { transformPageChunk: ({ html }) => html.replace('%lang%', locale) });
};

export const handle = sequence(lang, clerk, guard);
