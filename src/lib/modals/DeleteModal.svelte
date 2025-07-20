<script lang="ts">
	import { kaniRequest } from '../../utils';
	import { invalidate } from '$app/navigation';

	interface DeleteModalState {
		show: boolean;
		appName: string;
		displayName: string;
	}

	const {
		deleteModal,
		addNotification
	}: {
		deleteModal: DeleteModalState;
		addNotification: (type: 'success' | 'error' | 'info', message: string) => void;
	} = $props();

	function closeDeleteModal() {
		deleteModal.show = false;
		deleteModal.appName = '';
		deleteModal.displayName = '';
	}

	async function deleteApplication() {
		const response = await kaniRequest(fetch, {
			path: `v1/oauth2/${deleteModal.appName}`,
			method: 'DELETE'
		});

		if (response.status === 200) {
			addNotification('success', `Successfully deleted application: ${deleteModal.displayName}`);
			closeDeleteModal();
			await invalidate(() => true);
		} else {
			let errorMessage = 'Failed to delete application';
			if (response.body && typeof response.body === 'string') {
				errorMessage = response.body;
			}
			addNotification('error', errorMessage);
		}
	}
</script>

{#if deleteModal.show}
	<div class="modal modal-open">
		<div class="modal-box">
			<h3 class="text-lg font-bold">Delete Application</h3>

			<div class="py-4">
				<div class="alert alert-warning mb-4">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-6 w-6 shrink-0 stroke-current"
						fill="none"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z"
						/>
					</svg>
					<div>
						<div class="font-bold">Warning: This action cannot be undone!</div>
						<div class="text-sm">
							This will permanently delete the OAuth2 application and all its configuration.
						</div>
					</div>
				</div>

				<p class="mb-2 text-lg">Are you sure you want to delete the application:</p>
				<div class="bg-base-200 rounded p-3">
					<div class="text-xl font-bold">{deleteModal.displayName}</div>
					<div class="text-base-content/70 font-mono text-sm">({deleteModal.appName})</div>
				</div>
			</div>

			<div class="modal-action">
				<button class="btn btn-outline" onclick={closeDeleteModal}>Cancel</button>
				<button class="btn btn-error" onclick={() => deleteApplication()}>
					Delete Application
				</button>
			</div>
		</div>
	</div>
{/if}