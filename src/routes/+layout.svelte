<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import { browser } from '$app/environment';
	import { ClerkProvider, UserButton } from 'svelte-clerk';
	import type { Snippet } from 'svelte';
	import Icon, { type IconName } from '$lib/ui/Icon.svelte';
	import BrandMark from '$lib/ui/BrandMark.svelte';
	import Toaster from '$lib/ui/Toaster.svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	// Tell the server the walker's zone once; loads then render in it, so the
	// times the browser hydrates match what was served. At most one reload per
	// page load: if the server still answers with another zone (one it cannot
	// format in), the page stays on that zone rather than reloading forever.
	let tzSynced = false;
	$effect(() => {
		if (!browser || tzSynced) return;
		const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
		if (!zone || zone === data.tz) return;
		tzSynced = true;
		document.cookie = `tz=${encodeURIComponent(zone)}; path=/; max-age=31536000; SameSite=Lax`;
		invalidateAll();
	});

	const nav: { href: string; label: string; icon: IconName }[] = [
		{ href: '/', label: 'Today', icon: 'today' },
		{ href: '/walks', label: 'Walks', icon: 'calendar' },
		{ href: '/clients', label: 'Clients', icon: 'users' }
	];
	const current = (href: string) =>
		href === '/'
			? page.url.pathname === '/'
			: page.url.pathname.startsWith(href) || (href === '/clients' && page.url.pathname.startsWith('/dogs'));
	// SSR auth state from buildClerkProps; the provider reads it at runtime but
	// its typed props omit it, so it goes in by spread.
	const clerkProps = $derived(
		('initialState' in data ? { initialState: data.initialState } : {}) as Record<string, unknown>
	);
</script>

{#snippet shell()}
	<header class="topbar">
		<a class="brand" href="/"><BrandMark /> Dog Walking</a>
		{#if data.signedIn}
			<nav class="primary-nav" aria-label="Primary">
				{#each nav as item (item.href)}
					<a href={item.href} aria-current={current(item.href) ? 'page' : undefined}>
						<Icon name={item.icon} />{item.label}
					</a>
				{/each}
			</nav>
			<div class="user">
				{#if data.devBearer}
					<span class="pill" title="API_DEV_BEARER is set: signed in without Clerk">dev</span>
				{:else}
					<UserButton />
				{/if}
			</div>
		{/if}
	</header>
	<main>
		{@render children()}
	</main>
	<Toaster />
{/snippet}

{#if data.devBearer}
	{@render shell()}
{:else}
	<ClerkProvider {...clerkProps}>
		{@render shell()}
	</ClerkProvider>
{/if}
