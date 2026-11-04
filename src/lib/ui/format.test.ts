import { describe, expect, it } from 'vitest';
import { AVATAR_COLOURS, avatarColour, initials, joinMeta } from './format';

describe('joinMeta', () => {
	it('puts a spaced dot between parts', () => {
		expect(joinMeta('45 min', 'Meet at the park gate.')).toBe('45 min · Meet at the park gate.');
	});
	it('drops empty parts', () => {
		expect(joinMeta('45 min', undefined, '', null, false)).toBe('45 min');
		expect(joinMeta(undefined)).toBe('');
	});
});

describe('initials', () => {
	it('takes one letter for one word and first and last for more', () => {
		expect(initials('Biscuit')).toBe('B');
		expect(initials('Alice Ahmed')).toBe('AA');
		expect(initials('  mary  jo  smith ')).toBe('MS');
		expect(initials('')).toBe('?');
	});
});

describe('avatarColour', () => {
	it('is stable per id and drawn from the palette', () => {
		const id = '22222222-2222-4222-8222-222222222222';
		expect(avatarColour(id)).toBe(avatarColour(id));
		expect(AVATAR_COLOURS).toContain(avatarColour(id));
	});
});
