<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { kaniRequest } from '../../utils';

	const { data, addNotification } = $props();

	let editingGroups = $state<Record<string, boolean>>({});
	let editValues = $state<Record<string, { displayName: string; description?: string }>>({});
	let showCreateForm = $state(false);
	let showUnixForm = $state<{ show: boolean; groupName: string; gidNumber?: string }>({
		show: false,
		groupName: '',
		gidNumber: ''
	});
	let showAddMemberForm = $state<{ show: boolean; groupName: string; memberName: string }>({
		show: false,
		groupName: '',
		memberName: ''
	});
	let createValues = $state({
		name: '',
		displayName: '',
		description: ''
	});

	function toggleEditMode(groupName: string) {
		if (editingGroups[groupName]) {
			// Cancel editing
			editingGroups[groupName] = false;
			delete editValues[groupName];
		} else {
			// Start editing
			const group = data.groups?.body.find((g: any) => g.attrs?.name[0] === groupName);
			editingGroups[groupName] = true;
			editValues[groupName] = {
				displayName: group?.attrs?.displayname?.[0] || '',
				description: group?.attrs?.description?.[0] || ''
			};
		}
	}

	async function saveGroupChanges(groupName: string) {
		const values = editValues[groupName];
		if (!values) return;

		const attrs: Record<string, string[]> = {
			displayname: [values.displayName.trim()]
		};

		if (values.description?.trim()) {
			attrs.description = [values.description.trim()];
		}

		const response = await kaniRequest(fetch, {
			path: `v1/group/${groupName}`,
			method: 'PATCH',
			body: { attrs }
		});

		await invalidateAll();

		if (response.status === 200) {
			editingGroups[groupName] = false;
			delete editValues[groupName];
			addNotification('success', `Successfully updated group ${groupName}`);
		} else {
			let errorMessage = 'Failed to update group';
			if (
				response.body &&
				typeof response.body === 'object' &&
				'invalidattribute' in response.body
			) {
				errorMessage = response.body.invalidattribute as string;
			}
			addNotification('error', errorMessage);
		}
	}

	async function createGroup() {
		if (!createValues.name || !createValues.displayName) {
			return;
		}

		const attrs: Record<string, string[]> = {
			name: [createValues.name.trim().toLowerCase()],
			displayname: [createValues.displayName.trim()]
		};

		if (createValues.description?.trim()) {
			attrs.description = [createValues.description.trim()];
		}

		const response = await kaniRequest(fetch, {
			path: 'v1/group',
			method: 'POST',
			body: { attrs }
		});

		await invalidateAll();

		if (response.status === 200) {
			showCreateForm = false;
			createValues = { name: '', displayName: '', description: '' };
			addNotification('success', `Successfully created group: ${createValues.name}`);
		} else {
			let errorMessage = 'Failed to create group';
			if (response.body && typeof response.body === 'string') {
				errorMessage = response.body;
			} else if (
				response.body &&
				typeof response.body === 'object' &&
				'invalidattribute' in response.body
			) {
				errorMessage = response.body.invalidattribute as string;
			}
			addNotification('error', errorMessage);
		}
	}

	async function deleteGroup(groupName: string) {
		const response = await kaniRequest(fetch, {
			path: `v1/group/${groupName}`,
			method: 'DELETE'
		});

		await invalidateAll();

		if (response.status === 200) {
			addNotification('success', `Successfully deleted group ${groupName}`);
		} else {
			addNotification('error', `Failed to delete group ${groupName}`);
		}
	}

	function openUnixForm(groupName: string) {
		showUnixForm = { show: true, groupName, gidNumber: '' };
	}

	async function enableUnixExtension() {
		if (!showUnixForm.groupName || !showUnixForm.gidNumber) {
			addNotification('error', 'Group name and GID number are required');
			return;
		}

		const response = await kaniRequest(fetch, {
			path: `v1/group/${showUnixForm.groupName}/_unix`,
			method: 'POST',
			body: {
				gidnumber: parseInt(showUnixForm.gidNumber)
			}
		});

		await invalidateAll();

		if (response.status === 200) {
			showUnixForm = { show: false, groupName: '', gidNumber: '' };
			addNotification(
				'success',
				`Successfully enabled Unix extension for ${showUnixForm.groupName}`
			);
		} else {
			addNotification('error', 'Failed to enable Unix extension');
		}
	}

	async function getUnixToken(groupName: string) {
		try {
			const result = await kaniRequest(fetch, {
				path: `v1/group/${groupName}/_unix/_token`,
				method: 'GET'
			});

			if (result.status === 200 && result.body) {
				// Copy the token info to clipboard as JSON
				await navigator.clipboard.writeText(JSON.stringify(result.body, null, 2));
				addNotification('success', `Unix token info copied to clipboard for ${groupName}`);
			} else {
				addNotification('error', 'Failed to fetch Unix token');
			}
		} catch (error) {
			console.error(error);
			addNotification('error', 'Failed to copy Unix token to clipboard');
		}
	}

	function openAddMemberForm(groupName: string) {
		showAddMemberForm = { show: true, groupName, memberName: '' };
	}

	async function addGroupMember() {
		if (!showAddMemberForm.groupName || !showAddMemberForm.memberName) {
			addNotification('error', 'Group name and member name are required');
			return;
		}

		const response = await kaniRequest(fetch, {
			path: `v1/group/${showAddMemberForm.groupName}/_attr/member`,
			method: 'POST',
			body: [showAddMemberForm.memberName.trim()]
		});

		await invalidateAll();

		if (response.status === 200) {
			showAddMemberForm = { show: false, groupName: '', memberName: '' };
			addNotification('success', `Successfully added member to ${showAddMemberForm.groupName}`);
		} else {
			addNotification('error', 'Failed to add member to group');
		}
	}

	async function removeMember(groupName: string, memberName: string) {
		const response = await kaniRequest(fetch, {
			path: `v1/group/${groupName}/_attr/member`,
			method: 'DELETE',
			body: [memberName]
		});

		await invalidateAll();

		if (response.status === 200) {
			addNotification('success', `Successfully removed ${memberName} from ${groupName}`);
		} else {
			addNotification('error', `Failed to remove member from group`);
		}
	}

	function hasUnixExtension(group: any): boolean {
		return group.attrs?.class?.includes('posixgroup') || false;
	}
