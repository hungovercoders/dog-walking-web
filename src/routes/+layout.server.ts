import { buildClerkProps } from 'svelte-clerk/server';
import { env } from '$env/dynamic/private';
import { readTimeZone, resolveLocale, todayKey } from '$lib/api';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals, cookies, request }) => {
	const tz = readTimeZone(cookies);
	const devBearer = Boolean(env.API_DEV_BEARER);
	return {
		devBearer,
		// The walker's IANA zone (from the `tz` cookie the browser sets), so the
		// server and the browser render every time and day the same way.
		tz,
		// The walker's locale, for every date and time the pages format.
		locale: resolveLocale(request.headers.get('accept-language')),
		today: todayKey(tz),
		signedIn: Boolean(locals.auth().userId),
		...(devBearer ? {} : buildClerkProps(locals.auth()))
	};
};
