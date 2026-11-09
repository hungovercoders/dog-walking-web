<script lang="ts">
	import { page } from '$app/state';
	import { SignOutButton } from 'svelte-clerk';
	import { errorCopy } from '$lib/ui/feedback';

	const refused = $derived(page.status === 401 || page.status === 403);
	const signedIn = $derived(Boolean(page.data.signedIn));
	const copy = $derived(errorCopy(page.status, page.error?.message, signedIn));
</script>

<svelte:head><title>{copy.title} · Dog Walking</title></svelte:head>

<div class="empty-state" role="alert">
	<h1>{copy.title}</h1>
	<p>{copy.detail}</p>
	{#if refused && signedIn && !page.data.devBearer}
		<!-- The sign-in page has nothing to offer someone Clerk already knows,
		     so the way out of a refused session is to end it. -->
		<SignOutButton class="button" redirectUrl="/sign-in" />
	{:else if refused && !signedIn}
		<a class="button" href="/sign-in">Sign in</a>
	{:else}
		<a class="button" href="/">Back to today</a>
	{/if}
</div>
