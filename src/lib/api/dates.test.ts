import { describe, expect, it } from 'vitest';
import { dayWindow, formatAge, formatBirthDate, formatClock, formatDuration, formatShortDay, formatTime, formatWeekRange, groupByDay, isoToZonedLocal, localDayKey, parseDayKey, readTimeZone, resolveLocale, shiftDay, uses24h, weekBounds, weekStartKey, zonedLocalToIso } from './dates';

describe('localDayKey', () => {
	it('places an instant on its local calendar day', () => {
		expect(localDayKey('2026-11-02T23:30:00Z', 'UTC')).toBe('2026-11-02');
		expect(localDayKey('2026-11-02T23:30:00Z', 'Europe/London')).toBe('2026-11-02');
		expect(localDayKey('2026-11-02T23:30:00Z', 'Asia/Tokyo')).toBe('2026-11-03');
	});
});

describe('groupByDay', () => {
	it('groups walks by day, ascending within and across days', () => {
		const groups = groupByDay(
			[
				{ walk_id: 'b', scheduled_at: '2026-11-03T09:00:00Z' },
				{ walk_id: 'c', scheduled_at: '2026-11-02T15:00:00Z' },
				{ walk_id: 'a', scheduled_at: '2026-11-02T09:00:00Z' }
			],
			'UTC'
		);
		expect(groups.map((g) => g.day)).toEqual(['2026-11-02', '2026-11-03']);
		expect(groups[0].items.map((w) => w.walk_id)).toEqual(['a', 'c']);
		expect(groups[1].items.map((w) => w.walk_id)).toEqual(['b']);
	});
	it('returns nothing for no walks', () => {
		expect(groupByDay([])).toEqual([]);
	});
});

describe('weekBounds', () => {
	it('spans Monday to the following Monday around the given day', () => {
		// 2026-11-05 is a Thursday
		expect(weekBounds('2026-11-05')).toEqual({ from: '2026-11-02T00:00:00.000Z', to: '2026-11-09T00:00:00.000Z' });
		// a Monday is its own week start; a Sunday belongs to the week before
		expect(weekBounds('2026-11-02').from).toBe('2026-11-02T00:00:00.000Z');
		expect(weekBounds('2026-11-08').from).toBe('2026-11-02T00:00:00.000Z');
	});
});

describe('shiftDay', () => {
	it('moves across month ends', () => {
		expect(shiftDay('2026-10-30', 7)).toBe('2026-11-06');
		expect(shiftDay('2026-11-02', -7)).toBe('2026-10-26');
	});
});

describe('zonedLocalToIso', () => {
	it('reads the wall clock in the walker\'s zone, not the server\'s', () => {
		// BST: London is UTC+1 in July
		expect(zonedLocalToIso('2026-07-06T09:00', 'Europe/London')).toBe('2026-07-06T08:00:00.000Z');
		// GMT: London is UTC+0 in November
		expect(zonedLocalToIso('2026-11-02T09:00', 'Europe/London')).toBe('2026-11-02T09:00:00.000Z');
		expect(zonedLocalToIso('2026-11-03T08:30', 'Asia/Tokyo')).toBe('2026-11-02T23:30:00.000Z');
		expect(zonedLocalToIso('2026-11-02T09:00', 'UTC')).toBe('2026-11-02T09:00:00.000Z');
	});
	it('handles the hour after a DST change', () => {
		// Clocks went back at 02:00 BST on 2026-10-25; 01:30 is ambiguous, 03:00 is plainly GMT.
		expect(zonedLocalToIso('2026-10-25T03:00', 'Europe/London')).toBe('2026-10-25T03:00:00.000Z');
		// Clocks went forward at 01:00 GMT on 2026-03-29; 03:00 is plainly BST.
		expect(zonedLocalToIso('2026-03-29T03:00', 'Europe/London')).toBe('2026-03-29T02:00:00.000Z');
	});
	it('returns null for anything that is not a date-time', () => {
		expect(zonedLocalToIso('next-tuesday', 'Europe/London')).toBeNull();
		expect(zonedLocalToIso('2026-13-45T09:00', 'Europe/London')).toBeNull();
		expect(zonedLocalToIso('', 'UTC')).toBeNull();
		expect(zonedLocalToIso('2026-11-02T09:00', 'Mars/Olympus_Mons')).toBeNull();
	});
});

describe('isoToZonedLocal', () => {
	it('round-trips through the walker\'s zone', () => {
		for (const tz of ['Europe/London', 'Asia/Tokyo', 'America/Los_Angeles', 'UTC']) {
			const iso = '2026-07-06T08:00:00.000Z';
			expect(zonedLocalToIso(isoToZonedLocal(iso, tz), tz)).toBe(iso);
		}
		expect(isoToZonedLocal('2026-11-02T23:30:00.000Z', 'Asia/Tokyo')).toBe('2026-11-03T08:30');
	});
});

describe('weekBounds and dayWindow in a zone', () => {
	it('start at local midnight', () => {
		expect(weekBounds('2026-07-09', 'Europe/London')).toEqual({ from: '2026-07-05T23:00:00.000Z', to: '2026-07-12T23:00:00.000Z' });
		expect(dayWindow('2026-11-03', 7, 'Asia/Tokyo')).toEqual({ from: '2026-11-02T15:00:00.000Z', to: '2026-11-09T15:00:00.000Z' });
	});
});

