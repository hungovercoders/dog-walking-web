/// <reference types="svelte-clerk/env" />
/// <reference types="@cloudflare/workers-types" />

// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {} - svelte-clerk/env declares `auth`
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env?: {
				/** Service binding to dog-walking-api (wrangler.jsonc); absent locally. */
				API?: Fetcher;
				API_BASE_URL?: string;
				API_CLIENTS_URL?: string;
				API_WALKS_URL?: string;
				API_DEV_BEARER?: string;
				CLERK_SECRET_KEY?: string;
				PUBLIC_CLERK_PUBLISHABLE_KEY?: string;
			};
		}
	}
}

export {};
