import type { ActionResult, SubmitFunction } from '@sveltejs/kit';
import { toasts } from './toasts.svelte';
import { toastFor, type ResultLike } from './feedback';

export interface FeedbackOptions {
	/** Toast shown when the action succeeds or redirects. */
	success?: string;
	/** Ask first; a "no" cancels the submission. */
	confirm?: string;
	/** Toast the action's failure message (for forms posting to another page). */
	toastErrors?: boolean;
	/** Reset the form after success (SvelteKit's default). */
	reset?: boolean;
	/** Called after the page has been updated with the result. */
	after?: (result: ActionResult) => void;
}

/**
 * `use:enhance={feedback({...})}`: marks the form busy and its button
 * disabled while the request is in flight (a spinner appears after 300ms so
 * fast responses don't flash), then toasts the outcome. Disabling the button
 * is what stops a double tap from sending a second Start or Complete.
 */
export function feedback(opts: FeedbackOptions = {}): SubmitFunction {
	return ({ formElement, submitter, cancel }) => {
		if (opts.confirm && !confirm(opts.confirm)) {
			cancel();
			return;
		}
		const button =
			submitter instanceof HTMLButtonElement
				? submitter
				: formElement.querySelector<HTMLButtonElement>('button:not([type="button"])');
		formElement.setAttribute('aria-busy', 'true');
		if (button) button.disabled = true;
		const spinner = setTimeout(() => button?.classList.add('pending'), 300);

		return async ({ result, update }) => {
			clearTimeout(spinner);
			const toast = toastFor(result as ResultLike, opts.success, opts.toastErrors);
			if (toast) toasts.push(toast);
			await update({ reset: opts.reset ?? true });
			formElement.removeAttribute('aria-busy');
			if (button) {
				button.disabled = false;
				button.classList.remove('pending');
			}
			opts.after?.(result);
		};
	};
}
