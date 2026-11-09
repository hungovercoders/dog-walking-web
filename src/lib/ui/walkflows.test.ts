import { describe, expect, it } from 'vitest';
import type { Client, Dog, Walk } from '$lib/api';
import { buildRoster, dogsByClient, pickupLine, shortAddress, walkParty } from './roster';
import { dayLine, daySummary, nowOrNext, restOfDay, summaryText } from './today';
import { progressNote, walkProgress } from './progress';
import { chosenDuration, defaultStart, fieldOf, sameTimeNextWeek } from './schedule';
import { applyFilter, apiStatus, parseWeekFilter, weekDays } from './week';

const alice: Client = { client_id: 'c-alice', name: 'Alice Ahmed', address: '1 Park Lane, Cardiff CF10 3AA', created_at: '2026-10-01T09:00:00Z' };
const ben: Client = { client_id: 'c-ben', name: 'Ben Brooks', created_at: '2026-10-01T09:00:00Z' };
const dogs: Dog[] = [
	{ dog_id: 'd-rex', client_id: 'c-alice', name: 'Rex', created_at: '2026-10-01T09:00:00Z' },
	{ dog_id: 'd-biscuit', client_id: 'c-alice', name: 'Biscuit', notes: 'Pulls on the lead.', created_at: '2026-10-01T09:00:00Z' },
	{ dog_id: 'd-mango', client_id: 'c-ben', name: 'Mango', created_at: '2026-10-01T09:00:00Z' }
];
const roster = buildRoster(dogs, [alice, ben]);

const walk = (id: string, at: string, status: Walk['status'], minutes = 30, dog_ids = ['d-rex']): Walk => ({
	walk_id: id,
	scheduled_at: at,
	duration_minutes: minutes,
	dog_ids,
	status,
	created_at: '2026-10-01T09:00:00Z'
});

describe('roster joins', () => {
	it('groups a walk by client in the order dogs appear, and survives removed dogs', () => {
		const party = walkParty({ dog_ids: ['d-biscuit', 'd-mango', 'd-rex', 'd-gone'] }, roster);
		expect(party.dogs.map((d) => d.name)).toEqual(['Biscuit', 'Mango', 'Rex', 'Unknown dog']);
		expect(party.clients.map((g) => [g.client.name, g.dogs.map((d) => d.name)])).toEqual([
			['Alice Ahmed', ['Biscuit', 'Rex']],
			['Ben Brooks', ['Mango']]
		]);
	});
	it('writes a pickup line for one client and for several', () => {
		expect(pickupLine(walkParty({ dog_ids: ['d-rex'] }, roster))).toBe('Alice Ahmed · 1 Park Lane');
		expect(pickupLine(walkParty({ dog_ids: ['d-mango'] }, roster))).toBe('Ben Brooks');
		expect(pickupLine(walkParty({ dog_ids: ['d-rex', 'd-mango'] }, roster))).toBe('Alice Ahmed, Ben Brooks');
		expect(pickupLine(walkParty({ dog_ids: ['d-gone'] }, roster))).toBeUndefined();
		expect(shortAddress(undefined)).toBeUndefined();
	});
	it('orders the picker by client then dog, A-Z', () => {
		expect(dogsByClient(roster).map((g) => [g.client?.name, g.dogs.map((d) => d.name)])).toEqual([
			['Alice Ahmed', ['Biscuit', 'Rex']],
			['Ben Brooks', ['Mango']]
		]);
	});
});

describe('today', () => {
	const day = [
		walk('a', '2026-10-22T06:30:00Z', 'completed', 30),
		walk('b', '2026-10-22T08:00:00Z', 'in_progress', 45),
		walk('c', '2026-10-22T12:30:00Z', 'scheduled', 60),
		walk('d', '2026-10-22T16:00:00Z', 'cancelled', 30),
		walk('e', '2026-10-22T07:00:00Z', 'scheduled', 45)
	];
	it('counts the day, leaving cancelled walks out of the totals', () => {
		const s = daySummary(day);
		expect(s).toEqual({ planned: 4, done: 1, cancelled: 1, minutesPlanned: 180, minutesDone: 30 });
		expect(summaryText(s)).toBe('1 of 4 walks done · 30 of 180 min · 1 cancelled');
	});
	it('puts the walk in progress first, else the earliest scheduled', () => {
		expect(nowOrNext(day)?.walk_id).toBe('b');
		expect(nowOrNext(day.filter((w) => w.status !== 'in_progress'))?.walk_id).toBe('e');
		expect(nowOrNext([walk('x', '2026-10-22T06:30:00Z', 'completed')])).toBeUndefined();
	});
	it('lists the rest as a checklist: open by time, then done, then cancelled', () => {
		expect(restOfDay(day, nowOrNext(day)).map((w) => w.walk_id)).toEqual(['e', 'c', 'a', 'd']);
	});
	it('summarises a day header', () => {
		expect(dayLine([walk('a', '2026-10-23T08:00:00Z', 'scheduled', 45), walk('b', '2026-10-23T13:00:00Z', 'scheduled', 90)])).toBe('2 walks · 2h 15m');
		expect(dayLine([])).toBe('No walks');
		expect(dayLine([walk('a', '2026-10-23T08:00:00Z', 'cancelled')])).toBe('1 cancelled');
	});
});

