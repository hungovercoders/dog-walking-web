import { describe, expect, it } from 'vitest';
import { describeProblem, isProblem } from './problem';

describe('isProblem', () => {
	it('recognises the contract shape and nothing else', () => {
		expect(isProblem({ error_code: 'walk_not_found', message: 'No walk' })).toBe(true);
		expect(isProblem({ message: 'No walk' })).toBe(false);
		expect(isProblem('nope')).toBe(false);
		expect(isProblem(null)).toBe(false);
	});
});

describe('describeProblem', () => {
	it("uses the contract's message as written", () => {
		expect(describeProblem({ error_code: 'invalid_walk', message: 'Pick at least one dog' }, 400)).toBe(
			'Pick at least one dog'
		);
	});
	it('falls back by status when the body is not a Problem', () => {
		expect(describeProblem(undefined, 401)).toMatch(/sign in/i);
		expect(describeProblem('<html>', 404)).toMatch(/no longer exists/);
		expect(describeProblem(null, 409)).toMatch(/no longer possible/);
		expect(describeProblem(null, 502)).toMatch(/trouble/);
		expect(describeProblem(null)).toMatch(/went wrong/);
	});
});
