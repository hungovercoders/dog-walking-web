<script lang="ts">
	import Icon from './Icon.svelte';
	import { toasts } from './toasts.svelte';
</script>

<!-- Always in the DOM, so screen readers are listening before the first toast. -->
<div class="toaster" role="status" aria-live="polite">
	{#each toasts.items as toast (toast.id)}
		<div class="toast {toast.kind}">
			<Icon name={toast.kind === 'ok' ? 'check' : 'alert'} />
			<span>{toast.text}</span>
		</div>
	{/each}
</div>