describe('walk progress', () => {
	const start = '2026-10-22T08:00:00Z';
	it('tracks elapsed against planned', () => {
		const p = walkProgress(start, 45, Date.parse('2026-10-22T08:30:00Z'));
		expect(p.elapsedMs).toBe(30 * 60_000);
		expect(p.fraction).toBeCloseTo(2 / 3);
		expect(p.over).toBe(false);
		expect(progressNote(p)).toBe('15 min left');
	});
	it('reports an overrun and caps the bar', () => {
		const p = walkProgress(start, 45, Date.parse('2026-10-22T08:57:00Z'));
		expect(p.over).toBe(true);
		expect(p.fraction).toBe(1);
		expect(progressNote(p)).toBe('12 min over');
		expect(progressNote(walkProgress(start, 30, Date.parse('2026-10-22T10:05:00Z')))).toBe('1h 35m over');
	});
	it('never goes negative for a clock skew', () => {
		expect(walkProgress(start, 45, Date.parse('2026-10-22T07:59:00Z')).elapsedMs).toBe(0);
	});
});

describe('schedule defaults', () => {
	it('defaults to the next half hour in the walker zone, or 09:00 on a chosen day', () => {
		expect(defaultStart(Date.parse('2026-10-22T08:10:00Z'), 'Europe/London')).toBe('2026-10-22T09:30');
		expect(defaultStart(Date.parse('2026-10-22T08:30:00Z'), 'Europe/London')).toBe('2026-10-22T10:00');
		expect(defaultStart(Date.parse('2026-10-22T08:10:00Z'), 'Europe/London', '2026-10-24')).toBe('2026-10-24T09:00');
		// Today's 09:00 has passed by 14:30: today means the next half hour.
		expect(defaultStart(Date.parse('2026-10-22T13:30:00Z'), 'Europe/London', '2026-10-22')).toBe('2026-10-22T15:00');
	});
	it('books again at the same wall-clock time across a DST change', () => {
		// 09:00 BST on 22 Oct; clocks go back on 25 Oct; next week is 09:00 GMT.
		expect(sameTimeNextWeek('2026-10-22T08:00:00Z', 'Europe/London')).toBe('2026-10-29T09:00');
	});
	it('reads the duration chips', () => {
		expect(chosenDuration('45', undefined)).toBe(45);
		expect(chosenDuration('other', '75')).toBe(75);
		expect(chosenDuration('other', '7.5')).toBeNaN();
	});
	it('maps API messages to fields', () => {
		expect(fieldOf('duration_minutes: must be at least 1')).toBe('duration_minutes');
		expect(fieldOf('dog_ids.0: each dog_id must be a uuid')).toBe('dog_ids');
		expect(fieldOf('every dog_id must be one of your dogs')).toBeUndefined();
	});
});

describe('week view', () => {
	const walks = [
		walk('a', '2026-10-22T08:00:00Z', 'scheduled'),
		walk('b', '2026-10-22T12:00:00Z', 'in_progress'),
		walk('c', '2026-10-23T08:00:00Z', 'completed'),
		walk('d', '2026-10-24T08:00:00Z', 'cancelled')
	];
	it('lists all seven days, empty ones included', () => {
		const days = weekDays('2026-10-19', walks, 'Europe/London');
		expect(days.map((d) => d.day)).toEqual(['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25']);
		expect(days.map((d) => d.walks.length)).toEqual([0, 0, 0, 2, 1, 1, 0]);
	});
	it('filters open, done and cancelled', () => {
		expect(applyFilter(walks, 'open').map((w) => w.walk_id)).toEqual(['a', 'b']);
		expect(applyFilter(walks, 'completed').map((w) => w.walk_id)).toEqual(['c']);
		expect(applyFilter(walks, '').length).toBe(4);
		expect(apiStatus('open')).toBeUndefined();
		expect(apiStatus('cancelled')).toBe('cancelled');
		expect(parseWeekFilter('nonsense')).toBe('');
	});
});
