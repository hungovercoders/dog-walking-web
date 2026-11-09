/** Pure feedback rules: what a form result says to the walker, and what an error page says. */

export type ToastKind = 'ok' | 'error';
export interface ToastMessage {
	kind: ToastKind;
	text: string;
}

/** The subset of SvelteKit's ActionResult these rules read. */
export type ResultLike =
	| { type: 'success'; status: number; data?: Record<string, unknown> }
	| { type: 'failure'; status: number; data?: Record<string, unknown> }
	| { type: 'redirect'; status: number; location: string }
	| { type: 'error'; status?: number; error: unknown };

/**
 * The toast for a finished form submission, or null for none.
 * - a redirect or plain success shows `success` when the form named one;
 * - a success that carries a `notice` (e.g. "Already completed") shows it;
 * - a failure shows the contract's message only when `toastErrors` is set
 *   (forms on the page they post to show it inline instead);
 * - an unexpected error always shows.
 */
export function toastFor(result: ResultLike, success?: string, toastErrors = false): ToastMessage | null {
	switch (result.type) {
		case 'redirect':
			return success ? { kind: 'ok', text: success } : null;
		case 'success': {
			const notice = result.data?.notice;
			if (typeof notice === 'string' && notice) return { kind: 'ok', text: notice };
			return success ? { kind: 'ok', text: success } : null;
		}
		case 'failure': {
			if (!toastErrors) return null;
			const message = result.data?.message;
			return { kind: 'error', text: typeof message === 'string' && message ? message : 'That didn’t work. Try again.' };
		}
		case 'error':
			return { kind: 'error', text: errorCopy(result.status ?? 500).title };
	}
}

/** Title and explanation for an error page, by HTTP status. `signedIn` is
 * whether the walker still has a session here: a 401 or 403 with one means
 * the API refused a session this app accepts, and signing in again from the
 * same session cannot fix that. */
export function errorCopy(status: number, message?: string, signedIn = false): { title: string; detail: string } {
	if (status === 404) return { title: 'Not found', detail: 'That page or record no longer exists.' };
	if ((status === 401 || status === 403) && signedIn) {
		return {
			title: 'Your sign-in wasn’t accepted',
			detail: 'You are signed in, but the walks service refused your session. Sign out and sign in again; if this keeps happening, the service needs setting up for this site.'
		};
	}
	if (status === 401 || status === 403) return { title: 'Please sign in again', detail: 'Your session has ended.' };
	if (status >= 500) return { title: 'We couldn’t reach the server', detail: 'Check your connection and try again in a moment.' };
	return { title: 'Something went wrong', detail: message || 'Try again.' };
}

/**
 * A lifecycle action that lost a race to the very state it asked for (a
 * double tap: the first Complete landed, the second got 409) succeeded as
 * far as the walker is concerned. Returns the notice to show, or null when
 * the 409 is a real refusal.
 */
export function alreadyDone(action: 'start' | 'complete' | 'cancel', currentStatus: string | undefined): string | null {
	if (action === 'start' && currentStatus === 'in_progress') return 'Already started';
	if (action === 'complete' && currentStatus === 'completed') return 'Already completed';
	if (action === 'cancel' && currentStatus === 'cancelled') return 'Already cancelled';
	return null;
}
