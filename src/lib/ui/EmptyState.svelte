<script lang="ts">
	import type { Snippet } from 'svelte';

	let { message, href, action, children }: { message: string; href?: string; action?: string; children?: Snippet } =
		$props();
</script>

<div class="empty-state">
	<p>{message}</p>
	{#if children}{@render children()}{:else if href && action}<a class="button" {href}>{action}</a>{/if}
</div>
