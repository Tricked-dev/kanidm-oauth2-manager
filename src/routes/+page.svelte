<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { kaniRequest } from '../utils';

	const { data } = $props();

	let editingApps = $state<Record<string, boolean>>({});
	let editValues = $state<
		Record<string, { displayName: string; origin: string; redirectUrls: string }>
	>({});
	let notifications = $state<Array<{ id: string; type: 'success' | 'error' | 'info'; message: string; timeout?: number }>>([]);
	let showCreateForm = $state(false);
	let scopeMapModal = $state<{ show: boolean; appName: string; mode: 'add' | 'delete'; groupName?: string }>({ 
		show: false, 
		appName: '', 
		mode: 'add' 
	});
	let scopeMapForm = $state({
		groupName: '',
		scopes: 'email, profile, openid, groups'
	});
	let createValues = $state({
		name: '',
		displayName: '',
		origin: '',
		redirectUrls: '',
		type: 'basic' as 'basic' | 'public'
	});

	function addNotification(type: 'success' | 'error' | 'info', message: string, timeout = 5000) {
		const id = Math.random().toString(36).substr(2, 9);
		notifications.push({ id, type, message, timeout });
		
		if (timeout > 0) {
			setTimeout(() => {
				notifications = notifications.filter(n => n.id !== id);
			}, timeout);
		}
	}

	function removeNotification(id: string) {
		notifications = notifications.filter(n => n.id !== id);
	}

	function openScopeMapModal(appName: string, mode: 'add' | 'delete', groupName?: string) {
		scopeMapModal = { show: true, appName, mode, groupName };
		if (mode === 'add') {
			scopeMapForm = { groupName: '', scopes: 'email, profile, openid, groups' };
		}
	}

	function closeScopeMapModal() {
		scopeMapModal = { show: false, appName: '', mode: 'add' };
		scopeMapForm = { groupName: '', scopes: 'email, profile, openid, groups' };
	}

	async function addScopeMap(appName: string) {
		if (!scopeMapForm.groupName.trim()) {
			addNotification('error', 'Group name is required');
			return;
		}

		const scopesArray = scopeMapForm.scopes
			.split(',')
			.map(s => `${s.trim()}`)
			.filter(s => s.length > 2);

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

	function toggleEditMode(appName: string) {
		if (editingApps[appName]) {
			// Cancel editing
			editingApps[appName] = false;
			delete editValues[appName];
		} else {
			// Start editing
			const app = data.apps.body.find((a: any) => a.attrs?.name[0] === appName);
			editingApps[appName] = true;
			editValues[appName] = {
				displayName: app?.attrs?.displayname?.[0] || '',
				origin: app?.attrs?.oauth2_rs_origin_landing?.[0] || '',
				redirectUrls:
					app?.attrs?.oauth2_rs_origin
						?.map((url) => url.trim())
						?.filter((url) => url.length > 0)
						?.join('\n') || ''
			};
		}
	}

	async function saveChanges(appName: string) {
		const values = editValues[appName];
		if (!values) return;

		const redirectUrls = values.redirectUrls
			.split('\n')
			.map((url) => url.trim())
			.filter((url) => url.length > 0 && url.startsWith('http'));

		const response = await kaniRequest(fetch, {
			path: `v1/oauth2/${appName}`,
			method: 'PATCH',
			body: {
				attrs: {
					displayName: [values.displayName.trim()],
					oauth2_rs_origin_landing: [values.origin.trim()],
					oauth2_rs_origin: redirectUrls
				}
			}
		});

		if (response.status === 200) {
			editingApps[appName] = false;
			delete editValues[appName];
			addNotification('success', `Successfully updated ${appName}`);
			await invalidate(() => true);
		} else {
			let errorMessage = 'Failed to update application';
			if (response.body && typeof response.body === 'object' && 'invalidattribute' in response.body) {
				errorMessage = response.body.invalidattribute as string;
			}
			addNotification('error', errorMessage);
		}
	}

	async function createApplication() {
		if (!createValues.name || !createValues.displayName || !createValues.origin) {
			return;
		}

		const redirectUrls = createValues.redirectUrls
			.split('\n')
			.map((url) => url.trim())
			.filter((url) => url.length > 0 && url.startsWith('http'));

		const response = await kaniRequest(fetch, {
			path: `v1/oauth2/_${createValues.type}`,
			method: 'POST',
			body: {
				attrs: {
					name: [createValues.name.trim().toLowerCase()],
					oauth2_rs_origin_landing: [createValues.origin.trim()],
					displayname: [createValues.displayName.trim()],
					oauth2_rs_origin: redirectUrls
				}
			}
		});

		if (response.status === 200) {
			showCreateForm = false;
			createValues = {
				name: '',
				displayName: '',
				origin: '',
				redirectUrls: '',
				type: 'basic'
			};
			addNotification('success', `Successfully created application: ${createValues.name}`);
			await invalidate(() => true);
		} else {
			let errorMessage = 'Failed to create application';
			if (response.body && typeof response.body === 'string') {
				errorMessage = response.body;
			} else if (response.body && typeof response.body === 'object' && 'invalidattribute' in response.body) {
				errorMessage = response.body.invalidattribute as string;
			}
			addNotification('error', errorMessage);
		}
	}
</script>

<!-- Notification Toast Container -->
<div class="toast toast-top toast-end z-50">
	{#each notifications as notification}
		<div class="alert {notification.type === 'success' ? 'alert-success' : notification.type === 'error' ? 'alert-error' : 'alert-info'} shadow-lg max-w-md">
			<div class="flex items-center gap-2">
				{#if notification.type === 'success'}
					<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
				{:else if notification.type === 'error'}
					<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
				{:else}
					<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
				{/if}
				<span class="flex-1 text-sm">{notification.message}</span>
				<button class="btn btn-sm btn-circle btn-ghost" onclick={() => removeNotification(notification.id)}>✕</button>
			</div>
		</div>
	{/each}
</div>

<div class="container mx-auto px-4 py-8">
	<div class="mb-8 flex items-center justify-between">
		<h1 class="text-3xl font-bold">OAuth2 Applications</h1>
		<button class="btn btn-primary" onclick={() => (showCreateForm = !showCreateForm)}>
			{showCreateForm ? 'Cancel' : 'Create Application'}
		</button>
	</div>

	{#if showCreateForm}
		<div class="card bg-base-200 mx-auto mb-8 max-w-2xl">
			<div class="card-body">
				<h2 class="card-title">Create New OAuth2 Application</h2>

				<div class="form-control">
					<label class="label">
						<span class="label-text font-medium">Application Type</span>
					</label>
					<div class="flex gap-4">
						<label class="label cursor-pointer">
							<input
								type="radio"
								name="type"
								value="basic"
								class="radio radio-primary"
								bind:group={createValues.type}
							/>
							<span class="label-text ml-2">Basic (Confidential)</span>
						</label>
						<label class="label cursor-pointer">
							<input
								type="radio"
								name="type"
								value="public"
								class="radio radio-primary"
								bind:group={createValues.type}
							/>
							<span class="label-text ml-2">Public</span>
						</label>
					</div>
				</div>

				<div class="form-control">
					<label class="label" for="create-name">
						<span class="label-text font-medium">Application Name</span>
						<span class="label-text-alt">Unique identifier for the application</span>
					</label>
					<input
						id="create-name"
						type="text"
						class="input input-bordered"
						placeholder="my-app"
						bind:value={createValues.name}
						required
					/>
				</div>

				<div class="form-control">
					<label class="label" for="create-display-name">
						<span class="label-text font-medium">Display Name</span>
						<span class="label-text-alt">Human-readable name shown to users</span>
					</label>
					<input
						id="create-display-name"
						type="text"
						class="input input-bordered"
						placeholder="My Application"
						bind:value={createValues.displayName}
						required
					/>
				</div>

				<div class="form-control">
					<label class="label" for="create-origin">
						<span class="label-text font-medium">Origin (Homepage)</span>
						<span class="label-text-alt">Landing page URL - required for application</span>
					</label>
					<input
						id="create-origin"
						type="url"
						class="input input-bordered font-mono"
						placeholder="https://example.com"
						bind:value={createValues.origin}
						required
					/>
				</div>

				<div class="form-control">
					<label class="label" for="create-redirects">
						<span class="label-text font-medium">Redirect URLs</span>
						<span class="label-text-alt">OAuth2 callback URLs, one per line</span>
					</label>
					<textarea
						id="create-redirects"
						class="textarea textarea-bordered h-24 font-mono text-sm"
						placeholder="https://example.com/oauth/callback&#10;https://app.example.com/auth/callback"
						bind:value={createValues.redirectUrls}
					></textarea>
				</div>

				<div class="card-actions mt-6 justify-end">
					<button class="btn btn-outline" onclick={() => (showCreateForm = false)}> Cancel </button>
					<button
						class="btn btn-primary"
						onclick={() => createApplication()}
						disabled={!createValues.name || !createValues.displayName || !createValues.origin}
					>
						Create Application
					</button>
				</div>
			</div>
		</div>
	{/if}

	<div class="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
		{#each data.apps.body as app}
			{@const appName = app.attrs?.name[0]}
			{@const isEditing = editingApps[appName]}
			<div class="card bg-base-300 flex w-full flex-col">
				<div class="card-body flex flex-1 flex-col">
					<h2 class="card-title mb-4">
						{#if isEditing}
							Editing: {app.attrs?.displayname}
						{:else}
							{app.attrs?.displayname}
						{/if}
					</h2>

					<div class="flex-1 overflow-auto">
						{#if isEditing}
							<div class="space-y-4">
								<div class="form-control">
									<label class="label" for="displayname-{appName}">
										<span class="label-text font-medium">Display Name</span>
									</label>
									<input
										id="displayname-{appName}"
										class="input input-bordered"
										bind:value={editValues[appName].displayName}
										placeholder="Enter display name"
									/>
								</div>

								<div class="form-control">
									<label class="label" for="origin-{appName}">
										<span class="label-text font-medium">Origin (Homepage)</span>
										<span class="label-text-alt">Landing page URL</span>
									</label>
									<input
										id="origin-{appName}"
										class="input input-bordered font-mono"
										placeholder="https://example.com"
										bind:value={editValues[appName].origin}
									/>
								</div>

								<div class="form-control">
									<label class="label" for="redirects-{appName}">
										<span class="label-text font-medium">Redirect URLs (Optional)</span>
										<span class="label-text-alt">One URL per line, must start with http</span>
									</label>
									<textarea
										id="redirects-{appName}"
										class="textarea textarea-bordered h-24 font-mono text-sm"
										placeholder="https://example.com/callback&#10;https://app.example.com/oauth/callback"
										bind:value={editValues[appName].redirectUrls}
									></textarea>
								</div>

								
							</div>
						{:else}
							<div class="space-y-4">
								<div class="bg-base-100 rounded-lg p-4">
									<div class="text-base-content/70 mb-1 text-sm font-medium">Application Name</div>
									<div class="font-mono text-sm">{app.attrs?.name.join(', ')}</div>
								</div>

								<div class="bg-base-100 rounded-lg p-4">
									<div class="text-base-content/70 mb-1 text-sm font-medium">Origin (Homepage)</div>
									<code class="block text-sm break-all"
										>{app.attrs?.oauth2_rs_origin_landing?.[0] || 'Not set'}</code
									>
								</div>

								<div class="bg-base-100 rounded-lg p-4">
									<div class="text-base-content/70 mb-2 text-sm font-medium">Redirect URLs</div>
									{#if app.attrs?.oauth2_rs_origin?.length}
										<div class="space-y-2">
											{#each app.attrs.oauth2_rs_origin as url}
												<code class="bg-base-200 block rounded p-2 text-xs break-all">{url}</code>
											{/each}
										</div>
									{:else}
										<div class="text-base-content/60 text-sm italic">None configured</div>
									{/if}
								</div>

								<div class="bg-base-100 rounded-lg p-4">
									<div class="flex justify-between items-center mb-3">
										<div class="text-base-content/70 text-sm font-medium">Scope Map</div>
										<button 
											class="btn btn-sm btn-primary" 
											onclick={() => openScopeMapModal(appName, 'add')}
										>
											Add Scope
										</button>
									</div>
									{#if app.attrs?.oauth2_rs_scope_map?.length}
										<div class="space-y-2">
											{#each app.attrs.oauth2_rs_scope_map as scope}
												{@const [groupName] = scope.split(':')}
												<div class="flex items-center justify-between bg-base-200 rounded p-2">
													<code class="text-xs break-all flex-1">{scope}</code>
													<button 
														class="btn btn-xs btn-error ml-2" 
														onclick={() => openScopeMapModal(appName, 'delete', groupName.trim())}
													>
														Delete
													</button>
												</div>
											{/each}
										</div>
									{:else}
										<div class="text-base-content/60 text-sm italic">None configured</div>
									{/if}
								</div>

								<div class="grid grid-cols-2 gap-4">
									<div class="bg-base-100 rounded-lg p-3">
										<div class="text-base-content/70 mb-1 text-xs font-medium">Legacy Crypto</div>
										<div
											class="badge badge-sm {app.attrs?.oauth2_jwt_legacy_crypto_enable?.[0] ===
											'true'
												? 'badge-warning'
												: 'badge-success'}"
										>
											{app.attrs?.oauth2_jwt_legacy_crypto_enable?.[0] === 'true'
												? 'Enabled'
												: 'Disabled'}
										</div>
									</div>
									<div class="bg-base-100 rounded-lg p-3">
										<div class="text-base-content/70 mb-1 text-xs font-medium">UUID</div>
										<code class="text-xs break-all">{app.attrs?.uuid[0]}</code>
									</div>
								</div>
							</div>
						{/if}
					</div>
					<div
						class="card-actions border-base-content/10 mt-4 flex-shrink-0 justify-end border-t pt-4"
					>
						{#if isEditing}
							<button class="btn btn-outline" onclick={() => toggleEditMode(appName)}>
								Cancel
							</button>
							<button class="btn btn-primary" onclick={() => saveChanges(appName)}>
								Save Changes
							</button>
						{:else}
							<button class="btn btn-primary" onclick={() => toggleEditMode(appName)}>
								Edit
							</button>
						{/if}
					</div>
				</div>
			</div>
		{/each}
	</div>
</div>

<!-- Scope Map Management Modal -->
{#if scopeMapModal.show}
	<div class="modal modal-open">
		<div class="modal-box">
			<h3 class="font-bold text-lg">
				{scopeMapModal.mode === 'add' ? 'Add Scope Mapping' : 'Delete Scope Mapping'}
			</h3>
			
			{#if scopeMapModal.mode === 'add'}
				<div class="py-4 space-y-4">
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
						<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-info shrink-0 w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
						<span class="text-sm">
							This will create a scope mapping: <code class="bg-base-200 text-base-content p-1 rounded">{scopeMapForm.groupName}: {"{" + scopeMapForm.scopes.split(',').map(s => `"${s.trim()}"`).join(', ') + "}"}</code>
						</span>
					</div>
				</div>
			{:else}
				<div class="py-4">
					<p>Are you sure you want to delete the scope mapping for <strong>{scopeMapModal.groupName}</strong>?</p>
					<div class="mt-4 p-3 bg-base-200 rounded">
						<code class="text-sm break-all">
							{data.apps.body.find(app => app.attrs?.name[0] === scopeMapModal.appName)?.attrs?.oauth2_rs_scope_map?.find(scope => scope.startsWith(scopeMapModal.groupName || '')) || ''}
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