describe('readTimeZone', () => {
	const cookies = (tz?: string) => ({ get: () => tz });
	it('accepts a known zone and falls back to UTC otherwise', () => {
		expect(readTimeZone(cookies('Europe/London'))).toBe('Europe/London');
		expect(readTimeZone(cookies('Mars/Olympus_Mons'))).toBe('UTC');
		expect(readTimeZone(cookies(undefined))).toBe('UTC');
	});
	it('accepts the aliases browsers report, not only canonical ICU names', () => {
		expect(readTimeZone(cookies('Asia/Kolkata'))).toBe('Asia/Kolkata');
		expect(readTimeZone(cookies('Europe/Kyiv'))).toBe('Europe/Kyiv');
		expect(readTimeZone(cookies('Asia/Calcutta'))).toBe('Asia/Calcutta');
		expect(readTimeZone(cookies('Not/AZone'))).toBe('UTC');
	});
});

describe('parseDayKey and weekStartKey', () => {
	it('accepts real days only', () => {
		expect(parseDayKey('2026-11-05')).toBe('2026-11-05');
		expect(parseDayKey('2026-13-01')).toBeNull();
		expect(parseDayKey('2026-02-30')).toBeNull();
		expect(parseDayKey('next-week')).toBeNull();
		expect(parseDayKey(null)).toBeNull();
	});
	it('finds the Monday of the week', () => {
		expect(weekStartKey('2026-11-05')).toBe('2026-11-02');
		expect(weekStartKey('2026-11-02')).toBe('2026-11-02');
		expect(weekStartKey('2026-11-08')).toBe('2026-11-02');
	});
});

describe('resolveLocale', () => {
	it('takes the highest-quality recognised tag', () => {
		expect(resolveLocale('en-US,en;q=0.9')).toBe('en-US');
		expect(resolveLocale('fr;q=0.5, cy-GB;q=0.9')).toBe('cy-GB');
	});
	it('reads a bare "en" as British English and falls back when empty or junk', () => {
		expect(resolveLocale('en')).toBe('en-GB');
		expect(resolveLocale(null)).toBe('en-GB');
		expect(resolveLocale('*')).toBe('en-GB');
		expect(resolveLocale('not a tag!!')).toBe('en-GB');
	});
});

describe('formatTime', () => {
	const iso = '2026-10-22T08:05:00Z';
	it('uses a 24-hour clock with a leading zero where the locale does', () => {
		expect(uses24h('en-GB')).toBe(true);
		expect(formatTime(iso, 'en-GB', 'Europe/London')).toBe('09:05');
	});
	it('keeps 12-hour locales on a 12-hour clock', () => {
		expect(uses24h('en-US')).toBe(false);
		expect(formatTime(iso, 'en-US', 'Europe/London')).toMatch(/^9:05\s?AM$/);
	});
});

describe('formatAge', () => {
	it('gives years, months, weeks', () => {
		expect(formatAge('2019-09-02', '2026-10-22')).toBe('7 yrs');
		expect(formatAge('2025-10-22', '2026-10-22')).toBe('1 yr');
		expect(formatAge('2026-05-14', '2026-10-22')).toBe('5 mos');
		expect(formatAge('2026-10-01', '2026-10-22')).toBe('3 wks');
		expect(formatAge('2026-10-20', '2026-10-22')).toBe('newborn');
	});
	it('handles a birthday today and 29 February', () => {
		expect(formatAge('2020-10-22', '2026-10-22')).toBe('6 yrs');
		expect(formatAge('2026-02-28', '2027-02-27')).toBe('11 mos');
		expect(formatAge('2024-02-29', '2025-02-28')).toBe('11 mos');
		expect(formatAge('2024-02-29', '2025-03-01')).toBe('1 yr');
	});
});

describe('formatDuration, formatClock, formatWeekRange, formatBirthDate, formatShortDay', () => {
	it('formats durations', () => {
		expect(formatDuration(45)).toBe('45 min');
		expect(formatDuration(60)).toBe('1h');
		expect(formatDuration(135)).toBe('2h 15m');
	});
	it('formats elapsed time as a clock', () => {
		expect(formatClock(245_000)).toBe('4:05');
		expect(formatClock(1_930_000)).toBe('32:10');
		expect(formatClock(3_730_000)).toBe('1:02:10');
		expect(formatClock(-5)).toBe('0:00');
	});
	it('formats week ranges within and across months and years', () => {
		expect(formatWeekRange('2026-10-19', 'en-GB')).toMatch(/^19\s?–\s?25 Oct$/);
		expect(formatWeekRange('2026-09-28', 'en-GB')).toMatch(/^28 Sept?\s?–\s?4 Oct$/);
		expect(formatWeekRange('2025-12-29', 'en-GB')).toMatch(/2025.*2026/);
	});
	it('formats birth dates and short days', () => {
		expect(formatBirthDate('2019-09-02', 'en-GB')).toMatch(/^2 Sept? 2019$/);
		expect(formatShortDay('2026-10-22', 'en-GB')).toBe('Thu 22 Oct');
	});
});
