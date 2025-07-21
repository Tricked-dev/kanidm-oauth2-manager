<script lang="ts">
	import Check from '$lib/icons/Check.svelte';
	import Cross from '$lib/icons/Cross.svelte';
	import Info from '$lib/icons/Info.svelte';

	let { notifications, removeNotification } = $props();
</script>

<div class="toast toast-top toast-end z-50">
	{#each notifications as notification}
		<div
			class="alert {notification.type === 'success'
				? 'alert-success'
				: notification.type === 'error'
					? 'alert-error'
					: 'alert-info'} max-w-md shadow-lg"
		>
			<div class="flex w-full items-center gap-2">
				{#if notification.type === 'success'}
					<Check />
				{:else if notification.type === 'error'}
					<Cross />
				{:else}
					<Info />
				{/if}
				<span class="flex-1 text-sm">{notification.message}</span>
				<button
					class="btn btn-sm btn-circle btn-ghost ml-auto"
					onclick={() => removeNotification(notification.id)}>✕</button
				>
			</div>
		</div>
	{/each}
</div>
