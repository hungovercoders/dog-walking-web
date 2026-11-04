/** The same-origin path a `redirect_to` value points at, or null.
 *
 * Resolved the way a browser resolves a Location header, so every trick
 * that turns a "path" into another host (`//host`, `/\\host`, tabs and
 * newlines the URL parser strips, absolute and `javascript:` URLs) ends up
 * with a different origin and is refused. */
export function safeRedirectPath(back: string | null | undefined, base: URL): string | null {
	if (!back) return null;
	let target: URL;
	try {
		target = new URL(back, base);
	} catch {
		return null;
	}
	return target.origin === base.origin ? target.pathname + target.search : null;
}
