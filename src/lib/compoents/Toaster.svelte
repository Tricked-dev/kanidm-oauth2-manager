<script lang="ts">
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
			<div class="flex items-center gap-2 w-full">
				{#if notification.type === 'success'}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-6 w-6 shrink-0 stroke-current"
						fill="none"
						viewBox="0 0 24 24"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
						/></svg
					>
				{:else if notification.type === 'error'}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-6 w-6 shrink-0 stroke-current"
						fill="none"
						viewBox="0 0 24 24"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
						/></svg
					>
				{:else}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						class="h-6 w-6 shrink-0 stroke-current"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						></path></svg
					>
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
