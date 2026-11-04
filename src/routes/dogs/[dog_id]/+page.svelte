<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatAge, formatBirthDate } from '$lib/api';
	import Icon from '$lib/ui/Icon.svelte';
	import DogAvatar from '$lib/ui/DogAvatar.svelte';
	import { feedback } from '$lib/ui/enhance';
	import { joinMeta } from '$lib/ui/format';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const v = $derived((form?.values ?? {}) as Record<string, string | undefined>);
	const failedForm = $derived(v.form);
	const nameInvalid = $derived(failedForm === 'update' && v.field === 'name');
	const dog = $derived(data.dog);
	const meta = $derived(
		joinMeta(
			dog.breed,
			dog.date_of_birth && formatBirthDate(dog.date_of_birth, data.locale),
			dog.date_of_birth && formatAge(dog.date_of_birth, data.today)
		)
	);
</script>

<svelte:head><title>{dog.name} · Dog Walking</title></svelte:head>

{#if data.owner}
	<a class="back" href="/clients/{data.owner.client_id}"><Icon name="left" />{data.owner.name}</a>
{:else}
	<a class="back" href="/clients"><Icon name="left" />Clients</a>
{/if}
<div class="dog-head">
	<DogAvatar name={dog.name} id={dog.dog_id} />
	<div>
		<h1>{dog.name}</h1>
		{#if meta}<div class="meta">{meta}</div>{/if}
	</div>
</div>

{#if dog.notes}
	<div class="callout warn">
		<Icon name="alert" />
		<div>
			<strong>Notes</strong>
			<p class="notes">{dog.notes}</p>
		</div>
	</div>
{/if}

{#if form?.message && failedForm !== 'delete' && !nameInvalid}<p class="problem" role="alert">{form.message}</p>{/if}

<section class="card">
	<h2 class="form-title">Details</h2>
	<form class="stack" method="POST" action="?/update" use:enhance={feedback({ success: 'Saved', reset: false })}>
		<label>
			Name
			<input
				name="name"
				required
				value={v.name ?? dog.name}
				aria-invalid={nameInvalid ? 'true' : undefined}
				aria-describedby={nameInvalid ? 'dog-name-error' : undefined}
			/>
			{#if nameInvalid}<span class="field-error" id="dog-name-error"><Icon name="alert" />{form?.message}</span>{/if}
		</label>
		<label>Breed <input name="breed" value={v.breed ?? dog.breed ?? ''} /></label>
		<label>Date of birth <input name="date_of_birth" type="date" max={data.today} value={v.date_of_birth ?? dog.date_of_birth ?? ''} /></label>
		<label>Notes <textarea name="notes" placeholder="Temperament, health, anything to watch for">{v.notes ?? dog.notes ?? ''}</textarea></label>
		<div class="actions"><button>Save</button></div>
	</form>
</section>

<section class="danger-zone" aria-labelledby="danger-zone">
	<h2 id="danger-zone">Danger zone</h2>
	{#if form?.message && failedForm === 'delete'}<p class="problem" role="alert">{form.message}</p>{/if}
	<form method="POST" action="?/delete" use:enhance={feedback({ confirm: `Remove ${dog.name}?`, success: 'Dog removed' })}>
		<button class="danger"><Icon name="trash" />Remove dog</button>
	</form>
	<p class="meta">A dog booked on an open walk can’t be removed until that walk is completed or cancelled.</p>
</section>

<style>
	.dog-head {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		margin-bottom: var(--space-3);
	}
	.dog-head h1 {
		margin: 0;
	}
	.notes {
		margin: var(--space-1) 0 0;
		white-space: pre-line;
	}
	.form-title {
		margin: 0 0 var(--space-3);
	}
	.danger-zone {
		margin-top: var(--space-6);
		padding-top: var(--space-2);
		border-top: 1px solid var(--line);
	}
</style>
