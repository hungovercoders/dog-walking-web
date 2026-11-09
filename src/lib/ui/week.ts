import type { Walk, WalkStatus } from '$lib/api';
import { groupByDay, shiftDay } from '$lib/api';

/** The status filter on the week view. "open" is scheduled plus in progress:
 * the contract filters one status per request, so "open" fetches the week
 * unfiltered and narrows here rather than making two requests. */
export const WEEK_FILTERS = [
	{ value: '', label: 'All' },
	{ value: 'open', label: 'Open' },
	{ value: 'completed', label: 'Done' },
	{ value: 'cancelled', label: 'Cancelled' }
] as const;
export type WeekFilter = (typeof WEEK_FILTERS)[number]['value'];

export function parseWeekFilter(value: string | null): WeekFilter {
	return (WEEK_FILTERS.find((f) => f.value === value)?.value ?? '') as WeekFilter;
}

/** The contract status to ask the API for, if the filter maps to exactly one. */
export function apiStatus(filter: WeekFilter): WalkStatus | undefined {
	return filter === 'completed' || filter === 'cancelled' ? filter : undefined;
}

export function applyFilter(walks: readonly Walk[], filter: WeekFilter): Walk[] {
	if (filter === 'open') return walks.filter((w) => w.status === 'scheduled' || w.status === 'in_progress');
	if (filter === 'completed' || filter === 'cancelled') return walks.filter((w) => w.status === filter);
	return [...walks];
}

/** All seven days from `monday`, each with its walks (possibly none). */
export function weekDays(monday: string, walks: readonly Walk[], tz: string): { day: string; walks: Walk[] }[] {
	const grouped = new Map(groupByDay(walks, tz).map((g) => [g.day, g.items]));
	return Array.from({ length: 7 }, (_, i) => {
		const day = shiftDay(monday, i);
		return { day, walks: grouped.get(day) ?? [] };
	});
}
