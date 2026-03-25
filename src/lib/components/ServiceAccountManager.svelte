<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { kaniRequest } from '../../utils';

	const { data, addNotification } = $props();

	// Local copy of accounts so we can update group memberships immediately
	// without waiting for invalidateAll() to round-trip through the server.
	let localAccounts = $state<any[]>(data.serviceAccounts?.body || []);
	$effect(() => {
		localAccounts = data.serviceAccounts?.body || [];
	});

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

	let groupModal = $state<{
		show: boolean;
		accountName: string;
		groupName: string;
		mode: 'add' | 'remove';
	}>({
		show: false,
		accountName: '',
		groupName: '',
		mode: 'add'
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

		if (response.status === 200) {
			localAccounts = localAccounts.filter((a: any) => a.attrs?.name?.[0] !== name);
			addNotification('success', `Deleted service account: ${name}`);
			invalidateAll();
		} else {
			addNotification('error', `Failed to delete ${name}`);
		}
	}

	function openGroupModal(accountName: string, mode: 'add' | 'remove', groupName = '') {
		groupModal = { show: true, accountName, groupName, mode };
	}

	async function submitGroupChange() {
		if (!groupModal.groupName) {
			addNotification('error', 'Group name is required');
			return;
		}

		const response = await kaniRequest(fetch, {
			path: `v1/group/${groupModal.groupName}/_attr/member`,
			method: groupModal.mode === 'add' ? 'POST' : 'DELETE',
			body: [groupModal.accountName]
		});

		const { accountName, groupName, mode } = groupModal;
		groupModal = { show: false, accountName: '', groupName: '', mode: 'add' };

		if (response.status === 200) {
			// Optimistically update local state so the card reflects the change
			// immediately, before invalidateAll() re-fetches from the server.
			const idx = localAccounts.findIndex((a: any) => a.attrs?.name?.[0] === accountName);
			if (idx >= 0) {
				const account = localAccounts[idx];
				const current: string[] = account.attrs?.memberof || [];
				const updated =
					mode === 'add'
						? [...current, groupName]
						: current.filter((g: string) => g !== groupName);
				localAccounts[idx] = {
					...account,
					attrs: { ...account.attrs, memberof: updated }
				};
			}

			addNotification(
				'success',
				mode === 'add'
					? `Added ${accountName} to ${groupName}`
					: `Removed ${accountName} from ${groupName}`
			);
			invalidateAll(); // background sync — don't await
		} else {
			let msg = mode === 'add' ? 'Failed to add to group' : 'Failed to remove from group';
			if (typeof response.body === 'string') msg = response.body.replace(/"/g, '');
			addNotification('error', msg);
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

<!-- Group membership modal -->
{#if groupModal.show}
	<div class="modal modal-open">
		<div class="modal-box">
			<h3 class="text-lg font-bold">
				{groupModal.mode === 'add'
					? `Add ${groupModal.accountName} to Group`
					: `Remove ${groupModal.accountName} from Group`}
			</h3>

			<div class="mt-4">
				{#if groupModal.mode === 'add'}
					<fieldset class="fieldset">
						<legend class="fieldset-legend">Group Name</legend>
						<input
							type="text"
							class="input w-full"
							placeholder="my-group"
							bind:value={groupModal.groupName}
						/>
						<p class="fieldset-label">Name of the group to join</p>
					</fieldset>
				{:else}
					<p class="text-base-content/70 text-sm">
						Remove from group: <strong>{groupModal.groupName}</strong>
					</p>
				{/if}
			</div>

			<div class="modal-action">
				<button
					class="btn btn-outline"
					onclick={() => (groupModal = { show: false, accountName: '', groupName: '', mode: 'add' })}
				>
					Cancel
				</button>
				<button
					class="btn {groupModal.mode === 'add' ? 'btn-primary' : 'btn-error'}"
					onclick={submitGroupChange}
					disabled={groupModal.mode === 'add' && !groupModal.groupName.trim()}
				>
					{groupModal.mode === 'add' ? 'Add to Group' : 'Remove from Group'}
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
				{tokenModal.generatedToken
					? 'Copy Your Token'
					: `Generate API Token — ${tokenModal.accountName}`}
			</h3>

			{#if tokenModal.generatedToken}
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

					<fieldset class="fieldset">
						<legend class="fieldset-legend">API Token</legend>
						<textarea
							class="textarea w-full font-mono text-xs"
							rows="5"
							readonly
							value={tokenModal.generatedToken}
						></textarea>
					</fieldset>

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
				<div class="mt-4 space-y-4">
					<fieldset class="fieldset">
						<legend class="fieldset-legend">Label</legend>
						<input
							type="text"
							class="input w-full"
							placeholder="e.g. home-automation-script"
							bind:value={tokenModal.label}
						/>
						<p class="fieldset-label">Identifies this token</p>
					</fieldset>

					<fieldset class="fieldset">
						<legend class="fieldset-legend">Expiry</legend>
						<input
							type="datetime-local"
							class="input w-full"
							bind:value={tokenModal.expiry}
						/>
						<p class="fieldset-label">Leave blank for no expiry</p>
					</fieldset>

					<label class="flex cursor-pointer items-center gap-3">
						<input type="checkbox" class="checkbox" bind:checked={tokenModal.readWrite} />
						<span class="text-sm">Read-write token (default is read-only)</span>
					</label>
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
								<button class="btn btn-sm btn-error ml-4" onclick={() => revokeToken(token.uuid)}>
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

				<fieldset class="fieldset">
					<legend class="fieldset-legend">Name</legend>
					<input
						type="text"
						class="input w-full"
						placeholder="my-service-account"
						bind:value={createValues.name}
					/>
					<p class="fieldset-label">Unique identifier (lowercase, no spaces)</p>
				</fieldset>

				<fieldset class="fieldset">
					<legend class="fieldset-legend">Display Name</legend>
					<input
						type="text"
						class="input w-full"
						placeholder="My Service Account"
						bind:value={createValues.displayName}
					/>
					<p class="fieldset-label">Human-readable description</p>
				</fieldset>

				<div class="card-actions mt-4 justify-end">
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
		{#each localAccounts as account}
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
							<div class="mb-2 flex items-center justify-between">
								<div class="text-base-content/70 text-xs font-medium">Group Membership</div>
								<button
									class="btn btn-xs btn-primary"
									onclick={() => openGroupModal(accountName, 'add')}
								>
									Add to Group
								</button>
							</div>
							{#if account.attrs?.memberof?.length}
								<div class="space-y-1">
									{#each account.attrs.memberof as group}
										<div class="bg-base-200 flex items-center justify-between rounded p-2">
											<span class="text-xs">{group.split('@')[0]}</span>
											<button
												class="btn btn-xs btn-error"
												onclick={() => openGroupModal(accountName, 'remove', group)}
											>
												Remove
											</button>
										</div>
									{/each}
								</div>
							{:else}
								<div class="text-base-content/50 text-xs italic">No group memberships</div>
							{/if}
						</div>

						<div class="bg-base-100 rounded-lg p-3">
							<div class="text-base-content/70 mb-1 text-xs font-medium">UUID</div>
							<code class="text-xs break-all">{account.attrs?.uuid?.[0]}</code>
						</div>
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
