<script lang="ts">
	import { enhance } from '$app/forms';
	import { CANCELLATION_REASONS } from '$lib/api';
	import Icon from '$lib/ui/Icon.svelte';
	import { feedback } from '$lib/ui/enhance';

	/** `label` names the walk in the confirm button: "09:00 walk with Biscuit, Rex". */
	let { id, label, action }: { id: string; label: string; action: string } = $props();

	let dialog: HTMLDialogElement;
	let reason = $state('');
	let returnTo: HTMLElement | null = null;

	/** Open as a bottom sheet (phones) or dialog; focus returns to `from` on close. */
	export function open(from?: HTMLElement | null) {
		returnTo = from ?? (document.activeElement as HTMLElement | null);
		reason = '';
		dialog.showModal();
	}

	function close() {
		dialog.close();
	}
</script>

<dialog class="sheet" bind:this={dialog} aria-labelledby="cancel-title-{id}" onclose={() => returnTo?.focus()}>
	<form
		class="sheet-body"
		method="POST"
		{action}
		use:enhance={feedback({
			success: 'Walk cancelled',
			toastErrors: true,
			after: (result) => {
				if (result.type !== 'failure') close();
			}
		})}
	>
		<h2 id="cancel-title-{id}">Cancel this walk?</h2>
		<p class="meta">{label[0].toUpperCase() + label.slice(1)}. Cancelling can’t be undone.</p>
		<fieldset class="choice-cards">
			<legend>Why is it cancelled?</legend>
			{#each CANCELLATION_REASONS as r (r.value)}
				<label><input type="radio" name="reason" value={r.value} required bind:group={reason} />{r.label}</label>
			{/each}
		</fieldset>
		<div class="actions">
			<button class="danger solid block" disabled={!reason}><Icon name="x" />Cancel {label}</button>
			<button type="button" class="secondary block" onclick={close}>Keep walk</button>
		</div>
	</form>
</dialog>