</script>

<div class="container mx-auto px-4 py-8">
	<div class="mb-8 flex items-center justify-between">
		<h1 class="text-3xl font-bold">Groups</h1>
		<button class="btn btn-primary" onclick={() => (showCreateForm = !showCreateForm)}>
			{showCreateForm ? 'Cancel' : 'Create Group'}
		</button>
	</div>

	{#if showCreateForm}
		<div class="card bg-base-200 mx-auto mb-8 max-w-2xl">
			<div class="card-body">
				<h2 class="card-title">Create New Group</h2>

				<div class="form-control">
					<label class="label" for="create-group-name">
						<span class="label-text font-medium">Group Name</span>
						<span class="label-text-alt">Unique identifier for the group</span>
					</label>
					<input
						id="create-group-name"
						type="text"
						class="input input-bordered"
						placeholder="my-group"
						bind:value={createValues.name}
						required
					/>
				</div>

				<div class="form-control">
					<label class="label" for="create-group-display-name">
						<span class="label-text font-medium">Display Name</span>
						<span class="label-text-alt">Human-readable name for the group</span>
					</label>
					<input
						id="create-group-display-name"
						type="text"
						class="input input-bordered"
						placeholder="My Group"
						bind:value={createValues.displayName}
						required
					/>
				</div>

				<div class="form-control">
					<label class="label" for="create-group-description">
						<span class="label-text font-medium">Description (Optional)</span>
						<span class="label-text-alt">Brief description of the group</span>
					</label>
					<textarea
						id="create-group-description"
						class="textarea textarea-bordered"
						placeholder="Group description..."
						bind:value={createValues.description}
					></textarea>
				</div>

				<div class="card-actions mt-6 justify-end">
					<button class="btn btn-outline" onclick={() => (showCreateForm = false)}> Cancel </button>
					<button
						class="btn btn-primary"
						onclick={() => createGroup()}
						disabled={!createValues.name || !createValues.displayName}
					>
						Create Group
					</button>
				</div>
			</div>
		</div>
	{/if}

	{#if showUnixForm.show}
		<div class="modal modal-open">
			<div class="modal-box">
				<h3 class="text-lg font-bold">Enable Unix Extension</h3>
				<p class="py-4">
					Enable Unix/POSIX extension for group <strong>{showUnixForm.groupName}</strong>
				</p>

				<div class="form-control">
					<label class="label" for="unix-gid">
						<span class="label-text font-medium">GID Number</span>
						<span class="label-text-alt">Unix group identifier</span>
					</label>
					<input
						id="unix-gid"
						type="number"
						class="input input-bordered"
						placeholder="1000"
						bind:value={showUnixForm.gidNumber}
						min="1000"
						required
					/>
				</div>

				<div class="modal-action">
					<button
						class="btn btn-outline"
						onclick={() => (showUnixForm = { show: false, groupName: '', gidNumber: '' })}
					>
						Cancel
					</button>
					<button class="btn btn-primary" onclick={() => enableUnixExtension()}>
						Enable Unix Extension
					</button>
				</div>
			</div>
		</div>
	{/if}

	{#if showAddMemberForm.show}
		<div class="modal modal-open">
			<div class="modal-box">
				<h3 class="text-lg font-bold">Add Member to Group</h3>
				<p class="py-4">
					Add a member to group <strong>{showAddMemberForm.groupName}</strong>
				</p>

				<div class="form-control">
					<label class="label" for="member-name">
						<span class="label-text font-medium">Member Name</span>
						<span class="label-text-alt">Username or group name to add</span>
					</label>
					<input
						id="member-name"
						type="text"
						class="input input-bordered"
						placeholder="username"
						bind:value={showAddMemberForm.memberName}
						required
					/>
				</div>

				<div class="modal-action">
					<button
						class="btn btn-outline"
						onclick={() => (showAddMemberForm = { show: false, groupName: '', memberName: '' })}
					>
						Cancel
					</button>
					<button class="btn btn-primary" onclick={() => addGroupMember()}> Add Member </button>
				</div>
			</div>
		</div>
	{/if}

	<div class="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
		{#each data.groups?.body || [] as group}
			{@const groupName = group.attrs?.name[0]}
			{@const isEditing = editingGroups[groupName]}
			{@const isUnixEnabled = hasUnixExtension(group)}
			<div class="card bg-base-300 flex w-full flex-col">
				<div class="card-body flex flex-1 flex-col">
					<h2 class="card-title mb-4 flex items-center gap-2">
						<span class="flex-1">
							{#if isEditing}
								Editing: {group.attrs?.displayname?.[0] || groupName}
							{:else}
								{group.attrs?.displayname?.[0] || groupName}
							{/if}
						</span>
						{#if isUnixEnabled}
							<div class="badge badge-success badge-sm">Unix</div>
						{/if}
					</h2>

					<div class="flex-1 overflow-auto">
						{#if isEditing}
							<div class="space-y-4">
								<div class="form-control">
									<label class="label" for="displayname-{groupName}">
										<span class="label-text font-medium">Display Name</span>
									</label>
									<input
										id="displayname-{groupName}"
										class="input input-bordered"
										bind:value={editValues[groupName].displayName}
										placeholder="Enter display name"
									/>
								</div>

								<div class="form-control">
									<label class="label" for="description-{groupName}">
										<span class="label-text font-medium">Description</span>
									</label>
									<textarea
										id="description-{groupName}"
										class="textarea textarea-bordered"
										bind:value={editValues[groupName].description}
										placeholder="Group description..."
									></textarea>
								</div>
							</div>
						{:else}
							<div class="space-y-4">
								<div class="bg-base-100 rounded-lg p-4">
									<div class="text-base-content/70 mb-1 text-sm font-medium">Group Name</div>
									<div class="font-mono text-sm">{group.attrs?.name.join(', ')}</div>
								</div>

								{#if group.attrs?.description?.length}
									<div class="bg-base-100 rounded-lg p-4">
										<div class="text-base-content/70 mb-1 text-sm font-medium">Description</div>
										<div class="text-sm">{group.attrs.description[0]}</div>
									</div>
								{/if}

								<div class="bg-base-100 rounded-lg p-4">
									<div class="mb-3 flex items-center justify-between">
										<div class="text-base-content/70 text-sm font-medium">Members</div>
										<button
											class="btn btn-sm btn-primary"
											onclick={() => openAddMemberForm(groupName)}
										>
											Add Member
										</button>
									</div>
									{#if group.attrs?.member?.length}
										<div class="space-y-2">
											{#each group.attrs.member as member}
												<div class="bg-base-200 flex items-center justify-between rounded p-2">
													<span class="text-sm">{member}</span>
													<button
														class="btn btn-xs btn-error"
														onclick={() => removeMember(groupName, member)}
													>
														Remove
													</button>
												</div>
											{/each}
										</div>
									{:else}
										<div class="text-base-content/60 text-sm italic">No members</div>
									{/if}
								</div>

								{#if isUnixEnabled && group.attrs?.gidnumber}
									<div class="bg-base-100 rounded-lg p-4">
										<div class="mb-2 flex items-center justify-between">
											<div class="text-base-content/70 text-sm font-medium">Unix Extension</div>
											<button
												class="btn btn-sm btn-secondary"
												onclick={() => getUnixToken(groupName)}
											>
												Get Unix Token
											</button>
										</div>
										<div class="space-y-1">
											<div class="text-base-content/70 text-xs">
												GID: {group.attrs.gidnumber[0]}
											</div>
											{#if group.attrs?.shell}
												<div class="text-base-content/70 text-xs">
													Shell: {group.attrs.shell[0]}
												</div>
											{/if}
										</div>
									</div>
								{/if}

								<div class="bg-base-100 rounded-lg p-4">
									<div class="text-base-content/70 mb-1 text-sm font-medium">UUID</div>
									<code class="text-sm break-all">{group.attrs?.uuid[0]}</code>
								</div>

								<div class="bg-base-100 rounded-lg p-4">
									<div class="text-base-content/70 mb-1 text-sm font-medium">Classes</div>
									<div class="flex flex-wrap gap-1">
										{#each group.attrs?.class || [] as cls}
											<span class="badge badge-outline badge-xs">{cls}</span>
										{/each}
									</div>
								</div>
							</div>
						{/if}
					</div>

					<div
						class="card-actions border-base-content/10 mt-4 flex-shrink-0 justify-end border-t pt-4"
					>
						{#if isEditing}
							<button class="btn btn-outline" onclick={() => toggleEditMode(groupName)}>
								Cancel
							</button>
							<button class="btn btn-primary" onclick={() => saveGroupChanges(groupName)}>
								Save Changes
							</button>
						{:else}
							<div class="dropdown dropdown-top dropdown-end">
								<div tabindex="0" role="button" class="btn btn-sm">Actions</div>
								<ul
									tabindex="0"
									class="menu dropdown-content bg-base-100 rounded-box z-[1] w-52 p-2 shadow"
								>
									{#if !isUnixEnabled}
										<li>
											<button onclick={() => openUnixForm(groupName)}>Enable Unix Extension</button>
										</li>
									{/if}
									<li><button onclick={() => toggleEditMode(groupName)}>Edit Group</button></li>
									<li>
										<button class="text-error" onclick={() => deleteGroup(groupName)}
											>Delete Group</button
										>
									</li>
								</ul>
							</div>
						{/if}
					</div>
				</div>
			</div>
		{/each}
	</div>
</div>
