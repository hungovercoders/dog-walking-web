<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { formatDuration, formatTime, type Walk } from '$lib/api';
	import Icon from '$lib/ui/Icon.svelte';
	import Status from '$lib/ui/Status.svelte';
	import { feedback } from '$lib/ui/enhance';
	import { joinMeta } from '$lib/ui/format';
	import { pickupLine, walkParty, type Roster } from '$lib/ui/roster';
	import { isOpen, reasonLabel } from '$lib/ui/walk';
	import CancelSheet from './CancelSheet.svelte';

	let { walk, roster, hero = false }: { walk: Walk; roster: Roster; hero?: boolean } = $props();

	const tz = $derived(page.data.tz as string);
	const locale = $derived(page.data.locale as string);
	const party = $derived(walkParty(walk, roster));
	const time = $derived(formatTime(walk.scheduled_at, locale, tz));
	const names = $derived(party.dogs.map((d) => d.name).join(', '));
	const open = $derived(isOpen(walk.status));
	const href = $derived(`/walks/${walk.walk_id}`);
	const back = $derived(encodeURIComponent(page.url.pathname + page.url.search));
	const meta = $derived(
		joinMeta(
			formatDuration(walk.duration_minutes),
			walk.status === 'cancelled'
				? joinMeta('Cancelled', reasonLabel(walk.cancellation_reason))
				: pickupLine(party)
		)
	);
	const cautions = $derived(party.dogs.filter((d) => d.dog?.notes));

	let menu = $state<HTMLDetailsElement>();
	let menuOpen = $state(false);
	let sheet = $state<CancelSheet>();

	// Close the overflow menu on Escape or a tap elsewhere.
	$effect(() => {
		if (!menuOpen) return;
		const onPointer = (e: PointerEvent) => {
			if (menu && !menu.contains(e.target as Node)) menu.open = false;
		};
		document.addEventListener('pointerdown', onPointer);
		return () => document.removeEventListener('pointerdown', onPointer);
	});
	// Escape closes the menu and returns focus to its toggle, wherever focus is inside it.
	$effect(() => {
		const el = menu;
		if (!el) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && el.open) {
				el.open = false;
				el.querySelector('summary')?.focus();
			}
		};
		el.addEventListener('keydown', onKey);
		return () => el.removeEventListener('keydown', onKey);
	});
	function openCancel(e: MouseEvent) {
		e.preventDefault();
		const summary = menu?.querySelector('summary');
		if (menu) menu.open = false;
		sheet?.open(summary);
	}
</script>

<article class="card" class:accent={walk.status === 'in_progress'} class:quiet={!open} class:hero>
	<div class="row between">
		<h3><a class="stretched" {href}>{time} · {names}</a></h3>
		<Status status={walk.status} />
	</div>
	<div class="meta">{meta}</div>
	{#if walk.notes}<div class="meta">{walk.notes}</div>{/if}
	{#each cautions as c (c.id)}
		<div class="meta caution-line"><span class="caution"><Icon name="alert" /></span> {c.name}: {c.dog?.notes}</div>
	{/each}

	{#if open}
		<div class="actions above">
			{#if walk.status === 'scheduled'}
				<form class="inline-form" method="POST" action="{href}?/start&redirect_to={back}" use:enhance={feedback({ success: 'Walk started', toastErrors: true })}>
					<button><Icon name="play" />Start</button>
				</form>
			{:else}
				<form class="inline-form" method="POST" action="{href}?/complete&redirect_to={back}" use:enhance={feedback({ success: 'Walk completed', toastErrors: true })}>
					<button><Icon name="check" />Complete</button>
				</form>
			{/if}
			<details class="menu" bind:this={menu} bind:open={menuOpen}>
				<summary class="button secondary icon-only" aria-label="More actions for the {time} walk"><Icon name="more" /></summary>
				<div class="menu-panel">
					{#if walk.status === 'scheduled'}
						<form method="POST" action="{href}?/complete&redirect_to={back}" use:enhance={feedback({ success: 'Walk completed', toastErrors: true })}>
							<button><Icon name="check" />Mark completed without starting</button>
						</form>
						<a href="{href}?edit=1#reschedule"><Icon name="edit" />Reschedule</a>
					{/if}
					<a class="danger-item" href="{href}?cancel=1#cancel" onclick={openCancel}><Icon name="x" />Cancel walk…</a>
				</div>
			</details>
		</div>
		<CancelSheet bind:this={sheet} id={walk.walk_id} label="{time} walk with {names}" action="{href}?/cancel&redirect_to={back}" />
	{/if}
</article>

<style>
	.caution-line { display: flex; gap: var(--space-1); align-items: flex-start; }
	.caution-line .caution { margin-top: 2px; }
	h3 { font-size: var(--text-base); }
	.hero h3 { font-size: var(--text-lg); }
</style>
