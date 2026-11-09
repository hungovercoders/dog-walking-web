<script lang="ts">
	import { enhance } from '$app/forms';
	import { CANCELLATION_REASONS, formatAge, formatDateTime, formatDuration, formatTime, isoToZonedLocal } from '$lib/api';
	import CancelSheet from '$lib/components/CancelSheet.svelte';
	import WalkTimer from '$lib/components/WalkTimer.svelte';
	import DogAvatar from '$lib/ui/DogAvatar.svelte';
	import Icon from '$lib/ui/Icon.svelte';
	import Status from '$lib/ui/Status.svelte';
	import { dialable, mapsUrl } from '$lib/ui/clients';
	import { feedback } from '$lib/ui/enhance';
	import { joinMeta } from '$lib/ui/format';
	import { buildRoster, dogsByClient, walkParty } from '$lib/ui/roster';
	import { isOpen, reasonLabel } from '$lib/ui/walk';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const walk = $derived(data.walk);
	const roster = $derived(buildRoster(data.dogs, data.clients));
	const party = $derived(walkParty(walk, roster));
	const pickerGroups = $derived(dogsByClient(roster));
	const open = $derived(isOpen(walk.status));
	const names = $derived(party.dogs.map((d) => d.name).join(', '));
	const label = $derived(`${formatTime(walk.scheduled_at, data.locale, data.tz)} walk with ${names}`);
	const failed = $derived(form?.values as { form?: string; field?: string } | undefined);
	const reason = $derived(reasonLabel(walk.cancellation_reason));

	let sheet = $state<CancelSheet>();
	let editing = $state(false);
	// False on the server and during hydration, so both render the no-JS
	// fallback alike; true once the page is interactive and the sheet works.
	let mounted = $state(false);
	$effect(() => {
		mounted = true;
	});
	$effect(() => {
		if (data.editRequested || failed?.form === 'update') editing = true;
	});

	function openCancel(e: MouseEvent) {
		e.preventDefault();
		sheet?.open(e.currentTarget as HTMLElement);
	}
</script>

<svelte:head><title>{label} · Dog Walking</title></svelte:head>

<a class="back" href="/walks"><Icon name="left" />Walks</a>
<div class="page-head">
	<h1>{formatDateTime(walk.scheduled_at, data.locale, data.tz)}</h1>
	<Status status={walk.status} />
