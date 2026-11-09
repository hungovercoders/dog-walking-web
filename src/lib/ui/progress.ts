export interface WalkProgress {
	elapsedMs: number;
	plannedMs: number;
	/** 0..1, capped at 1. */
	fraction: number;
	overMs: number;
	over: boolean;
}

/** How far through a started walk is at `nowMs`. */
export function walkProgress(startedAt: string, durationMinutes: number, nowMs: number): WalkProgress {
	const elapsedMs = Math.max(0, nowMs - Date.parse(startedAt));
	const plannedMs = durationMinutes * 60_000;
	const overMs = Math.max(0, elapsedMs - plannedMs);
	return {
		elapsedMs,
		plannedMs,
		fraction: plannedMs > 0 ? Math.min(1, elapsedMs / plannedMs) : 1,
		overMs,
		over: overMs > 0
	};
}

/** "12 min over", "1h 5m over", or "18 min left". */
export function progressNote(p: WalkProgress): string {
	const minutes = (ms: number) => Math.floor(ms / 60_000);
	const words = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m} min`);
	if (p.over) return `${words(minutes(p.overMs))} over`;
	return `${words(Math.ceil((p.plannedMs - p.elapsedMs) / 60_000))} left`;
}
