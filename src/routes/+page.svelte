<script lang="ts">
	import WalkCard from '$lib/components/WalkCard.svelte';
	import EmptyState from '$lib/ui/EmptyState.svelte';
	import Icon from '$lib/ui/Icon.svelte';
	import { formatDay, formatShortDay, groupByDay, localDayKey } from '$lib/api';
	import { buildRoster } from '$lib/ui/roster';
	import { dayLine, daySummary, nowOrNext, restOfDay, summaryText } from '$lib/ui/today';
	import { isOpen } from '$lib/ui/walk';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const roster = $derived(buildRoster(data.dogs, data.clients));
	const todays = $derived(data.walks.filter((w) => localDayKey(w.scheduled_at, data.tz) === data.today));
	const summary = $derived(daySummary(todays));
	const focus = $derived(nowOrNext(todays));
	const rest = $derived(restOfDay(todays, focus));
	const comingUp = $derived(
		groupByDay(
			data.walks.filter((w) => localDayKey(w.scheduled_at, data.tz) !== data.today && isOpen(w.status)),
			data.tz
		)
	);
</script>

<svelte:head><title>Today · Dog Walking</title></svelte:head>

<div class="page-head">
	<h1>{formatDay(data.today, data.locale)}</h1>
	<a class="button" href="/walks/new?day={data.today}"><Icon name="plus" />Schedule</a>
</div>

{#if data.dogs.length === 0}
	<EmptyState message="No dogs yet. Add a client and their dogs to start booking walks." href="/clients" action="Add a client" />
{:else if todays.length === 0}
	<EmptyState message="No walks today.">
		<div class="actions" style="justify-content: center">
			{#if comingUp.length}
				<a class="button secondary" href="/walks?week={comingUp[0].day}">Next walks: {formatShortDay(comingUp[0].day, data.locale)}</a>
			{/if}
			<a class="button" href="/walks/new?day={data.today}">Schedule a walk</a>
		</div>
	</EmptyState>
{:else}
	<p class="summary"><strong>{summaryText(summary)}</strong></p>

	{#if focus}
		<h2 class="section-label">{focus.status === 'in_progress' ? 'Now' : 'Next'}</h2>
		<WalkCard walk={focus} {roster} hero />
	{/if}

	{#if rest.length}
		<h2 class="section-label">{focus ? 'Rest of today' : 'Today'}</h2>
		{#each rest as walk (walk.walk_id)}
			<WalkCard {walk} {roster} />
		{/each}
	{/if}
{/if}

{#if comingUp.length}
	<h2 class="section-label">Coming up</h2>
	{#each comingUp as group (group.day)}
		<details class="collapse coming-up">
			<summary>
				<span><strong>{formatShortDay(group.day, data.locale)}</strong> <span class="meta">· {dayLine(group.items)}</span></span>
				<span class="chev"><Icon name="right" /></span>
			</summary>
			<div class="collapse-body">
				{#each group.items as walk (walk.walk_id)}
					<WalkCard {walk} {roster} />
				{/each}
			</div>
		</details>
	{/each}
{/if}

<style>
	.coming-up { margin: var(--space-2) 0; }
</style>
