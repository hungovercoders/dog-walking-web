/** The error body every API operation returns on 4xx (schema `Problem`). */
export interface Problem {
	error_code: string;
	message: string;
}

export function isProblem(value: unknown): value is Problem {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof (value as Problem).error_code === 'string' &&
		typeof (value as Problem).message === 'string'
	);
}

/**
 * Turn whatever openapi-fetch handed back as `error` into one line a walker
 * can act on. The contract's `message` is already human-readable, so it is
 * used as written; anything else (network failure, HTML from a proxy, an
 * empty body) falls back to a generic line that still names the status.
 */
export function describeProblem(error: unknown, status?: number): string {
	if (isProblem(error)) return error.message;
	if (status === 401) return 'Your session has expired. Sign in again.';
	if (status === 404) return 'That record no longer exists.';
	if (status === 409) return 'That change is no longer possible.';
	if (status !== undefined && status >= 500) return 'The service is having trouble. Try again shortly.';
	return 'Something went wrong. Try again.';
}
