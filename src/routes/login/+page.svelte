<script lang="ts">
  import { goto } from '$app/navigation';
  import { api } from '$lib/api/client';

  let email = $state('');
  let password = $state('');
  let error = $state('');
  let loading = $state(false);

  async function handleLogin() {
    error = '';
    if (!email || !password) {
      error = 'Inserisci email e password.';
      return;
    }
    loading = true;
    try {
      await api.login(email, password);
      goto('/');
    } catch (e) {
      error = e instanceof Error ? e.message : 'Errore di login.';
    } finally {
      loading = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') handleLogin();
  }
</script>

<svelte:head>
  <title>Login - FattureHub</title>
</svelte:head>

<div class="flex min-h-[70vh] items-center justify-center">
  <div class="w-full max-w-sm rounded-lg border bg-card p-8 shadow-sm">
    <div class="mb-6 text-center">
      <h1 class="text-2xl font-bold">FattureHub</h1>
      <p class="mt-1 text-sm text-muted-foreground">Accedi al tuo account</p>
    </div>

    {#if error}
      <div class="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
        {error}
      </div>
    {/if}

    <form onsubmit={(e) => { e.preventDefault(); handleLogin(); }} class="space-y-4">
      <div>
        <label for="email" class="block text-sm font-medium">Email</label>
        <input
          id="email"
          type="email"
          bind:value={email}
          onkeydown={handleKeydown}
          placeholder="nome@esempio.com"
          class="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          autocomplete="email"
        />
      </div>

      <div>
        <label for="password" class="block text-sm font-medium">Password</label>
        <input
          id="password"
          type="password"
          bind:value={password}
          onkeydown={handleKeydown}
          placeholder="••••••••"
          class="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          autocomplete="current-password"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        class="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? 'Accesso in corso...' : 'Accedi'}
      </button>
    </form>

    <p class="mt-4 text-center text-xs text-muted-foreground">
      Non hai un account? La registrazione è disponibile solo tramite il sito web.
    </p>
  </div>
</div>
