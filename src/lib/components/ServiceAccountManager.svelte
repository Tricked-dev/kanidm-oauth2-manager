<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { kaniRequest } from '../../utils';

	const { data, addNotification } = $props();

	let showCreateForm = $state(false);
	let createValues = $state({ name: '', displayName: '' });

	let tokenModal = $state<{
		show: boolean;
		accountName: string;
		label: string;
		expiry: string;
		readWrite: boolean;
		generatedToken: string;
	}>({
		show: false,
		accountName: '',
		label: '',
		expiry: '',
		readWrite: false,
		generatedToken: ''
	});

	let tokenListModal = $state<{
		show: boolean;
		accountName: string;
		tokens: Array<{ uuid: string; label: string; expiry?: string | null }>;
	}>({
		show: false,
		accountName: '',
		tokens: []
	});

	let deleteModal = $state<{ show: boolean; accountName: string }>({
		show: false,
		accountName: ''
	});

	async function createServiceAccount() {
		if (!createValues.name || !createValues.displayName) return;

		const response = await kaniRequest(fetch, {
			path: 'v1/service_account',
			method: 'POST',
			body: {
				attrs: {
					name: [createValues.name.trim().toLowerCase()],
					displayname: [createValues.displayName.trim()]
				}
			}
		});

		if (response.status === 200) {
			const name = createValues.name;
			showCreateForm = false;
			createValues = { name: '', displayName: '' };
			addNotification('success', `Created service account: ${name}`);
			await invalidateAll();
		} else {
			let msg = 'Failed to create service account';
			if (typeof response.body === 'string') msg = response.body.replace(/"/g, '');
			else if (response.body && typeof response.body === 'object' && 'invalidattribute' in response.body)
				msg = (response.body as any).invalidattribute;
			addNotification('error', msg);
		}
	}

	async function deleteServiceAccount(name: string) {
		const response = await kaniRequest(fetch, {
			path: `v1/service_account/${name}`,
			method: 'DELETE'
		});

		deleteModal = { show: false, accountName: '' };
		await invalidateAll();

		if (response.status === 200) {
			addNotification('success', `Deleted service account: ${name}`);
		} else {
			addNotification('error', `Failed to delete ${name}`);
		}
	}

	function openTokenModal(accountName: string) {
		tokenModal = {
			show: true,
			accountName,
			label: '',
			expiry: '',
			readWrite: false,
			generatedToken: ''
		};
	}

	function closeTokenModal() {
		// If a token was generated, invalidate so the list reflects it
		if (tokenModal.generatedToken) invalidateAll();
		tokenModal = {
			show: false,
			accountName: '',
			label: '',
			expiry: '',
			readWrite: false,
			generatedToken: ''
		};
	}

	async function generateToken() {
		if (!tokenModal.label.trim()) {
			addNotification('error', 'Token label is required');
			return;
		}

		const body: Record<string, any> = {
			label: tokenModal.label.trim(),
			read_write: tokenModal.readWrite
		};

		if (tokenModal.expiry) {
			body.expiry = Math.floor(new Date(tokenModal.expiry).getTime() / 1000);
		}

		const response = await kaniRequest(fetch, {
			path: `v1/service_account/${tokenModal.accountName}/_api_token`,
			method: 'POST',
			body
		});

		if (response.status === 200) {
			// Token value is only returned at generation time — strip surrounding quotes if JSON string
			const raw = response.body;
			tokenModal.generatedToken =
				typeof raw === 'string' ? raw.replace(/^"|"$/g, '') : JSON.stringify(raw);
		} else {
			let msg = 'Failed to generate token';
			if (typeof response.body === 'string') msg = response.body.replace(/"/g, '');
			addNotification('error', msg);
		}
	}

	async function copyToken() {
		try {
			await navigator.clipboard.writeText(tokenModal.generatedToken);
			addNotification('success', 'Token copied to clipboard');
		} catch {
			addNotification('error', 'Failed to copy — please select and copy manually');
		}
	}

	async function openTokenList(accountName: string) {
		const response = await kaniRequest(fetch, {
			path: `v1/service_account/${accountName}/_api_token`,
			method: 'GET'
		});

		if (response.status === 200) {
			tokenListModal = {
				show: true,
				accountName,
				tokens: Array.isArray(response.body) ? response.body : []
			};
		} else {
			addNotification('error', 'Failed to fetch tokens');
		}
	}

	async function revokeToken(tokenId: string) {
		const { accountName } = tokenListModal;
		const response = await kaniRequest(fetch, {
			path: `v1/service_account/${accountName}/_api_token/${tokenId}`,
			method: 'DELETE'
		});

		if (response.status === 200) {
			addNotification('success', 'Token revoked');
			await openTokenList(accountName);
		} else {
			addNotification('error', 'Failed to revoke token');
		}
	}

	function formatExpiry(expiry: string | null | undefined): string {
		if (!expiry) return 'Never';
		try {
			return new Date(expiry).toLocaleString();
		} catch {
			return expiry;
		}
	}
</script>

<!-- Delete confirmation modal -->
{#if deleteModal.show}
	<div class="modal modal-open">
		<div class="modal-box">
			<h3 class="text-lg font-bold">Delete Service Account</h3>
			<p class="py-4">
				Are you sure you want to delete <strong>{deleteModal.accountName}</strong>? This will also
				revoke all its API tokens.
			</p>
			<div class="modal-action">
				<button
					class="btn btn-outline"
					onclick={() => (deleteModal = { show: false, accountName: '' })}
				>
					Cancel
				</button>
				<button class="btn btn-error" onclick={() => deleteServiceAccount(deleteModal.accountName)}>
					Delete
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Generate API token modal -->
{#if tokenModal.show}
	<div class="modal modal-open">
		<div class="modal-box max-w-lg">
			<h3 class="text-lg font-bold">
				{tokenModal.generatedToken ? 'Copy Your Token' : `Generate API Token — ${tokenModal.accountName}`}
			</h3>

			{#if tokenModal.generatedToken}
				<!-- Show the generated token -->
				<div class="mt-4 space-y-4">
					<div class="alert alert-warning">
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
								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
							/>
						</svg>
						<span>This token will <strong>not</strong> be shown again. Copy it now.</span>
					</div>

					<div class="form-control">
						<label class="label">
							<span class="label-text font-medium">API Token</span>
						</label>
						<textarea
							class="textarea textarea-bordered font-mono text-xs"
							rows="5"
							readonly
							value={tokenModal.generatedToken}
						></textarea>
					</div>

					<button class="btn btn-primary w-full" onclick={copyToken}>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="mr-2 h-4 w-4"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
							/>
						</svg>
						Copy Token
					</button>
				</div>

				<div class="modal-action">
					<button class="btn btn-outline" onclick={closeTokenModal}>Done</button>
				</div>
			{:else}
				<!-- Token generation form -->
				<div class="mt-4 space-y-4">
					<div class="form-control">
						<label class="label" for="token-label">
							<span class="label-text font-medium">Label</span>
							<span class="label-text-alt">Identifies this token</span>
						</label>
						<input
							id="token-label"
							type="text"
							class="input input-bordered"
							placeholder="e.g. home-automation-script"
							bind:value={tokenModal.label}
						/>
					</div>

					<div class="form-control">
						<label class="label" for="token-expiry">
							<span class="label-text font-medium">Expiry</span>
							<span class="label-text-alt">Leave blank for no expiry</span>
						</label>
						<input
							id="token-expiry"
							type="datetime-local"
							class="input input-bordered"
							bind:value={tokenModal.expiry}
						/>
					</div>

					<div class="form-control">
						<label class="label cursor-pointer justify-start gap-4">
							<input
								type="checkbox"
								class="checkbox"
								bind:checked={tokenModal.readWrite}
							/>
							<span class="label-text">Read-write token (default is read-only)</span>
						</label>
					</div>
				</div>

				<div class="modal-action">
					<button class="btn btn-outline" onclick={closeTokenModal}>Cancel</button>
					<button
						class="btn btn-primary"
						onclick={generateToken}
						disabled={!tokenModal.label.trim()}
					>
						Generate
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}

<!-- Token list modal -->
{#if tokenListModal.show}
	<div class="modal modal-open">
		<div class="modal-box max-w-lg">
			<h3 class="text-lg font-bold">API Tokens — {tokenListModal.accountName}</h3>

			<div class="mt-4">
				{#if tokenListModal.tokens.length === 0}
					<p class="text-base-content/60 py-4 text-center italic">No tokens issued</p>
				{:else}
					<div class="space-y-2">
						{#each tokenListModal.tokens as token}
							<div class="bg-base-200 flex items-center justify-between rounded-lg p-3">
								<div>
									<div class="font-medium">{token.label}</div>
									<div class="text-base-content/60 text-xs">
										Expires: {formatExpiry(token.expiry)}
									</div>
									<div class="text-base-content/40 font-mono text-xs">{token.uuid}</div>
								</div>
								<button
									class="btn btn-sm btn-error ml-4"
									onclick={() => revokeToken(token.uuid)}
								>
									Revoke
								</button>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<div class="modal-action">
				<button
					class="btn btn-outline"
					onclick={() => (tokenListModal = { show: false, accountName: '', tokens: [] })}
				>
					Close
				</button>
			</div>
		</div>
	</div>
{/if}

<div class="container mx-auto px-4 py-8">
	<div class="mb-8 flex items-center justify-between">
		<h1 class="text-3xl font-bold">Service Accounts</h1>
		<button class="btn btn-primary" onclick={() => (showCreateForm = !showCreateForm)}>
			{showCreateForm ? 'Cancel' : 'Create Service Account'}
		</button>
	</div>

	{#if showCreateForm}
		<div class="card bg-base-200 mx-auto mb-8 max-w-2xl">
			<div class="card-body">
				<h2 class="card-title">Create Service Account</h2>

				<div class="form-control">
					<label class="label" for="sa-name">
						<span class="label-text font-medium">Name</span>
						<span class="label-text-alt">Unique identifier (lowercase, no spaces)</span>
					</label>
					<input
						id="sa-name"
						type="text"
						class="input input-bordered"
						placeholder="my-service-account"
						bind:value={createValues.name}
					/>
				</div>

				<div class="form-control">
					<label class="label" for="sa-display-name">
						<span class="label-text font-medium">Display Name</span>
						<span class="label-text-alt">Human-readable description</span>
					</label>
					<input
						id="sa-display-name"
						type="text"
						class="input input-bordered"
						placeholder="My Service Account"
						bind:value={createValues.displayName}
					/>
				</div>

				<div class="card-actions mt-6 justify-end">
					<button class="btn btn-outline" onclick={() => (showCreateForm = false)}>Cancel</button>
					<button
						class="btn btn-primary"
						onclick={createServiceAccount}
						disabled={!createValues.name || !createValues.displayName}
					>
						Create
					</button>
				</div>
			</div>
		</div>
	{/if}

	<div class="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
		{#each data.serviceAccounts?.body || [] as account}
			{@const accountName = account.attrs?.name?.[0]}
			<div class="card bg-base-300 flex w-full flex-col">
				<div class="card-body flex flex-1 flex-col">
					<h2 class="card-title mb-4">
						{account.attrs?.displayname?.[0] || accountName}
					</h2>

					<div class="flex-1 space-y-3">
						<div class="bg-base-100 rounded-lg p-3">
							<div class="text-base-content/70 mb-1 text-xs font-medium">Name</div>
							<div class="font-mono text-sm">{accountName}</div>
						</div>

						<div class="bg-base-100 rounded-lg p-3">
							<div class="text-base-content/70 mb-1 text-xs font-medium">UUID</div>
							<code class="text-xs break-all">{account.attrs?.uuid?.[0]}</code>
						</div>

						{#if account.attrs?.memberof?.length}
							<div class="bg-base-100 rounded-lg p-3">
								<div class="text-base-content/70 mb-2 text-xs font-medium">Member Of</div>
								<div class="flex flex-wrap gap-1">
									{#each account.attrs.memberof as group}
										<span class="badge badge-outline badge-xs">{group.split('@')[0]}</span>
									{/each}
								</div>
							</div>
						{/if}
					</div>

					<div class="card-actions border-base-content/10 mt-4 flex-shrink-0 border-t pt-4">
						<div class="flex w-full gap-2">
							<button
								class="btn btn-sm btn-primary flex-1"
								onclick={() => openTokenModal(accountName)}
							>
								Generate Token
							</button>
							<button
								class="btn btn-sm btn-outline flex-1"
								onclick={() => openTokenList(accountName)}
							>
								View Tokens
							</button>
							<button
								class="btn btn-sm btn-error btn-outline"
								onclick={() => (deleteModal = { show: true, accountName })}
							>
								Delete
							</button>
						</div>
					</div>
				</div>
			</div>
		{:else}
			<div class="col-span-full py-16 text-center">
				<p class="text-base-content/50 text-lg">No service accounts yet</p>
				<p class="text-base-content/40 mt-2 text-sm">
					Create one to generate API tokens for scripts and integrations.
				</p>
			</div>
		{/each}
	</div>
</div>
