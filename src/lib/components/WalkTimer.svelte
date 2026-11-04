<script lang="ts">
	import { formatClock } from '$lib/api';
	import Icon from '$lib/ui/Icon.svelte';
	import { progressNote, walkProgress } from '$lib/ui/progress';

	/** `serverNow` is the load's clock, so the first render matches what was served. */
	let { startedAt, duration, serverNow }: { startedAt: string; duration: number; serverNow: number } = $props();

	let now = $state(0);
	const clock = $derived(now || serverNow);
	$effect(() => {
		now = Date.now();
		const id = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(id);
	});
	const p = $derived(walkProgress(startedAt, duration, clock));
	const elapsedMinutes = $derived(Math.floor(p.elapsedMs / 60_000));
</script>

<div class="walk-timer">
	<div class="timer" role="timer" aria-label="Time walked">
		{formatClock(p.elapsedMs)}<span class="of"> of {formatClock(p.plannedMs)}</span>
	</div>
	<div
		class="progress"
		class:over={p.over}
		role="progressbar"
		aria-label="Walk progress"
		aria-valuemin="0"
		aria-valuemax={duration}
		aria-valuenow={Math.min(duration, elapsedMinutes)}
		aria-valuetext="{elapsedMinutes} of {duration} minutes"
	>
		<span style:width="{p.fraction * 100}%"></span>
	</div>
	<p class="note" class:over={p.over}>
		{#if p.over}<Icon name="alert" />{:else}<Icon name="clock" />{/if}
		{progressNote(p)}
	</p>
</div>

<style>
	.walk-timer { display: grid; gap: var(--space-2); }
	.of { font-size: var(--text-base); font-weight: 500; color: var(--muted); }
	.note { margin: 0; display: flex; align-items: center; gap: var(--space-1); color: var(--muted); font-weight: 600; }
	.note.over { color: var(--warn); }
</style>
