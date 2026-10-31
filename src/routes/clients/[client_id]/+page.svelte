<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatAge, formatBirthDate } from '$lib/api';
	import Icon from '$lib/ui/Icon.svelte';
	import DogAvatar from '$lib/ui/DogAvatar.svelte';
	import EmptyState from '$lib/ui/EmptyState.svelte';
	import { feedback } from '$lib/ui/enhance';
	import { joinMeta } from '$lib/ui/format';
	import { dialable, firstLine, mapsUrl, removeClientPrompt } from '$lib/ui/clients';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let editing = $state(false);
	let addOpen = $state(false);
	const v = $derived((form?.values ?? {}) as Record<string, string | undefined>);
	const failedForm = $derived(v.form);
	const nameInvalid = (which: string) => failedForm === which && v.field === 'name';
	const client = $derived(data.client);
	// A failed save opens the editor to show what went wrong; Close still closes it.
	$effect(() => {
		if (failedForm === 'update') editing = true;
	});
	const editOpen = $derived(editing);

	// A failed add keeps the form open, showing what went wrong.
	$effect(() => {
		if (failedForm === 'addDog') addOpen = true;
	});

	function focusFirst(node: HTMLElement) {
		node.querySelector<HTMLElement>('input, textarea')?.focus();
	}

	const dogMeta = (dog: (typeof data.dogs)[number]) =>
		joinMeta(
			dog.breed ?? 'Breed not recorded',
			dog.date_of_birth && formatBirthDate(dog.date_of_birth, data.locale),
			dog.date_of_birth && formatAge(dog.date_of_birth, data.today)
		);
</script>

<svelte:head><title>{client.name} · Dog Walking</title></svelte:head>

