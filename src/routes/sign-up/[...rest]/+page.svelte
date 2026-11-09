<script lang="ts">
	import { SignUp } from 'svelte-clerk';
</script>

<section class="auth">
	<SignUp routing="path" path="/sign-up" signInUrl="/sign-in" fallbackRedirectUrl="/" />
</section>
