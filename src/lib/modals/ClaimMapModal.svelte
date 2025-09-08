<script lang="ts">
	import { kaniRequest } from '../../utils';
	import { invalidate } from '$app/navigation';

	interface ClaimMapModalState {
		show: boolean;
		appName: string;
		mode: 'add' | 'delete' | 'join';
		claimName: string;
		groupName?: string;
	}

	interface ClaimMapForm {
		claimName: string;
		groupName: string;
		claims: string;
		joinStrategy: 'csv' | 'ssv' | 'array';
	}

	const {
		claimMapModal,
		claimMapForm,
		data,
		addNotification
	}: {
		claimMapModal: ClaimMapModalState;
		claimMapForm: ClaimMapForm;
		data: any;
		addNotification: (type: 'success' | 'error' | 'info', message: string) => void;
	} = $props();

	function closeClaimMapModal() {
		claimMapModal.show = false;
		claimMapModal.appName = '';
		claimMapModal.mode = 'add';
		claimMapModal.claimName = '';
		claimMapModal.groupName = '';
		claimMapForm.claimName = '';
		claimMapForm.groupName = '';
		claimMapForm.claims = '';
		claimMapForm.joinStrategy = 'array';
	}

	async function setClaimMapJoinStrategy(appName: string, claimName: string, joinStrategy: 'csv' | 'ssv' | 'array') {
		const response = await kaniRequest(fetch, {
			path: `v1/oauth2/${appName}/_claimmap/${claimName}`,
			method: 'POST',
			body: joinStrategy
		});

		if (response.status === 200) {
			addNotification('success', `Set join strategy for claim "${claimName}" to "${joinStrategy}"`);
			closeClaimMapModal();
			await invalidate(() => true);
		} else {
			let errorMessage = 'Failed to set claim map join strategy';
			if (response.body && typeof response.body === 'string') {
				errorMessage = response.body;
			}
			addNotification('error', errorMessage);
		}
	}

	async function addClaimMap(appName: string) {
		if (!claimMapForm.claimName.trim() || !claimMapForm.groupName.trim()) {
			addNotification('error', 'Both claim name and group name are required');
			return;
		}

		const claimsArray = claimMapForm.claims
			.split(',')
			.map((s) => s.trim())
			.filter((s) => s.length > 0);

		const response = await kaniRequest(fetch, {
			path: `v1/oauth2/${appName}/_claimmap/${claimMapForm.claimName.trim()}/${claimMapForm.groupName.trim()}`,
			method: 'POST',
			body: claimsArray
		});

		if (response.status === 200) {
			addNotification('success', `Added claim map for "${claimMapForm.claimName}" and group "${claimMapForm.groupName}"`);
			closeClaimMapModal();
			await invalidate(() => true);
		} else {
			let errorMessage = 'Failed to add claim map';
			if (response.body && typeof response.body === 'string') {
				const body = response.body.replace(/"/g, '');
				if (body === 'nomatchingentries') {
					errorMessage = `Group "${claimMapForm.groupName}" does not exist. Please create the group first or check the group name.`;
				} else {
					errorMessage = body;
				}
			}
			addNotification('error', errorMessage);
		}
	}

	async function deleteClaimMap(appName: string, claimName: string, groupName: string) {
		const response = await kaniRequest(fetch, {
			path: `v1/oauth2/${appName}/_claimmap/${claimName}/${groupName}`,
			method: 'DELETE'
		});

		if (response.status === 200) {
			addNotification('success', `Removed claim map for "${claimName}" and group "${groupName}"`);
			closeClaimMapModal();
			await invalidate(() => true);
		} else {
			let errorMessage = 'Failed to remove claim map';
			if (response.body && typeof response.body === 'string') {
				errorMessage = response.body;
			}
			addNotification('error', errorMessage);
		}
	}
</script>

{#if claimMapModal.show}
	<div class="modal modal-open">
		<div class="modal-box max-w-2xl">
			<h3 class="text-lg font-bold">
				{#if claimMapModal.mode === 'add'}
					Add Claim Mapping
				{:else if claimMapModal.mode === 'join'}
					Set Claim Join Strategy
				{:else}
					Delete Claim Mapping
				{/if}
			</h3>

			{#if claimMapModal.mode === 'add'}
				<div class="space-y-4 py-4">
					<div class="form-control">
						<label class="label" for="claim-name">
							<span class="label-text font-medium">Claim Name</span>
							<span class="label-text-alt">e.g., groups, roles</span>
						</label>
						<input
							id="claim-name"
							type="text"
							class="input input-bordered"
							placeholder="groups"
							bind:value={claimMapForm.claimName}
						/>
					</div>

					<div class="form-control">
						<label class="label" for="group-name">
							<span class="label-text font-medium">Group Name</span>
							<span class="label-text-alt">Must be an existing group (e.g., generic_users@domain.com)</span>
						</label>
						<input
							id="group-name"
							type="text"
							class="input input-bordered"
							placeholder="generic_users@domain.com"
							bind:value={claimMapForm.groupName}
						/>
						{#if data.groups?.body?.length > 0}
							<div class="label">
								<span class="label-text-alt">Available groups: 
									{data.groups.body.slice(0, 3).map(g => g.attrs?.name?.[0]).filter(Boolean).join(', ')}
									{data.groups.body.length > 3 ? '...' : ''}
								</span>
							</div>
						{/if}
					</div>

					<div class="form-control">
						<label class="label" for="claims">
							<span class="label-text font-medium">Claims</span>
							<span class="label-text-alt">Comma-separated list of claim values</span>
						</label>
						<input
							id="claims"
							type="text"
							class="input input-bordered font-mono"
							placeholder="admin, user, viewer"
							bind:value={claimMapForm.claims}
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
						<div class="text-sm">
							<p class="mb-2"><strong>Claim maps</strong> define what values are sent in JWT claims for specific groups.</p>
							<p>This will map group <code class="bg-base-200 text-base-content rounded px-1">{claimMapForm.groupName || 'GROUP'}</code> to claim <code class="bg-base-200 text-base-content rounded px-1">{claimMapForm.claimName || 'CLAIM'}</code> with values:</p>
							<code class="bg-base-200 text-base-content block mt-1 rounded p-2">
								[{claimMapForm.claims.split(',').map(s => `"${s.trim()}"`).join(', ')}]
							</code>
						</div>
					</div>
				</div>

			{:else if claimMapModal.mode === 'join'}
				<div class="space-y-4 py-4">
					<p>Configure how multiple claim values should be joined for claim: <strong>{claimMapModal.claimName}</strong></p>
					
					<fieldset class="form-control">
						<legend class="label">
							<span class="label-text font-medium">Join Strategy</span>
						</legend>
						<div class="space-y-2">
							<label class="label cursor-pointer justify-start">
								<input type="radio" name="joinStrategy" value="array" class="radio radio-primary" bind:group={claimMapForm.joinStrategy} />
								<div class="ml-3">
									<span class="label-text font-medium">Array</span>
									<div class="label-text-alt">Values as JSON array: ["value1", "value2"]</div>
								</div>
							</label>
							<label class="label cursor-pointer justify-start">
								<input type="radio" name="joinStrategy" value="csv" class="radio radio-primary" bind:group={claimMapForm.joinStrategy} />
								<div class="ml-3">
									<span class="label-text font-medium">CSV</span>
									<div class="label-text-alt">Comma-separated: "value1,value2"</div>
								</div>
							</label>
							<label class="label cursor-pointer justify-start">
								<input type="radio" name="joinStrategy" value="ssv" class="radio radio-primary" bind:group={claimMapForm.joinStrategy} />
								<div class="ml-3">
									<span class="label-text font-medium">SSV</span>
									<div class="label-text-alt">Space-separated: "value1 value2"</div>
								</div>
							</label>
						</div>
					</fieldset>
				</div>

			{:else}
				<div class="py-4">
					<p>
						Are you sure you want to delete the claim mapping for claim <strong>{claimMapModal.claimName}</strong> and group <strong>{claimMapModal.groupName}</strong>?
					</p>
					<div class="bg-base-200 mt-4 rounded p-3">
						<p class="text-sm text-base-content/70">This action cannot be undone.</p>
					</div>
				</div>
			{/if}

			<div class="modal-action">
				<button class="btn btn-outline" onclick={closeClaimMapModal}>Cancel</button>
				{#if claimMapModal.mode === 'add'}
					<button
						class="btn btn-primary"
						onclick={() => addClaimMap(claimMapModal.appName)}
						disabled={!claimMapForm.claimName.trim() || !claimMapForm.groupName.trim()}
					>
						Add Claim Map
					</button>
				{:else if claimMapModal.mode === 'join'}
					<button
						class="btn btn-primary"
						onclick={() => setClaimMapJoinStrategy(claimMapModal.appName, claimMapModal.claimName, claimMapForm.joinStrategy)}
					>
						Set Join Strategy
					</button>
				{:else}
					<button
						class="btn btn-error"
						onclick={() => deleteClaimMap(claimMapModal.appName, claimMapModal.claimName, claimMapModal.groupName || '')}
					>
						Delete Claim Map
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}