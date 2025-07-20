<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { kaniRequest } from '../utils';

	const { data } = $props<{ data: any }>();

	let editingApps = $state<Record<string, boolean>>({});
	let editValues = $state<Record<string, { displayName: string; redirectUrls: string }>>({});

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
				redirectUrls: app?.attrs?.oauth2_rs_origin?.join('\n') || ''
			};
		}
	}

	async function saveChanges(appName: string) {
		const values = editValues[appName];
		if (!values) return;

		const redirectUrls = values.redirectUrls
			.split('\n')
			.map(url => url.trim())
			.filter(url => url.length > 0);

		const response = await kaniRequest(fetch, {
			path: `v1/oauth2/${appName}`,
			method: 'PATCH',
			body: {
				attrs: {
					displayName: [values.displayName],
					oauth2_rs_origin: redirectUrls
				}
			}
		});

		if (response.status === 200) {
			editingApps[appName] = false;
			delete editValues[appName];
			await invalidate(() => true);
		}
	}
</script>

<div class="flex flex-row flex-wrap justify-center gap-3 pt-20">
	{#each data.apps.body as app}
		{@const appName = app.attrs?.name[0]}
		{@const isEditing = editingApps[appName]}
		<div class="card bg-base-300 max-w-[40rem]">
			<div class="card-body">
				
				{#if isEditing}
					<div class="form-control">
						<label class="label" for="displayname-{appName}">
							<span class="label-text">Display Name</span>
						</label>
						<input
							id="displayname-{appName}"
							class="input input-bordered"
							bind:value={editValues[appName].displayName}
						/>
					</div>
					
					<div class="form-control mt-4">
						<label class="label" for="redirects-{appName}">
							<span class="label-text">Redirect URLs (one per line)</span>
						</label>
						<textarea
							id="redirects-{appName}"
							class="textarea textarea-bordered h-32"
							placeholder="https://example.com/callback"
							bind:value={editValues[appName].redirectUrls}
						></textarea>
					</div>
				{:else}
					<h2 class="card-title">{app.attrs?.displayname}</h2>
				{/if}
				{#if !isEditing}
					<div class="overflow-x-auto mt-4">
						<table class="table table-sm">
							<thead>
								<tr>
									<th>Key</th>
									<th>Value</th>
								</tr>
							</thead>
							<tbody>
								<tr>
									<td class="font-medium">Name</td>
									<td>{app.attrs?.name.join(', ')}</td>
								</tr>
								<tr>
									<td class="font-medium">Redirect URLs</td>
									<td>
										{#if app.attrs?.oauth2_rs_origin?.length}
											<div class="flex flex-col gap-1">
												{#each app.attrs.oauth2_rs_origin as url}
													<code class="text-xs bg-base-100 p-1 rounded">{url}</code>
												{/each}
											</div>
										{:else}
											<span class="text-gray-500">None configured</span>
										{/if}
									</td>
								</tr>
								<tr>
									<td class="font-medium">Legacy Crypto</td>
									<td>
										<div class="badge {app.attrs?.oauth2_jwt_legacy_crypto_enable?.[0] === 'true' ? 'badge-warning' : 'badge-success'}">
											{app.attrs?.oauth2_jwt_legacy_crypto_enable?.[0] === 'true' ? 'Enabled' : 'Disabled'}
										</div>
									</td>
								</tr>
								<tr>
									<td class="font-medium">Scope Map</td>
									<td>{app.attrs?.oauth2_rs_scope_map?.join(', ') || 'None'}</td>
								</tr>
								<tr>
									<td class="font-medium">UUID</td>
									<td><code class="text-xs">{app.attrs?.uuid[0]}</code></td>
								</tr>
							</tbody>
						</table>
					</div>
				{/if}
				<div class="card-actions justify-end mt-4">
					{#if isEditing}
						<button 
							class="btn btn-outline" 
							onclick={() => toggleEditMode(appName)}
						>
							Cancel
						</button>
						<button 
							class="btn btn-primary" 
							onclick={() => saveChanges(appName)}
						>
							Save Changes
						</button>
					{:else}
						<button 
							class="btn btn-primary" 
							onclick={() => toggleEditMode(appName)}
						>
							Edit
						</button>
					{/if}
				</div>
			</div>
		</div>
	{/each}
</div>

