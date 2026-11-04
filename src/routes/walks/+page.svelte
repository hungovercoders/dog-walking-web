<script lang="ts">
	import WalkCard from '$lib/components/WalkCard.svelte';
	import Icon from '$lib/ui/Icon.svelte';
	import { formatShortDay, formatWeekRange, shiftDay } from '$lib/api';
	import { buildRoster } from '$lib/ui/roster';
	import { dayLine } from '$lib/ui/today';
	import { WEEK_FILTERS, applyFilter, weekDays, type WeekFilter } from '$lib/ui/week';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const roster = $derived(buildRoster(data.dogs, data.clients));
	const days = $derived(weekDays(data.weekStart, applyFilter(data.walks, data.filter), data.tz));
	const link = (week: string, filter: WeekFilter = data.filter) =>
		`/walks?week=${week}${filter ? `&status=${filter}` : ''}`;
</script>

<svelte:head><title>Walks · Dog Walking</title></svelte:head>

<div class="page-head">
	<div class="week-nav">
		<a class="button ghost icon-only" href={link(shiftDay(data.weekStart, -7))} aria-label="Previous week"><Icon name="left" /></a>
		<h1>{formatWeekRange(data.weekStart, data.locale)}</h1>
		<a class="button ghost icon-only" href={link(shiftDay(data.weekStart, 7))} aria-label="Next week"><Icon name="right" /></a>
	</div>
	<a class="button" href="/walks/new"><Icon name="plus" />Schedule</a>
</div>

<div class="toolbar">
	<nav class="segmented" aria-label="Show walks">
		{#each WEEK_FILTERS as f (f.value)}
			<a href={link(data.weekStart, f.value)} aria-current={data.filter === f.value ? 'true' : undefined}>{f.label}</a>
		{/each}
	</nav>
	<div class="row">
		{#if data.weekStart !== data.thisWeek}<a href={link(data.thisWeek)}>This week</a>{/if}
		<details class="jump">
			<summary class="button ghost"><Icon name="calendar" />Jump to date</summary>
			<form method="GET" class="row">
				<label class="sr-only" for="jump-week">Week containing</label>
				<input id="jump-week" type="date" name="week" value={data.weekStart} />
				{#if data.filter}<input type="hidden" name="status" value={data.filter} />{/if}
				<button class="secondary">Go</button>
			</form>
		</details>
	</div>
</div>

{#each days as group (group.day)}
	{#if group.walks.length === 0}
		<div class="empty-day">
			<span><strong>{formatShortDay(group.day, data.locale)}</strong> <span class="meta">· No walks</span></span>
			<a href="/walks/new?day={group.day}">Schedule</a>
		</div>
	{:else}
		<h2 class="day-head">
			<span>{formatShortDay(group.day, data.locale)}</span>
			<span class="meta">{dayLine(group.walks)}</span>
		</h2>
		{#each group.walks as walk (walk.walk_id)}
			<WalkCard {walk} {roster} />
		{/each}
	{/if}
{/each}

<style>
	.week-nav { display: flex; align-items: center; gap: var(--space-1); }
	.week-nav h1 { min-width: 9ch; text-align: center; }
	.toolbar { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: center; justify-content: space-between; margin-bottom: var(--space-2); }
	.jump { position: relative; }
	.jump form { position: absolute; right: 0; z-index: 5; background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-sm); padding: var(--space-2); box-shadow: var(--shadow-lg); flex-wrap: nowrap; }
	.jump input { width: auto; }
	.day-head {
		display: flex; justify-content: space-between; align-items: baseline; gap: var(--space-2);
		margin: var(--space-5) 0 var(--space-1); font-size: var(--text-sm); text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted);
	}
	.day-head > span:first-child { color: var(--text); }
	.day-head .meta { text-transform: none; letter-spacing: 0; }
	.empty-day {
		display: flex; justify-content: space-between; align-items: center; gap: var(--space-2);
		min-height: var(--target); padding: 0 var(--space-1); margin-top: var(--space-2);
		border-bottom: 1px dashed var(--line); font-size: var(--text-sm);
	}
</style>
