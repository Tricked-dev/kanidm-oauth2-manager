<script lang="ts">
	import { kaniRequest } from '../../utils';
	import { invalidate } from '$app/navigation';

	interface ScopeMapModalState {
		show: boolean;
		appName: string;
		mode: 'add' | 'delete';
		groupName?: string;
	}

	interface ScopeMapForm {
		groupName: string;
		scopes: string;
	}

	const {
		scopeMapModal,
		scopeMapForm,
		data,
		addNotification
	}: {
		scopeMapModal: ScopeMapModalState;
		scopeMapForm: ScopeMapForm;
		data: any;
		addNotification: (type: 'success' | 'error' | 'info', message: string) => void;
	} = $props();

	function closeScopeMapModal() {
		scopeMapModal.show = false;
		scopeMapModal.appName = '';
		scopeMapModal.mode = 'add';
		scopeMapForm.groupName = '';
		scopeMapForm.scopes = 'email, profile, openid, groups';
	}

	async function addScopeMap(appName: string) {
		if (!scopeMapForm.groupName.trim()) {
			addNotification('error', 'Group name is required');
			return;
		}

		const scopesArray = scopeMapForm.scopes
			.split(',')
			.map((s) => `${s.trim()}`)
			.filter((s) => s.length > 2);

		const response = await kaniRequest(fetch, {
			path: `v1/oauth2/${appName}/_scopemap/${scopeMapForm.groupName.trim()}`,
			method: 'POST',
			body: scopesArray
		});

		if (response.status === 200) {
			addNotification('success', `Added scope map for ${scopeMapForm.groupName}`);
			closeScopeMapModal();
			await invalidate(() => true);
		} else {
			let errorMessage = 'Failed to add scope map';
			if (response.body && typeof response.body === 'string') {
				errorMessage = response.body;
			}
			addNotification('error', errorMessage);
		}
	}

	async function deleteScopeMap(appName: string, groupName: string) {
		const response = await kaniRequest(fetch, {
			path: `v1/oauth2/${appName}/_scopemap/${groupName}`,
			method: 'DELETE'
		});

		if (response.status === 200) {
			addNotification('success', `Removed scope map for ${groupName}`);
			closeScopeMapModal();
			await invalidate(() => true);
		} else {
			let errorMessage = 'Failed to remove scope map';
			if (response.body && typeof response.body === 'string') {
				errorMessage = response.body;
			}
			addNotification('error', errorMessage);
		}
	}
</script>

{#if scopeMapModal.show}
	<div class="modal modal-open">
		<div class="modal-box">
			<h3 class="text-lg font-bold">
				{scopeMapModal.mode === 'add' ? 'Add Scope Mapping' : 'Delete Scope Mapping'}
			</h3>

			{#if scopeMapModal.mode === 'add'}
				<div class="space-y-4 py-4">
					<div class="form-control">
						<label class="label" for="group-name">
							<span class="label-text font-medium">Group Name</span>
							<span class="label-text-alt">e.g., generic_users@domain.com</span>
						</label>
						<input
							id="group-name"
							type="text"
							class="input input-bordered"
							placeholder="generic_users@domain.com"
							bind:value={scopeMapForm.groupName}
						/>
					</div>

					<div class="form-control">
						<label class="label" for="scopes">
							<span class="label-text font-medium">Scopes</span>
							<span class="label-text-alt">Comma-separated list</span>
						</label>
						<input
							id="scopes"
							type="text"
							class="input input-bordered font-mono"
							placeholder="email, profile, openid, groups"
							bind:value={scopeMapForm.scopes}
						/>
					</div>

					<div class="alert alert-info">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							class="stroke-info h-6 w-6 shrink-0"
							><path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							></path></svg
						>
						<span class="text-sm">
							This will create a scope mapping: <code
								class="bg-base-200 text-base-content rounded p-1"
								>{scopeMapForm.groupName}: {'{' +
									scopeMapForm.scopes
										.split(',')
										.map((s) => `"${s.trim()}"`)
										.join(', ') +
									'}'}</code
							>
						</span>
					</div>
				</div>
			{:else}
				<div class="py-4">
					<p>
						Are you sure you want to delete the scope mapping for <strong
							>{scopeMapModal.groupName}</strong
						>?
					</p>
					<div class="bg-base-200 mt-4 rounded p-3">
						<code class="text-sm break-all">
							{data.apps.body
								.find((app: any) => app.attrs?.name[0] === scopeMapModal.appName)
								?.attrs?.oauth2_rs_scope_map?.find((scope: any) =>
									scope.startsWith(scopeMapModal.groupName || '')
								) || ''}
						</code>
					</div>
				</div>
			{/if}

			<div class="modal-action">
				<button class="btn btn-outline" onclick={closeScopeMapModal}>Cancel</button>
				{#if scopeMapModal.mode === 'add'}
					<button
						class="btn btn-primary"
						onclick={() => addScopeMap(scopeMapModal.appName)}
						disabled={!scopeMapForm.groupName.trim()}
					>
						Add Scope Map
					</button>
				{:else}
					<button
						class="btn btn-error"
						onclick={() => deleteScopeMap(scopeMapModal.appName, scopeMapModal.groupName || '')}
					>
						Delete Scope Map
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}