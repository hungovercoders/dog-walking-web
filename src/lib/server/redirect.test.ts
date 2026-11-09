import { describe, expect, it } from 'vitest';
import { safeRedirectPath } from './redirect';

const base = new URL('https://walks.example/walks/abc?/start');

describe('safeRedirectPath', () => {
	it('keeps same-origin paths', () => {
		expect(safeRedirectPath('/walks', base)).toBe('/walks');
		expect(safeRedirectPath('/walks?status=scheduled', base)).toBe('/walks?status=scheduled');
		expect(safeRedirectPath('/', base)).toBe('/');
	});
	it('refuses anything that resolves to another origin', () => {
		for (const back of ['//evil.example', '/\\evil.example', '/\t/evil.example', '/\n/evil.example', 'https://evil.example', 'javascript:alert(1)']) {
			expect(safeRedirectPath(back, base), JSON.stringify(back)).toBeNull();
		}
	});
	it('refuses nothing to go back to', () => {
		expect(safeRedirectPath('', base)).toBeNull();
		expect(safeRedirectPath(null, base)).toBeNull();
	});
});