</div>
{#if form?.message && failed?.form !== 'update' && failed?.form !== 'cancel'}<p class="problem" role="alert">{form.message}</p>{/if}

{#if walk.status === 'in_progress' && walk.started_at}
	<section class="card hero" aria-label="Walk in progress">
		<WalkTimer startedAt={walk.started_at} duration={walk.duration_minutes} serverNow={data.serverNow} />
	</section>
{/if}

<section class="card">
	<div><strong>{formatDuration(walk.duration_minutes)}</strong> with {names}</div>
	{#if walk.notes}<p>{walk.notes}</p>{/if}
	<div class="meta stack-sm">
		{#if walk.started_at}<div>Started {formatDateTime(walk.started_at, data.locale, data.tz)}</div>{/if}
		{#if walk.completed_at}<div>Completed {formatDateTime(walk.completed_at, data.locale, data.tz)}</div>{/if}
		{#if walk.cancelled_at}<div>{joinMeta(`Cancelled ${formatDateTime(walk.cancelled_at, data.locale, data.tz)}`, reason)}</div>{/if}
	</div>
	{#if walk.status === 'completed'}
		<div class="actions"><a class="button secondary" href="/walks/new?from={walk.walk_id}"><Icon name="repeat" />Book again</a></div>
	{/if}
</section>

<h2 class="section-label">Dogs</h2>
{#each party.dogs as d (d.id)}
	<article class="card dog-row">
		<div class="row">
			{#if d.dog}<DogAvatar name={d.name} id={d.id} />{/if}
			<div>
				<h3>{#if d.dog}<a href="/dogs/{d.id}">{d.name}</a>{:else}{d.name} <span class="meta">(removed)</span>{/if}</h3>
				{#if d.dog}<div class="meta">{joinMeta(d.dog.breed, d.dog.date_of_birth && formatAge(d.dog.date_of_birth, data.today))}</div>{/if}
			</div>
		</div>
		{#if d.dog?.notes}<div class="callout warn"><Icon name="alert" /><span>{d.dog.notes}</span></div>{/if}
	</article>
{/each}

{#if party.clients.length}
	<h2 class="section-label">Pickup</h2>
	{#each party.clients as { client, dogs } (client.client_id)}
		<article class="card">
			<h3><a href="/clients/{client.client_id}">{client.name}</a> <span class="meta">· {dogs.map((d) => d.name).join(', ')}</span></h3>
			{#if client.address}<div class="meta">{client.address}</div>{/if}
			<div class="actions">
				{#if client.address}<a class="button secondary" href={mapsUrl(client.address)} target="_blank" rel="noopener noreferrer"><Icon name="pin" />Directions<span class="sr-only"> (opens maps)</span></a>{/if}
				{#if client.phone}<a class="button secondary" href="tel:{dialable(client.phone)}"><Icon name="phone" />Call</a>{/if}
				{#if client.phone}<a class="button secondary" href="sms:{dialable(client.phone)}"><Icon name="message" />Text</a>{/if}
			</div>
			{#if client.notes}<div class="callout"><Icon name="info" /><span>{client.notes}</span></div>{/if}
		</article>
	{/each}
{/if}

{#if walk.status === 'scheduled'}
	<details class="collapse section" id="reschedule" bind:open={editing}>
		<summary><span><Icon name="edit" /> Reschedule or change</span><span class="chev"><Icon name="right" /></span></summary>
		<div class="collapse-body">
			{#if form?.message && failed?.form === 'update'}<p class="problem" id="update-error" role="alert">{form.message}</p>{/if}
			<form class="stack" method="POST" action="?/update" use:enhance={feedback({ success: 'Walk updated', reset: false, after: (r) => { if (r.type === 'success') editing = false; } })}>
				<label>When
					<input type="datetime-local" name="scheduled_at" value={isoToZonedLocal(walk.scheduled_at, data.tz)}
						aria-invalid={failed?.field === 'scheduled_at' ? 'true' : undefined} aria-describedby={failed?.field === 'scheduled_at' ? 'update-error' : undefined} />
				</label>
				<label>Duration (minutes) <input type="number" name="duration_minutes" min="1" value={walk.duration_minutes} /></label>
				<fieldset aria-describedby={failed?.field === 'dog_ids' ? 'update-error' : undefined}>
					<legend>Dogs</legend>
					{#each pickerGroups as group (group.client?.client_id ?? 'none')}
						<div class="meta">{group.client?.name ?? 'Other'}</div>
						{#each group.dogs as dog (dog.dog_id)}
							<label class="check"><input type="checkbox" name="dog_ids" value={dog.dog_id} checked={walk.dog_ids.includes(dog.dog_id)} />{dog.name}</label>
						{/each}
					{/each}
				</fieldset>
				<label>Notes <textarea name="notes">{walk.notes ?? ''}</textarea></label>
				<div class="actions"><button>Save changes</button></div>
			</form>
		</div>
	</details>
{/if}

{#if open}
	<details class="collapse section" id="cancel" open={data.cancelRequested || failed?.form === 'cancel'}>
		<summary><span><Icon name="alert" /> Something wrong?</span><span class="chev"><Icon name="right" /></span></summary>
		<div class="collapse-body stack-sm">
			{#if walk.status === 'scheduled'}
				<form method="POST" action="?/complete" use:enhance={feedback({ success: 'Walk completed' })}>
					<button class="secondary block"><Icon name="check" />Mark completed without starting</button>
				</form>
			{/if}
			{#if mounted}
				<button type="button" class="danger block" onclick={openCancel}><Icon name="x" />Cancel walk…</button>
			{:else}
				<!-- Without JavaScript the sheet cannot open: the same choices, inline. -->
				{#if form?.message && failed?.form === 'cancel'}<p class="problem" id="cancel-error" role="alert">{form.message}</p>{/if}
				<form class="stack" method="POST" action="?/cancel">
					<fieldset class="choice-cards" aria-describedby={failed?.form === 'cancel' ? 'cancel-error' : undefined}>
						<legend>Why is it cancelled?</legend>
						{#each CANCELLATION_REASONS as r (r.value)}
							<label><input type="radio" name="reason" value={r.value} required />{r.label}</label>
						{/each}
					</fieldset>
					<button class="danger solid block"><Icon name="x" />Cancel {label}</button>
				</form>
			{/if}
		</div>
	</details>
	<CancelSheet bind:this={sheet} id={walk.walk_id} {label} action="?/cancel" />

	<div class="sticky-action">
		{#if walk.status === 'scheduled'}
			<form method="POST" action="?/start" use:enhance={feedback({ success: 'Walk started' })}>
				<button class="block"><Icon name="play" />Start walk</button>
			</form>
		{:else}
			<details class="complete-panel">
				<summary class="button block"><Icon name="check" />Complete walk</summary>
				<form class="stack" method="POST" action="?/complete" use:enhance={feedback({ success: 'Walk completed' })}>
					<label>How did it go? <textarea name="notes" placeholder="Optional notes"></textarea></label>
					<div class="actions">
						<button><Icon name="check" />Save</button>
						<button class="secondary" name="skip" value="1">Skip notes</button>
					</div>
				</form>
			</details>
		{/if}
	</div>
{/if}

<style>
	.section { margin: var(--space-3) 0; }
	.dog-row .row { flex-wrap: nowrap; align-items: center; }
	.complete-panel[open] { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: var(--space-3); }
	.complete-panel[open] > summary { margin-bottom: var(--space-3); }
	h3 .meta { font-weight: 400; }
</style>
