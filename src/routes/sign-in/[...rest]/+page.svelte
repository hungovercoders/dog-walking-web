<script lang="ts">
	import { SignIn } from 'svelte-clerk';
</script>

<section class="auth">
	<SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" fallbackRedirectUrl="/" />
</section>
