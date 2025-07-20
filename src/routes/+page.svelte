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
				redirectUrls: app?.attrs?.oauth2_rs_origin
					?.map(url => url.trim())
					?.filter(url => url.length > 0)
					?.join('\n') || ''
			};
		}
	}

	async function saveChanges(appName: string) {
		const values = editValues[appName];
		if (!values) return;

		const redirectUrls = values.redirectUrls
			.split('\n')
			.map(url => url.trim())
			.filter(url => url.length > 0 && url.startsWith('http'));

		const response = await kaniRequest(fetch, {
			path: `v1/oauth2/${appName}`,
			method: 'PATCH',
			body: {
				attrs: {
					displayName: [values.displayName.trim()],
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
		<div class="card bg-base-300 max-w-[40rem] min-h-[500px]">
			<div class="card-body">
				<h2 class="card-title mb-4">
					{#if isEditing}
						Editing: {app.attrs?.displayname}
					{:else}
						{app.attrs?.displayname}
					{/if}
				</h2>
				
				<div class="flex-1">
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
								<label class="label" for="redirects-{appName}">
									<span class="label-text font-medium">Redirect URLs</span>
									<span class="label-text-alt">One URL per line, must start with http</span>
								</label>
								<textarea
									id="redirects-{appName}"
									class="textarea textarea-bordered h-32 font-mono text-sm"
									placeholder="https://example.com/callback&#10;https://app.example.com/oauth/callback"
									bind:value={editValues[appName].redirectUrls}
								></textarea>
							</div>
						</div>
					{:else}
						<div class="overflow-x-auto">
							<table class="table table-sm">
								<tbody>
									<tr>
										<td class="font-medium w-1/3">Name</td>
										<td>{app.attrs?.name.join(', ')}</td>
									</tr>
									<tr>
										<td class="font-medium">Redirect URLs</td>
										<td>
											{#if app.attrs?.oauth2_rs_origin?.length}
												<div class="flex flex-col gap-1">
													{#each app.attrs.oauth2_rs_origin as url}
														<code class="text-xs bg-base-100 p-2 rounded block break-all">{url}</code>
													{/each}
												</div>
											{:else}
												<span class="text-base-content/60 italic">None configured</span>
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
				</div>
				<div class="card-actions justify-end mt-6 pt-4 border-t border-base-content/10">
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

