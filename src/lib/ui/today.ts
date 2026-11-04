import type { Walk } from '$lib/api';
import { formatDuration } from '$lib/api';

export interface DaySummary {
	planned: number;
	done: number;
	cancelled: number;
	minutesPlanned: number;
	minutesDone: number;
}

/** Counts for a day: cancelled walks are reported apart and count toward nothing else. */
export function daySummary(walks: readonly Walk[]): DaySummary {
	const live = walks.filter((w) => w.status !== 'cancelled');
	const done = live.filter((w) => w.status === 'completed');
	return {
		planned: live.length,
		done: done.length,
		cancelled: walks.length - live.length,
		minutesPlanned: live.reduce((n, w) => n + w.duration_minutes, 0),
		minutesDone: done.reduce((n, w) => n + w.duration_minutes, 0)
	};
}

/** "2 of 4 walks done · 75 of 180 min" (+ " · 1 cancelled"). */
export function summaryText(s: DaySummary): string {
	const parts = [`${s.done} of ${s.planned} ${s.planned === 1 ? 'walk' : 'walks'} done`, `${s.minutesDone} of ${s.minutesPlanned} min`];
	if (s.cancelled) parts.push(`${s.cancelled} cancelled`);
	return parts.join(' · ');
}

/** The walk to put first: the one in progress, else the earliest still scheduled. */
export function nowOrNext(walks: readonly Walk[]): Walk | undefined {
	const byTime = [...walks].sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
	return byTime.find((w) => w.status === 'in_progress') ?? byTime.find((w) => w.status === 'scheduled');
}

/** The rest of the day as a checklist: open walks by time, then completed, then cancelled. */
export function restOfDay(walks: readonly Walk[], focus?: Walk): Walk[] {
	const rank = (w: Walk) => (w.status === 'completed' ? 1 : w.status === 'cancelled' ? 2 : 0);
	return walks
		.filter((w) => w.walk_id !== focus?.walk_id)
		.sort((a, b) => rank(a) - rank(b) || a.scheduled_at.localeCompare(b.scheduled_at));
}

/** "3 walks · 2h 15m" for a day header, counting walks that are not cancelled. */
export function dayLine(walks: readonly Walk[]): string {
	const live = walks.filter((w) => w.status !== 'cancelled');
	if (live.length === 0) return walks.length ? `${walks.length} cancelled` : 'No walks';
	const minutes = live.reduce((n, w) => n + w.duration_minutes, 0);
	return `${live.length} ${live.length === 1 ? 'walk' : 'walks'} · ${formatDuration(minutes)}`;
}
