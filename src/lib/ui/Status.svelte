<script lang="ts">
	import type { WalkStatus } from '$lib/api';
	import Icon from './Icon.svelte';
	import { STATUS_META } from './walk';

	let { status }: { status: WalkStatus } = $props();
	const meta = $derived(STATUS_META[status]);
</script>

<span class="status {status}"><Icon name={meta.icon} />{meta.label}</span>
