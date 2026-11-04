<script lang="ts">
	import { page } from '$app/state';
	import { errorCopy } from '$lib/ui/feedback';

	const copy = $derived(errorCopy(page.status, page.error?.message));
</script>

<svelte:head><title>{copy.title} · Dog Walking</title></svelte:head>

<div class="empty-state" role="alert">
	<h1>{copy.title}</h1>
	<p>{copy.detail}</p>
	{#if page.status === 401 || page.status === 403}
		<a class="button" href="/sign-in">Sign in</a>
	{:else}
		<a class="button" href="/">Back to today</a>
	{/if}
</div>