<a class="back" href="/clients"><Icon name="left" />Clients</a>
<div class="page-head">
	<h1>{client.name}</h1>
	<button class="secondary" aria-expanded={editOpen} aria-controls="client-edit" onclick={() => (editing = !editOpen)}>
		{#if editOpen}Close{:else}<Icon name="edit" />Edit{/if}
	</button>
</div>

{#if form?.message && failedForm !== 'addDog' && failedForm !== 'delete' && !nameInvalid('update')}
	<p class="problem" role="alert">{form.message}</p>
{/if}

{#if editOpen}
	<section class="card" id="client-edit" use:focusFirst>
		<form
			class="stack"
			method="POST"
			action="?/update"
			use:enhance={feedback({ success: 'Saved', reset: false, after: (r) => { if (r.type === 'success') editing = false; } })}
		>
			<label>
				Name
				<input
					name="name"
					required
					value={v.name ?? client.name}
					aria-invalid={nameInvalid('update') ? 'true' : undefined}
					aria-describedby={nameInvalid('update') ? 'client-name-error' : undefined}
				/>
				{#if nameInvalid('update')}<span class="field-error" id="client-name-error"><Icon name="alert" />{form?.message}</span>{/if}
			</label>
			<label>Email <input name="email" type="email" value={v.email ?? client.email ?? ''} /></label>
			<label>Phone <input name="phone" type="tel" value={v.phone ?? client.phone ?? ''} /></label>
			<label>Address <input name="address" value={v.address ?? client.address ?? ''} /></label>
			<label>Notes <textarea name="notes" placeholder="Access, keys, preferences">{v.notes ?? client.notes ?? ''}</textarea></label>
			<div class="actions"><button>Save</button></div>
		</form>
	</section>
{:else}
	{#if client.phone || client.email || client.address}
		<div class="contact" aria-label="Contact {client.name}" role="group">
			{#if client.phone}
				<a class="button secondary" href="tel:{dialable(client.phone)}"><Icon name="phone" />Call<span class="sr-only"> {client.name}</span></a>
				<a class="button secondary" href="sms:{dialable(client.phone)}"><Icon name="message" />Text<span class="sr-only"> {client.name}</span></a>
			{/if}
			{#if client.email}
				<a class="button secondary" href="mailto:{client.email}"><Icon name="mail" />Email<span class="sr-only"> {client.name}</span></a>
			{/if}
			{#if client.address}
				<a class="button secondary" href={mapsUrl(client.address)} target="_blank" rel="noopener noreferrer">
					<Icon name="pin" />Directions<span class="sr-only"> to {client.address} (opens maps)</span>
				</a>
			{/if}
		</div>
	{/if}

	<section class="card details">
		{#if client.address}<div><span class="label-inline">Address</span>{client.address}</div>{/if}
		{#if client.phone}<div><span class="label-inline">Phone</span>{client.phone}</div>{/if}
		{#if client.email}<div><span class="label-inline">Email</span>{client.email}</div>{/if}
		{#if !client.address && !client.phone && !client.email}<div class="meta">No contact details yet. Use Edit to add them.</div>{/if}
	</section>

	{#if client.notes}
		<div class="callout notes">
			<Icon name="info" />
			<div>
				<strong>Notes</strong>
				<p>{client.notes}</p>
			</div>
		</div>
	{/if}
{/if}

<h2>Dogs</h2>
{#if data.dogs.length === 0}
	<EmptyState message="No dogs yet for {client.name}.">
		<button onclick={() => (addOpen = true)}><Icon name="plus" />Add a dog</button>
	</EmptyState>
{/if}
{#each data.dogs as dog (dog.dog_id)}
	<article class="card dog">
		<DogAvatar name={dog.name} id={dog.dog_id} />
		<div class="body">
			<h3><a class="stretched" href="/dogs/{dog.dog_id}">{dog.name}</a></h3>
			<div class="meta">{dogMeta(dog)}</div>
			{#if dog.notes}
				<div class="note"><span class="caution"><Icon name="alert" /></span><span>{firstLine(dog.notes)}</span></div>
			{/if}
		</div>
		<Icon name="right" class="muted" />
	</article>
{/each}

<details class="collapse add-dog" bind:open={addOpen}>
	<summary><span class="row"><Icon name="plus" />Add a dog</span><Icon name="right" class="chev" /></summary>
	<div class="collapse-body">
		{#if form?.message && failedForm === 'addDog' && !nameInvalid('addDog')}<p class="problem" role="alert">{form.message}</p>{/if}
		<form
			class="stack"
			method="POST"
			action="?/addDog"
			use:enhance={feedback({ success: 'Dog added', after: (r) => { if (r.type === 'success') addOpen = false; } })}
		>
			<label>
				Name
				<input
					name="name"
					required
					value={failedForm === 'addDog' ? (v.name ?? '') : ''}
					aria-invalid={nameInvalid('addDog') ? 'true' : undefined}
					aria-describedby={nameInvalid('addDog') ? 'dog-name-error' : undefined}
				/>
				{#if nameInvalid('addDog')}<span class="field-error" id="dog-name-error"><Icon name="alert" />{form?.message}</span>{/if}
			</label>
			<label>Breed <input name="breed" value={failedForm === 'addDog' ? (v.breed ?? '') : ''} /></label>
			<label>Date of birth <input name="date_of_birth" type="date" max={data.today} value={failedForm === 'addDog' ? (v.date_of_birth ?? '') : ''} /></label>
			<label>Notes <textarea name="notes" placeholder="Temperament, health, anything to watch for">{failedForm === 'addDog' ? (v.notes ?? '') : ''}</textarea></label>
			<div class="actions"><button>Add dog</button></div>
		</form>
	</div>
</details>

<section class="danger-zone" aria-labelledby="danger-zone">
	<h2 id="danger-zone">Danger zone</h2>
	{#if form?.message && failedForm === 'delete'}<p class="problem" role="alert">{form.message}</p>{/if}
	<form
		method="POST"
		action="?/delete"
		use:enhance={feedback({ confirm: removeClientPrompt(client.name, data.dogs.length), success: 'Client removed' })}
	>
		<button class="danger"><Icon name="trash" />Remove client</button>
	</form>
	<p class="meta">Their dogs are removed too. Closed walks stay in your history.</p>
</section>

<style>
	.contact {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		margin: var(--space-2) 0 var(--space-3);
	}
	.details {
		display: grid;
		gap: var(--space-1);
	}
	.label-inline {
		display: inline-block;
		min-width: 5.5em;
		color: var(--muted);
		font-size: var(--text-sm);
	}
	.notes p {
		margin: var(--space-1) 0 0;
		white-space: pre-line;
	}
	.dog {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}
	.dog .body {
		flex: 1;
		min-width: 0;
	}
	.note {
		display: flex;
		gap: var(--space-1);
		align-items: flex-start;
		margin-top: var(--space-1);
		font-size: var(--text-sm);
	}
	.add-dog {
		margin: var(--space-3) 0;
	}
	.danger-zone {
		margin-top: var(--space-6);
		padding-top: var(--space-2);
		border-top: 1px solid var(--line);
	}
</style>
