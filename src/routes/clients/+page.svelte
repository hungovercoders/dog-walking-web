<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from '$lib/ui/Icon.svelte';
	import EmptyState from '$lib/ui/EmptyState.svelte';
	import DogAvatar from '$lib/ui/DogAvatar.svelte';
	import { feedback } from '$lib/ui/enhance';
	import { joinMeta } from '$lib/ui/format';
	import { countLine, filterRoster, resultsLabel, rosterCounts } from '$lib/ui/clients';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let adding = $state(false);
	let query = $state('');
	const v = $derived((form?.values ?? {}) as Record<string, string | undefined>);
	const nameInvalid = $derived(v.field === 'name');
	const shown = $derived(filterRoster(data.clients, query));
	const counts = $derived(rosterCounts(data.clients));
	// A failed add opens the form to show what went wrong; Close still closes it.
	$effect(() => {
		if (form?.message) adding = true;
	});
	const formOpen = $derived(adding);

	/** Move focus into the form when it opens, so keyboard users land in it. */
	function focusFirst(node: HTMLElement) {
		node.querySelector<HTMLElement>('input, textarea')?.focus();
	}
</script>

<svelte:head><title>Clients · Dog Walking</title></svelte:head>

<div class="page-head">
	<h1>Clients</h1>
	{#if data.clients.length > 0 || formOpen}
		<button class="secondary" aria-expanded={formOpen} aria-controls="new-client" onclick={() => (adding = !formOpen)}>
			{#if formOpen}Close{:else}<Icon name="plus" />Add a client{/if}
		</button>
	{/if}
</div>

{#if formOpen}
	<section class="card" id="new-client" use:focusFirst>
		<h2 class="form-title">New client</h2>
		{#if form?.message && !nameInvalid}<p class="problem" role="alert">{form.message}</p>{/if}
		<form class="stack" method="POST" action="?/create" use:enhance={feedback({ success: 'Client added' })}>
			<label>
				Name
				<input
					name="name"
					required
					autocomplete="off"
					value={v.name ?? ''}
					aria-invalid={nameInvalid ? 'true' : undefined}
					aria-describedby={nameInvalid ? 'new-client-name-error' : undefined}
				/>
				{#if nameInvalid}<span class="field-error" id="new-client-name-error"><Icon name="alert" />{form?.message}</span>{/if}
			</label>
			<label>Email <input name="email" type="email" autocomplete="off" value={v.email ?? ''} /></label>
			<label>Phone <input name="phone" type="tel" autocomplete="off" value={v.phone ?? ''} /></label>
			<label>Address <input name="address" autocomplete="off" value={v.address ?? ''} /></label>
			<label>Notes <textarea name="notes" placeholder="Access, keys, preferences">{v.notes ?? ''}</textarea></label>
			<div class="actions"><button>Add client</button></div>
		</form>
	</section>
{/if}

{#if data.clients.length === 0}
	{#if !formOpen}
		<EmptyState message="No clients yet.">
			<button onclick={() => (adding = true)}><Icon name="plus" />Add your first client</button>
		</EmptyState>
	{/if}
{:else}
	<p class="meta">{countLine(counts)}</p>
	<div class="search">
		<label for="client-search" class="sr-only">Search clients and dogs</label>
		<Icon name="search" />
		<input id="client-search" type="search" placeholder="Search clients or dogs" autocomplete="off" bind:value={query} />
	</div>
	<p class="sr-only" aria-live="polite">{query.trim() ? resultsLabel(shown.length) : ''}</p>

	{#if shown.length === 0}
		<p class="empty">No clients or dogs match “{query.trim()}”.</p>
	{/if}
	{#each shown as client (client.client_id)}
		<article class="card client">
			<div class="avatars">
				{#each client.dogs.slice(0, 3) as dog (dog.dog_id)}
					<DogAvatar name={dog.name} id={dog.dog_id} size="sm" />
				{/each}
			</div>
			<div class="body">
				<h3><a class="stretched" href="/clients/{client.client_id}">{client.name}</a></h3>
				<div class="meta">
					{joinMeta(client.dogs.length ? client.dogs.map((d) => d.name).join(', ') : 'No dogs yet', client.phone)}
				</div>
			</div>
			<Icon name="right" class="muted" />
		</article>
	{/each}
{/if}

<style>
	.form-title {
		margin: 0 0 var(--space-3);
	}
	.search {
		position: relative;
		margin: var(--space-2) 0 var(--space-3);
	}
	.search :global(.icon) {
		position: absolute;
		left: 12px;
		top: 50%;
		transform: translateY(-50%);
		color: var(--muted);
		pointer-events: none;
	}
	.search input {
		padding-left: 40px;
	}
	.client {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}
	.client .body {
		flex: 1;
		min-width: 0;
	}
	.avatars {
		display: flex;
		flex: none;
		min-width: 28px;
	}
	/* Earlier dogs sit on top and later ones tuck behind, so every initial
	   stays readable; the ring separates the overlapping discs. */
	.avatars > :global(.avatar) {
		position: relative;
		box-shadow: 0 0 0 2px var(--surface);
	}
	.avatars > :global(.avatar:nth-child(1)) { z-index: 3; }
	.avatars > :global(.avatar:nth-child(2)) { z-index: 2; }
	.avatars > :global(.avatar:nth-child(3)) { z-index: 1; }
	.avatars > :global(.avatar + .avatar) {
		margin-left: -8px;
	}
</style>
