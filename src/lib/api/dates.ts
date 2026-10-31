/** Date helpers over the contract's ISO 8601 `date-time` strings (UTC). */

/** Local calendar day (YYYY-MM-DD) of an instant, in the walker's timezone. */
export function localDayKey(iso: string, timeZone?: string): string {
	const d = new Date(iso);
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).formatToParts(d);
	const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
	return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Group items carrying a `scheduled_at` by local day, days ascending, items ascending. */
export function groupByDay<T extends { scheduled_at: string }>(
	items: readonly T[],
	timeZone?: string
): { day: string; items: T[] }[] {
	const groups = new Map<string, T[]>();
	for (const item of [...items].sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))) {
		const key = localDayKey(item.scheduled_at, timeZone);
		const bucket = groups.get(key) ?? [];
		bucket.push(item);
		groups.set(key, bucket);
	}
	return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, items]) => ({ day, items }));
}

/** The walker's locale from an Accept-Language header: the first tag the
 * runtime recognises, else `fallback`. Quality values are honoured. */
export function resolveLocale(header: string | null | undefined, fallback = 'en-GB'): string {
	const tags = (header ?? '')
		.split(',')
		.map((part) => {
			const [tag, ...params] = part.trim().split(';');
			const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
			return { tag: tag.trim(), q: q ? Number(q.slice(2)) : 1 };
		})
		.filter((t) => t.tag && t.tag !== '*' && !Number.isNaN(t.q) && t.q > 0)
		.sort((a, b) => b.q - a.q);
	for (const { tag } of tags) {
		try {
			const [canonical] = Intl.getCanonicalLocales(tag);
			// A bare "en" says nothing about date order; prefer the fallback's region.
			if (canonical === 'en') return fallback.startsWith('en') ? fallback : 'en-GB';
			if (canonical && Intl.DateTimeFormat.supportedLocalesOf([canonical]).length) return canonical;
		} catch {
			// not a valid tag; try the next
		}
	}
	return fallback;
}

const hourCycles = new Map<string | undefined, boolean>();

/** Whether the locale writes times on a 24-hour clock (looked up once per locale). */
export function uses24h(locale?: string): boolean {
	let is24 = hourCycles.get(locale);
	if (is24 === undefined) {
		const cycle = new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hourCycle;
		is24 = cycle === 'h23' || cycle === 'h24';
		hourCycles.set(locale, is24);
	}
	return is24;
}

/** A time of day: "09:00" in 24-hour locales, "9:00 AM" in 12-hour ones. */
export function formatTime(iso: string, locale?: string, timeZone?: string): string {
	return new Intl.DateTimeFormat(locale, {
		timeZone,
		hour: uses24h(locale) ? '2-digit' : 'numeric',
		minute: '2-digit'
	}).format(new Date(iso));
}

export function formatDay(dayKey: string, locale?: string): string {
	const [y, m, d] = dayKey.split('-').map(Number);
	return new Intl.DateTimeFormat(locale, {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		timeZone: 'UTC'
	}).format(new Date(Date.UTC(y, m - 1, d)));
}

export function formatDateTime(iso: string, locale?: string, timeZone?: string): string {
	return new Intl.DateTimeFormat(locale, {
		timeZone,
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		hour: uses24h(locale) ? '2-digit' : 'numeric',
		minute: '2-digit'
	}).format(new Date(iso));
}

/** "Thu 22 Oct" for a day key. */
export function formatShortDay(dayKey: string, locale?: string): string {
	const [y, m, d] = dayKey.split('-').map(Number);
	return new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
		new Date(Date.UTC(y, m - 1, d))
	);
}

/** "19 – 25 Oct", "28 Sep – 4 Oct", "29 Dec 2025 – 4 Jan 2026" for the week starting `mondayKey`. */
export function formatWeekRange(mondayKey: string, locale?: string): string {
	const [y, m, d] = mondayKey.split('-').map(Number);
	const start = new Date(Date.UTC(y, m - 1, d));
	const end = new Date(Date.UTC(y, m - 1, d + 6));
	const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
	const fmt = new Intl.DateTimeFormat(locale, {
		day: 'numeric',
		month: 'short',
		...(sameYear ? {} : { year: 'numeric' }),
		timeZone: 'UTC'
	});
	return fmt.formatRange(start, end);
}

/** A birth date as "2 Sep 2019". */
export function formatBirthDate(dob: string, locale?: string): string {
	const [y, m, d] = dob.split('-').map(Number);
	return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
		new Date(Date.UTC(y, m - 1, d))
	);
}

/** A dog's age on `today` (both YYYY-MM-DD): "7 yrs", "1 yr", "5 mos", "3 wks", "newborn". */
export function formatAge(dob: string, today: string): string {
	const [by, bm, bd] = dob.split('-').map(Number);
	const [ty, tm, td] = today.split('-').map(Number);
	let months = (ty - by) * 12 + (tm - bm);
	if (td < bd) months -= 1;
	if (months >= 12) {
		const years = Math.floor(months / 12);
		return `${years} ${years === 1 ? 'yr' : 'yrs'}`;
	}
	if (months >= 1) return `${months} ${months === 1 ? 'mo' : 'mos'}`;
	const days = Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(by, bm - 1, bd)) / 86_400_000);
	if (days < 0) return 'not born yet';
	const weeks = Math.floor(days / 7);
	return weeks >= 1 ? `${weeks} ${weeks === 1 ? 'wk' : 'wks'}` : 'newborn';
}

