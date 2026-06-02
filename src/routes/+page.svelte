<script lang="ts">
  import { goto } from '$app/navigation';
  import { app } from '$lib/stores/app.svelte';

  $effect(() => {
    if (!app.loading) {
      goto('/home');
    }
  });
</script>
