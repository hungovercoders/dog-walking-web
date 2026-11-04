<script lang="ts">
	import { avatarColour, initials } from './format';

	let { name, id, size = 'md' }: { name: string; id: string; size?: 'sm' | 'md' } = $props();
</script>

<!-- Decorative: the dog's name is always shown next to it. -->
<span class="avatar" class:sm={size === 'sm'} style:background={avatarColour(id)} aria-hidden="true">{initials(name)}</span>
