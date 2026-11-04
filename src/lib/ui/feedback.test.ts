import { describe, expect, it } from 'vitest';
import { alreadyDone, errorCopy, toastFor } from './feedback';

describe('toastFor', () => {
	it('shows the success text for a redirect or plain success', () => {
		expect(toastFor({ type: 'redirect', status: 303, location: '/' }, 'Walk started')).toEqual({ kind: 'ok', text: 'Walk started' });
		expect(toastFor({ type: 'success', status: 200, data: {} }, 'Saved')).toEqual({ kind: 'ok', text: 'Saved' });
		expect(toastFor({ type: 'redirect', status: 303, location: '/' })).toBeNull();
	});
	it('prefers a server notice', () => {
		expect(toastFor({ type: 'success', status: 200, data: { notice: 'Already completed' } }, 'Walk completed')).toEqual({
			kind: 'ok',
			text: 'Already completed'
		});
	});
	it('toasts failures only when asked', () => {
		const failure = { type: 'failure' as const, status: 409, data: { message: 'A completed walk cannot be changed.' } };
		expect(toastFor(failure, 'Walk started')).toBeNull();
		expect(toastFor(failure, 'Walk started', true)).toEqual({ kind: 'error', text: 'A completed walk cannot be changed.' });
		expect(toastFor({ type: 'failure', status: 400 }, undefined, true)?.kind).toBe('error');
	});
	it('always toasts unexpected errors', () => {
		expect(toastFor({ type: 'error', status: 500, error: new Error('x') })).toEqual({
			kind: 'error',
			text: 'We couldn’t reach the server'
		});
	});
});

describe('errorCopy', () => {
	it('speaks plainly per status', () => {
		expect(errorCopy(404).title).toBe('Not found');
		expect(errorCopy(401).title).toBe('Please sign in again');
		expect(errorCopy(503).title).toBe('We couldn’t reach the server');
		expect(errorCopy(418, 'Teapot').detail).toBe('Teapot');
	});
});

describe('alreadyDone', () => {
	it('treats losing a race to the requested state as success', () => {
		expect(alreadyDone('complete', 'completed')).toBe('Already completed');
		expect(alreadyDone('start', 'in_progress')).toBe('Already started');
		expect(alreadyDone('cancel', 'cancelled')).toBe('Already cancelled');
	});
	it('keeps real refusals as errors', () => {
		expect(alreadyDone('complete', 'cancelled')).toBeNull();
		expect(alreadyDone('start', 'completed')).toBeNull();
		expect(alreadyDone('cancel', undefined)).toBeNull();
	});
});