/** Minutes as "45 min", "1h", "2h 15m". */
export function formatDuration(minutes: number): string {
	if (minutes < 60) return `${minutes} min`;
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	return m ? `${h}h ${m}m` : `${h}h`;
}

/** Elapsed milliseconds as a clock: "4:05", "32:10", "1:02:10". */
export function formatClock(ms: number): string {
	const total = Math.max(0, Math.floor(ms / 1000));
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const s = total % 60;
	const pad = (n: number) => String(n).padStart(2, '0');
	return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** A calendar day (YYYY-MM-DD) that actually exists, or null. Rejects
 * shapes that only look right, like 2026-13-01 or 2026-02-30. */
export function parseDayKey(value: string | null | undefined): string | null {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
	if (!m) return null;
	const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
	const date = new Date(Date.UTC(y, mo - 1, d));
	return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d ? m[0] : null;
}

/** The Monday (YYYY-MM-DD) of the week containing a valid `dayKey`. */
export function weekStartKey(dayKey: string): string {
	const [y, m, d] = dayKey.split('-').map(Number);
	const dow = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; // Monday = 0
	return shiftDay(dayKey, -dow);
}

/** Monday 00:00 of the week containing `dayKey`, and the following Monday,
 * as UTC instants - midnight in `timeZone` (UTC when not given). */
export function weekBounds(dayKey: string, timeZone = 'UTC'): { from: string; to: string } {
	const monday = weekStartKey(dayKey);
	const next = shiftDay(monday, 7);
	return { from: zonedLocalToIso(`${monday}T00:00`, timeZone)!, to: zonedLocalToIso(`${next}T00:00`, timeZone)! };
}

/** `dayKey` 00:00 and `days` later 00:00 in `timeZone`, as UTC instants. */
export function dayWindow(dayKey: string, days: number, timeZone = 'UTC'): { from: string; to: string } {
	return {
		from: zonedLocalToIso(`${dayKey}T00:00`, timeZone)!,
		to: zonedLocalToIso(`${shiftDay(dayKey, days)}T00:00`, timeZone)!
	};
}

export function shiftDay(dayKey: string, days: number): string {
	const [y, m, d] = dayKey.split('-').map(Number);
	const date = new Date(Date.UTC(y, m - 1, d + days));
	return date.toISOString().slice(0, 10);
}

export function todayKey(timeZone?: string): string {
	return localDayKey(new Date().toISOString(), timeZone);
}

/** The IANA zone to use for a request: the `tz` cookie the browser set when
 * this runtime can format in it, else UTC. Formatting, not a lookup in
 * `Intl.supportedValuesOf`, decides: that list carries only canonical ICU
 * names, so aliases browsers report (Asia/Kolkata, Europe/Kyiv) are absent
 * from it yet format fine. */
export function readTimeZone(cookies: { get(name: string): string | undefined }): string {
	const tz = cookies.get('tz');
	if (!tz) return 'UTC';
	try {
		new Intl.DateTimeFormat('en-US', { timeZone: tz });
		return tz;
	} catch {
		return 'UTC';
	}
}

const LOCAL_INPUT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

/** Offset of `timeZone` from UTC, in milliseconds, at the given instant. */
function zoneOffsetMs(utcMs: number, timeZone: string): number {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone,
		hourCycle: 'h23',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit'
	}).formatToParts(new Date(utcMs));
	const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? '0');
	const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
	return asUtc - utcMs;
}

/** An `<input type="datetime-local">` value, read as wall-clock time in
 * `timeZone`, to the UTC ISO instant; null when it is not a date-time.
 * Two passes: guess the offset at the wall-clock-as-UTC instant, then
 * re-read it at the corrected instant so DST edges land right. */
export function zonedLocalToIso(local: string, timeZone: string): string | null {
	const m = LOCAL_INPUT.exec(local.trim());
	if (!m) return null;
	const [, y, mo, d, h, mi, sec] = m;
	const wall = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(sec ?? '0'));
	if (Number.isNaN(wall)) return null;
	// Reject calendar overflow (e.g. 2026-13-45) that Date.UTC would roll over.
	const probe = new Date(wall);
	if (probe.getUTCMonth() !== Number(mo) - 1 || probe.getUTCDate() !== Number(d) || probe.getUTCHours() !== Number(h) || probe.getUTCMinutes() !== Number(mi)) {
		return null;
	}
	let offset: number;
	try {
		offset = zoneOffsetMs(wall, timeZone);
		offset = zoneOffsetMs(wall - offset, timeZone);
	} catch {
		return null;
	}
	return new Date(wall - offset).toISOString();
}

/** A UTC ISO instant to the `<input type="datetime-local">` value showing its wall-clock time in `timeZone`. */
export function isoToZonedLocal(iso: string, timeZone: string): string {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone,
		hourCycle: 'h23',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit'
	}).formatToParts(new Date(iso));
	const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
	return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}
