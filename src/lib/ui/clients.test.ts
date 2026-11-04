import { describe, expect, it } from 'vitest';
import { countLine, dialable, filterRoster, firstLine, mapsUrl, removeClientPrompt, resultsLabel, rosterCounts } from './clients';

const roster = [
	{ client_id: 'c1', name: 'Alice Ahmed', dogs: [{ dog_id: 'd1', name: 'Biscuit' }, { dog_id: 'd2', name: 'Rex' }] },
	{ client_id: 'c2', name: 'Ben Brooks', dogs: [{ dog_id: 'd3', name: 'Mango' }] },
	{ client_id: 'c3', name: 'Chloe Davies', dogs: [] }
];

describe('filterRoster', () => {
	it('keeps everyone for an empty or blank query', () => {
		expect(filterRoster(roster, '')).toHaveLength(3);
		expect(filterRoster(roster, '   ')).toHaveLength(3);
	});
	it('matches client names, case-insensitively and trimmed', () => {
		expect(filterRoster(roster, '  aLiCe ').map((c) => c.client_id)).toEqual(['c1']);
	});
	it('matches dog names', () => {
		expect(filterRoster(roster, 'mango').map((c) => c.client_id)).toEqual(['c2']);
		expect(filterRoster(roster, 'R').map((c) => c.client_id)).toEqual(['c1', 'c2']);
	});
	it('returns nothing when nothing matches', () => {
		expect(filterRoster(roster, 'zebra')).toEqual([]);
	});
});

describe('counts and labels', () => {
	it('counts clients and dogs', () => {
		expect(rosterCounts(roster)).toEqual({ clients: 3, dogs: 3 });
		expect(countLine(rosterCounts(roster))).toBe('3 clients · 3 dogs');
		expect(countLine({ clients: 1, dogs: 1 })).toBe('1 client · 1 dog');
		expect(countLine({ clients: 0, dogs: 0 })).toBe('0 clients · 0 dogs');
	});
	it('labels search results', () => {
		expect(resultsLabel(1)).toBe('1 result');
		expect(resultsLabel(3)).toBe('3 results');
		expect(resultsLabel(0)).toBe('0 results');
	});
	it('names what goes when a client is removed', () => {
		expect(removeClientPrompt('Alice Ahmed', 2)).toBe('Remove Alice Ahmed and their 2 dogs?');
		expect(removeClientPrompt('Ben Brooks', 1)).toBe('Remove Ben Brooks and their 1 dog?');
		expect(removeClientPrompt('Chloe Davies', 0)).toBe('Remove Chloe Davies?');
	});
});

describe('contact helpers', () => {
	it('takes the first non-empty line of a note', () => {
		expect(firstLine('\n  Pulls on the lead.\nLoves squirrels')).toBe('Pulls on the lead.');
		expect(firstLine(undefined)).toBe('');
	});
	it('makes numbers dialable and addresses mappable', () => {
		expect(dialable('+44 7700 900001')).toBe('+447700900001');
		expect(dialable('07700 900-001')).toBe('07700900001');
		expect(mapsUrl('1 Park Lane, Cardiff')).toBe('https://www.google.com/maps/search/?api=1&query=1%20Park%20Lane%2C%20Cardiff');
	});
});
