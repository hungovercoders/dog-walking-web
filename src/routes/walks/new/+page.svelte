<script lang="ts">
	import { enhance } from '$app/forms';
	import EmptyState from '$lib/ui/EmptyState.svelte';
	import Icon from '$lib/ui/Icon.svelte';
	import { feedback } from '$lib/ui/enhance';
	import { buildRoster, dogsByClient } from '$lib/ui/roster';
	import { DURATION_PRESETS } from '$lib/ui/schedule';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	type Values = { scheduled_at?: string; duration_minutes?: string; dog_ids?: string[]; notes?: string; field?: string };
	const v = $derived({ ...data.initial, ...((form?.values ?? {}) as Values) } as Values);
	const field = $derived((form?.values as Values | undefined)?.field);
	const groups = $derived(dogsByClient(buildRoster(data.dogs, data.clients)));
	const chosen = $derived(new Set(v.dog_ids ?? []));
	const presetChosen = $derived((DURATION_PRESETS as readonly number[]).includes(Number(v.duration_minutes)));

	const errorId = 'schedule-error';
	const invalid = (name: string) => (field === name ? { 'aria-invalid': 'true' as const, 'aria-describedby': errorId } : {});

	let formEl = $state<HTMLFormElement>();
	function focusFirstInvalid() {
		formEl?.querySelector<HTMLElement>('[aria-invalid="true"], fieldset[aria-describedby] input')?.focus();
	}
	// A failed submission without JavaScript reloads the page: focus the field then.
	$effect(() => {
		if (formEl && field) focusFirstInvalid();
	});
	function toggleGroup(e: MouseEvent, ids: string[]) {
		const boxes = ids
			.map((id) => formEl?.querySelector<HTMLInputElement>(`input[name="dog_ids"][value="${id}"]`))
			.filter((b): b is HTMLInputElement => Boolean(b));
		const allOn = boxes.every((b) => b.checked);
		for (const b of boxes) b.checked = !allOn;
		(e.currentTarget as HTMLButtonElement).setAttribute('aria-pressed', String(!allOn));
	}
</script>

<svelte:head><title>Schedule a walk · Dog Walking</title></svelte:head>

<a class="back" href="/walks"><Icon name="left" />Walks</a>
<h1>{data.bookingAgain ? 'Book again' : 'Schedule a walk'}</h1>

{#if data.dogs.length === 0}
	<EmptyState message="You need a dog before you can schedule a walk." href="/clients" action="Add a client and their dogs" />
{:else}
	{#if form?.message}<p class="problem" id={errorId} role="alert">{form.message}</p>{/if}
	<form
		class="stack card"
		method="POST"
		bind:this={formEl}
		use:enhance={feedback({ success: 'Walk scheduled', reset: false, after: (r) => { if (r.type === 'failure') queueMicrotask(focusFirstInvalid); } })}
	>
		<label>When
			<input type="datetime-local" name="scheduled_at" required value={v.scheduled_at ?? ''} {...invalid('scheduled_at')} />
		</label>

		<fieldset class="duration" aria-describedby={field === 'duration_minutes' ? errorId : undefined}>
			<legend>How long</legend>
			<div class="chips">
				{#each DURATION_PRESETS as minutes (minutes)}
					<label><input type="radio" name="duration_choice" value={String(minutes)} checked={String(minutes) === v.duration_minutes} />{minutes} min</label>
				{/each}
				<label><input type="radio" name="duration_choice" value="other" checked={!presetChosen} />Other</label>
			</div>
			<label class="other">Minutes
				<input type="number" name="duration_minutes" min="1" step="1" inputmode="numeric" value={presetChosen ? '' : (v.duration_minutes ?? '')} {...invalid('duration_minutes')} />
			</label>
		</fieldset>

		<fieldset aria-describedby={field === 'dog_ids' ? errorId : undefined}>
			<legend>Dogs</legend>
			{#each groups as group (group.client?.client_id ?? 'none')}
				<div class="dog-group">
					<div class="row between">
						<strong>{group.client?.name ?? 'Other dogs'}</strong>
						{#if group.dogs.length > 1}
							<button type="button" class="ghost" aria-pressed="false" onclick={(e) => toggleGroup(e, group.dogs.map((d) => d.dog_id))}>
								Select all<span class="sr-only"> of {group.client?.name ?? 'these'}’s dogs</span>
							</button>
						{/if}
					</div>
					{#each group.dogs as dog (dog.dog_id)}
						<label class="check">
							<input type="checkbox" name="dog_ids" value={dog.dog_id} checked={chosen.has(dog.dog_id)} />
							<span>{dog.name}
								{#if dog.notes}<span class="hint"><span class="caution"><Icon name="alert" /></span> {dog.notes}</span>{/if}
							</span>
						</label>
					{/each}
				</div>
			{/each}
		</fieldset>

		<label>Notes <textarea name="notes" placeholder="Meeting point, route, anything to remember">{v.notes ?? ''}</textarea></label>
		<div class="actions"><button class="block"><Icon name="calendar" />Schedule walk</button></div>
	</form>
{/if}

<style>
	.duration { display: grid; gap: var(--space-2); }
	/* "Other" reveals the minutes field, with or without JavaScript. */
	.duration .other { display: none; }
	.duration:has(input[value='other']:checked) .other { display: grid; }
	.dog-group + .dog-group { border-top: 1px solid var(--line); margin-top: var(--space-2); padding-top: var(--space-2); }
	.dog-group .ghost { min-height: 36px; padding: 0 var(--space-2); font-size: var(--text-sm); }
</style>
