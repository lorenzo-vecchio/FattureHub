<script lang="ts">
  import * as Card from '$lib/components/ui/card';

  let { errors }: { errors: string[] } = $props();
</script>

<Card.Root class="border-destructive/50 bg-destructive/5 mt-4">
  <Card.Content class="py-3">
    <p class="text-sm text-destructive">
      <span class="font-medium">{errors.length} file non analizzati:</span>
      {errors.slice(0, 5).join(', ')}{errors.length > 5 ? ` e altri ${errors.length - 5}...` : ''}
    </p>
  </Card.Content>
</Card.Root>
