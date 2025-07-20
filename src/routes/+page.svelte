<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { kaniRequest } from '../utils';

	let props = $props();

	$inspect(props);

	async function updateDisplayName(name: string, displayName: string) {
        console.log(name)
		const response = await kaniRequest(fetch, {
			path: `v1/oauth2/${name}`,
			method: 'PATCH',
			body: {
				attrs: {
					displayName: [displayName]
				}
			}
		});
		await invalidate(() => true);
		console.log(response);
	}
</script>

<div class="flex flex-row flex-wrap justify-center gap-3 pt-20">
	{#each props.data.apps.body as x}
		<div class="card bg-base-300 max-w-[40rem]">
			<div class="card-body">
				<h2 class="card-title">{x.attrs?.displayname}</h2>
				<div>
					<input
						class="input input-primary"
						placeholder={x.attrs?.displayname}
						id="display-{x.attrs?.name[0]}"
					/>
					<button
						class="btn btn-primary"
						onclick={async () => {
							let value = document.querySelector(`#display-${x.attrs?.name[0]}`)!.value!;
							await updateDisplayName(x.attrs?.name[0], value);
						}}
					>
						Update
					</button>
				</div>
				<div class="overflow-x-auto">
					<table class="table-sm table">
						<thead>
							<tr>
								<th></th>
								<th>Key</th>
								<th>Value</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<th>1</th>
								<td>Class</td>
								<td>{x.attrs?.class.join(', ')}</td>
							</tr>
							<tr>
								<th>1</th>
								<td>directmemberof</td>
								<td>{x.attrs?.directmemberof.join(', ')}</td>
							</tr>
							<tr>
								<th>1</th>
								<td>key_internal_data</td>
								<td>{x.attrs?.key_internal_data.join(', ')}</td>
							</tr>
							<tr>
								<th>1</th>
								<td>memberof</td>
								<td>{x.attrs?.memberof.join(', ')}</td>
							</tr>
							<tr>
								<th>1</th>
								<td>name</td>
								<td>{x.attrs?.name.join(', ')}</td>
							</tr>
							<tr>
								<th>1</th>
								<td>oauth2_jwt_legacy_crypto_enable</td>
								<td>{x.attrs?.oauth2_jwt_legacy_crypto_enable?.[0] == 'true'}</td>
							</tr>
							<tr>
								<th>1</th>
								<!-- Redirect urls very important setting -->
								<td>oauth2_rs_origin</td>
								<td>{x.attrs?.oauth2_rs_origin?.join('\n')}</td>
							</tr>
							<tr>
								<th>1</th>
								<td>oauth2_rs_origin_landing</td>
								<td>{x.attrs?.oauth2_rs_origin_landing.join(', ')}</td>
							</tr>
							<tr>
								<th>1</th>
								<td>oauth2_rs_scope_map</td>
								<td>{x.attrs?.oauth2_rs_scope_map.join(', ')}</td>
							</tr>
							<tr>
								<th>1</th>
								<td>oauth2_strict_redirect_uri</td>
								<td>{x.attrs?.oauth2_strict_redirect_uri.join(', ')}</td>
							</tr>
							<tr>
								<th>1</th>
								<td>spn</td>
								<td>{x.attrs?.spn[0]}</td>
							</tr>
							<tr>
								<th>1</th>
								<td>Class</td>
								<td>{x.attrs?.uuid[0]}</td>
							</tr>
						</tbody>
						<tfoot>
							<tr>
								<th></th>
								<th>Key</th>
								<th>Value</th>
							</tr>
						</tfoot>
					</table>
				</div>
				<div class="card-actions justify-end">
					<button class="btn btn-primary">Edit</button>
				</div>
			</div>
		</div>
	{/each}
</div>

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>
