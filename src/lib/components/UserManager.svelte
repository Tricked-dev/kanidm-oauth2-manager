<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { kaniRequest } from '../../utils';

	const { data, addNotification } = $props();

	let editingUsers = $state<Record<string, boolean>>({});
	let editValues = $state<
		Record<string, { displayName: string; mail?: string; legalName?: string }>
	>({});
	let showCreateForm = $state(false);
	let showUnixForm = $state<{
		show: boolean;
		userName: string;
		uidNumber?: string;
		gidNumber?: string;
		homeDirectory?: string;
		loginShell?: string;
	}>({
		show: false,
		userName: '',
		uidNumber: '',
		gidNumber: '',
		homeDirectory: '',
		loginShell: '/bin/bash'
	});
	let showSshKeyForm = $state<{ show: boolean; userName: string; keyTag: string; publicKey: string }>(
		{
			show: false,
			userName: '',
			keyTag: '',
			publicKey: ''
		}
	);
	let showPasswordForm = $state<{ show: boolean; userName: string; password: string }>({
		show: false,
		userName: '',
		password: ''
	});
	let showGroupForm = $state<{
		show: boolean;
		userName: string;
		groupName: string;
		mode: 'add' | 'remove';
	}>({
		show: false,
		userName: '',
		groupName: '',
		mode: 'add'
	});
	let createValues = $state({
		name: '',
		displayName: '',
		legalName: '',
		mail: ''
	});

	function toggleEditMode(userName: string) {
		if (editingUsers[userName]) {
			// Cancel editing
			editingUsers[userName] = false;
			delete editValues[userName];
		} else {
			// Start editing
			const user = data.users?.body.find((u: any) => u.attrs?.name[0] === userName);
			editingUsers[userName] = true;
			editValues[userName] = {
				displayName: user?.attrs?.displayname?.[0] || '',
				mail: user?.attrs?.mail?.[0] || '',
				legalName: user?.attrs?.legalname?.[0] || ''
			};
		}
	}

	async function saveUserChanges(userName: string) {
		const values = editValues[userName];
		if (!values) return;

		const attrs: Record<string, string[]> = {
			displayname: [values.displayName.trim()]
		};

		if (values.mail?.trim()) {
			attrs.mail = [values.mail.trim()];
		}
		if (values.legalName?.trim()) {
			attrs.legalname = [values.legalName.trim()];
		}

		const response = await kaniRequest(fetch, {
			path: `v1/person/${userName}`,
			method: 'PATCH',
			body: { attrs }
		});

		await invalidateAll();

		if (response.status === 200) {
			editingUsers[userName] = false;
			delete editValues[userName];
			addNotification('success', `Successfully updated user ${userName}`);
		} else {
			let errorMessage = 'Failed to update user';
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

	async function createUser() {
		if (!createValues.name || !createValues.displayName) {
			return;
		}

		const attrs: Record<string, string[]> = {
			name: [createValues.name.trim().toLowerCase()],
			displayname: [createValues.displayName.trim()]
		};

		if (createValues.legalName?.trim()) {
			attrs.legalname = [createValues.legalName.trim()];
		}
		if (createValues.mail?.trim()) {
			attrs.mail = [createValues.mail.trim()];
		}

		const response = await kaniRequest(fetch, {
			path: 'v1/person',
			method: 'POST',
			body: { attrs }
		});

		if (response.status === 200) {
			const createdUserName = createValues.name;
			showCreateForm = false;
			createValues = { name: '', displayName: '', legalName: '', mail: '' };
			addNotification('success', `Successfully created user: ${createdUserName}`);
			await invalidateAll();
		} else {
			let errorMessage = 'Failed to create user';
			if (response.status === 403) {
				errorMessage = 'Access denied: You do not have permission to create users. Please contact your Kanidm administrator.';
			} else if (response.body && typeof response.body === 'string') {
				errorMessage = response.body.replace(/"/g, '');
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

	async function deleteUser(userName: string) {
		const response = await kaniRequest(fetch, {
			path: `v1/person/${userName}`,
			method: 'DELETE'
		});

		await invalidateAll();

		if (response.status === 200) {
			addNotification('success', `Successfully deleted user ${userName}`);
		} else {
			addNotification('error', `Failed to delete user ${userName}`);
		}
	}

	function openUnixForm(userName: string) {
		const user = data.users?.body.find((u: any) => u.attrs?.name[0] === userName);
		showUnixForm = {
			show: true,
			userName,
			uidNumber: user?.attrs?.uidnumber?.[0] || '',
			gidNumber: user?.attrs?.gidnumber?.[0] || '',
			homeDirectory: user?.attrs?.homedirectory?.[0] || `/home/${userName}`,
			loginShell: user?.attrs?.loginshell?.[0] || '/bin/bash'
		};
	}

	async function enableUnixExtension() {
		if (!showUnixForm.userName) {
			addNotification('error', 'Username is required');
			return;
		}

		// According to the API spec, AccountUnixExtend only accepts gidnumber and shell
		const body: any = {};

		if (showUnixForm.gidNumber) {
			body.gidnumber = parseInt(showUnixForm.gidNumber);
		}
		if (showUnixForm.loginShell) {
			body.shell = showUnixForm.loginShell;
		}

		const response = await kaniRequest(fetch, {
			path: `v1/person/${showUnixForm.userName}/_unix`,
			method: 'POST',
			body
		});

		if (response.status === 200) {
			const userName = showUnixForm.userName;
			showUnixForm = {
				show: false,
				userName: '',
				uidNumber: '',
				gidNumber: '',
				homeDirectory: '',
				loginShell: '/bin/bash'
			};
			addNotification('success', `Successfully enabled Unix extension for ${userName}`);
			await invalidateAll();
		} else {
			let errorMessage = 'Failed to enable Unix extension';
			if (response.body && typeof response.body === 'string') {
				errorMessage = response.body;
			} else if (response.body && typeof response.body === 'object') {
				errorMessage = JSON.stringify(response.body);
			}
			addNotification('error', errorMessage);
		}
	}


	function openSshKeyForm(userName: string) {
		showSshKeyForm = { show: true, userName, keyTag: '', publicKey: '' };
	}

	async function addSshKey() {
		if (!showSshKeyForm.userName || !showSshKeyForm.keyTag || !showSshKeyForm.publicKey) {
			addNotification('error', 'Username, key tag, and public key are required');
			return;
		}

		// API expects an array of SSH key objects with tag and key
		const sshKeyObject = {
			tag: showSshKeyForm.keyTag,
			key: showSshKeyForm.publicKey.trim()
		};

		const response = await kaniRequest(fetch, {
			path: `v1/person/${showSshKeyForm.userName}/_ssh_pubkeys`,
			method: 'POST',
			body: [sshKeyObject]
		});

		if (response.status === 200) {
			const userName = showSshKeyForm.userName;
			showSshKeyForm = { show: false, userName: '', keyTag: '', publicKey: '' };
			addNotification('success', `Successfully added SSH key for ${userName}`);
			await invalidateAll();
		} else {
			let errorMessage = 'Failed to add SSH key';
			if (response.body && typeof response.body === 'string') {
				errorMessage = response.body.replace(/"/g, '');
			}
			addNotification('error', errorMessage);
		}
	}

	async function removeSshKey(userName: string, keyTag: string) {
		const response = await kaniRequest(fetch, {
			path: `v1/person/${userName}/_ssh_pubkeys/${keyTag}`,
			method: 'DELETE'
		});

		if (response.status === 200) {
			addNotification('success', `Successfully removed SSH key ${keyTag} for ${userName}`);
			await invalidateAll();
		} else {
			addNotification('error', 'Failed to remove SSH key');
		}
	}

	async function getSshKeys(userName: string) {
		try {
			const result = await kaniRequest(fetch, {
				path: `v1/person/${userName}/_ssh_pubkeys`,
				method: 'GET'
			});

			if (result.status === 200 && result.body) {
				await navigator.clipboard.writeText(JSON.stringify(result.body, null, 2));
				addNotification('success', `SSH keys copied to clipboard for ${userName}`);
			} else {
				addNotification('error', 'Failed to fetch SSH keys');
			}
		} catch (error) {
			console.error(error);
			addNotification('error', 'Failed to copy SSH keys to clipboard');
		}
	}

	function openPasswordForm(userName: string) {
		showPasswordForm = { show: true, userName, password: '' };
	}

	async function resetPassword() {
		if (!showPasswordForm.userName || !showPasswordForm.password) {
			addNotification('error', 'Username and password are required');
			return;
		}

		const response = await kaniRequest(fetch, {
			path: `v1/person/${showPasswordForm.userName}/_unix/_credential`,
			method: 'PUT',
			body: { password: showPasswordForm.password }
		});

		if (response.status === 200) {
			const userName = showPasswordForm.userName;
			showPasswordForm = { show: false, userName: '', password: '' };
			addNotification('success', `Successfully reset password for ${userName}`);
			await invalidateAll();
		} else {
			addNotification('error', 'Failed to reset password');
		}
	}

	function openGroupForm(userName: string, mode: 'add' | 'remove', groupName?: string) {
		showGroupForm = {
			show: true,
			userName,
			groupName: groupName || '',
			mode
		};
	}

	async function addUserToGroup() {
		if (!showGroupForm.userName || !showGroupForm.groupName) {
			addNotification('error', 'Username and group name are required');
			return;
		}

		const response = await kaniRequest(fetch, {
			path: `v1/group/${showGroupForm.groupName}/_attr/member`,
			method: 'POST',
			body: [showGroupForm.userName]
		});

		if (response.status === 200) {
			const { userName, groupName } = showGroupForm;
			showGroupForm = { show: false, userName: '', groupName: '', mode: 'add' };
			addNotification('success', `Successfully added ${userName} to group ${groupName}`);
			await invalidateAll();
		} else {
			let errorMessage = 'Failed to add user to group';
			if (response.body && typeof response.body === 'string') {
				errorMessage = response.body.replace(/"/g, '');
			}
			addNotification('error', errorMessage);
		}
	}

	async function removeUserFromGroup() {
		if (!showGroupForm.userName || !showGroupForm.groupName) {
			addNotification('error', 'Username and group name are required');
			return;
		}

		const response = await kaniRequest(fetch, {
			path: `v1/group/${showGroupForm.groupName}/_attr/member`,
			method: 'DELETE',
			body: [showGroupForm.userName]
		});

		if (response.status === 200) {
			const { userName, groupName } = showGroupForm;
			showGroupForm = { show: false, userName: '', groupName: '', mode: 'add' };
			addNotification('success', `Successfully removed ${userName} from group ${groupName}`);
			await invalidateAll();
		} else {
			let errorMessage = 'Failed to remove user from group';
			if (response.body && typeof response.body === 'string') {
				errorMessage = response.body.replace(/"/g, '');
			}
			addNotification('error', errorMessage);
		}
	}

	function hasUnixExtension(user: any): boolean {
		return user.attrs?.class?.includes('posixaccount') || false;
	}
</script>

<div class="container mx-auto px-4 py-8">
	<div class="mb-8 flex items-center justify-between">
		<h1 class="text-3xl font-bold">Users</h1>
		<button class="btn btn-primary" onclick={() => (showCreateForm = !showCreateForm)}>
			{showCreateForm ? 'Cancel' : 'Create User'}
		</button>
	</div>

	{#if showCreateForm}
		<div class="card bg-base-200 mx-auto mb-8 max-w-2xl">
			<div class="card-body">
				<h2 class="card-title">Create New User</h2>

				<div class="form-control">
					<label class="label" for="create-user-name">
						<span class="label-text font-medium">Username</span>
						<span class="label-text-alt">Unique identifier for the user</span>
					</label>
					<input
						id="create-user-name"
						type="text"
						class="input input-bordered"
						placeholder="john.doe"
						bind:value={createValues.name}
						required
					/>
				</div>

				<div class="form-control">
					<label class="label" for="create-user-display-name">
						<span class="label-text font-medium">Display Name</span>
						<span class="label-text-alt">Human-readable name for the user</span>
					</label>
					<input
						id="create-user-display-name"
						type="text"
						class="input input-bordered"
						placeholder="John Doe"
						bind:value={createValues.displayName}
						required
					/>
				</div>

				<div class="form-control">
					<label class="label" for="create-user-legal-name">
						<span class="label-text font-medium">Legal Name (Optional)</span>
						<span class="label-text-alt">Full legal name</span>
					</label>
					<input
						id="create-user-legal-name"
						type="text"
						class="input input-bordered"
						placeholder="John Michael Doe"
						bind:value={createValues.legalName}
					/>
				</div>

				<div class="form-control">
					<label class="label" for="create-user-email">
						<span class="label-text font-medium">Email (Optional)</span>
						<span class="label-text-alt">User's email address</span>
					</label>
					<input
						id="create-user-email"
						type="email"
						class="input input-bordered"
						placeholder="john.doe@example.com"
						bind:value={createValues.mail}
					/>
				</div>

				<div class="card-actions mt-6 justify-end">
					<button class="btn btn-outline" onclick={() => (showCreateForm = false)}> Cancel </button>
					<button
						class="btn btn-primary"
						onclick={() => createUser()}
						disabled={!createValues.name || !createValues.displayName}
					>
						Create User
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Unix Extension Modal -->
	{#if showUnixForm.show}
		<div class="modal modal-open">
			<div class="modal-box max-w-2xl">
				<h3 class="text-lg font-bold">Enable Unix Extension</h3>
				<p class="py-4">
					Enable Unix/POSIX extension for user <strong>{showUnixForm.userName}</strong>
				</p>

				<div class="space-y-4">
					<div class="alert alert-info">
						<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
						<span>Note: UID number and home directory are automatically assigned by the system.</span>
					</div>

					<div class="form-control">
						<label class="label" for="unix-gid">
							<span class="label-text font-medium">GID Number (Optional)</span>
							<span class="label-text-alt">Primary group identifier</span>
						</label>
						<input
							id="unix-gid"
							type="number"
							class="input input-bordered"
							placeholder="1000"
							bind:value={showUnixForm.gidNumber}
							min="1000"
						/>
					</div>

					<div class="form-control">
						<label class="label" for="unix-shell">
							<span class="label-text font-medium">Login Shell</span>
							<span class="label-text-alt">Default shell for the user</span>
						</label>
						<select id="unix-shell" class="select select-bordered" bind:value={showUnixForm.loginShell}>
							<option value="/bin/bash">/bin/bash</option>
							<option value="/bin/sh">/bin/sh</option>
							<option value="/bin/zsh">/bin/zsh</option>
							<option value="/bin/fish">/bin/fish</option>
							<option value="/usr/bin/nologin">/usr/bin/nologin</option>
						</select>
					</div>
				</div>

				<div class="modal-action">
					<button
						class="btn btn-outline"
						onclick={() =>
							(showUnixForm = {
								show: false,
								userName: '',
								uidNumber: '',
								gidNumber: '',
								homeDirectory: '',
								loginShell: '/bin/bash'
							})}
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

	<!-- SSH Key Modal -->
	{#if showSshKeyForm.show}
		<div class="modal modal-open">
			<div class="modal-box max-w-2xl">
				<h3 class="text-lg font-bold">Add SSH Public Key</h3>
				<p class="py-4">
					Add SSH public key for user <strong>{showSshKeyForm.userName}</strong>
				</p>

				<div class="space-y-4">
					<div class="form-control">
						<label class="label" for="ssh-tag">
							<span class="label-text font-medium">Key Tag</span>
							<span class="label-text-alt">Unique identifier for this key</span>
						</label>
						<input
							id="ssh-tag"
							type="text"
							class="input input-bordered"
							placeholder="laptop-key"
							bind:value={showSshKeyForm.keyTag}
							required
						/>
					</div>

					<div class="form-control">
						<label class="label" for="ssh-pubkey">
							<span class="label-text font-medium">Public Key</span>
							<span class="label-text-alt">SSH public key content</span>
						</label>
						<textarea
							id="ssh-pubkey"
							class="textarea textarea-bordered h-32 font-mono text-sm"
							placeholder="ssh-rsa AAAAB3NzaC1yc2EAAAA..."
							bind:value={showSshKeyForm.publicKey}
							required
						></textarea>
					</div>
				</div>

				<div class="modal-action">
					<button
						class="btn btn-outline"
						onclick={() =>
							(showSshKeyForm = { show: false, userName: '', keyTag: '', publicKey: '' })}
					>
						Cancel
					</button>
					<button class="btn btn-primary" onclick={() => addSshKey()}> Add SSH Key </button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Password Reset Modal -->
	{#if showPasswordForm.show}
		<div class="modal modal-open">
			<div class="modal-box">
				<h3 class="text-lg font-bold">Reset Password</h3>
				<p class="py-4">
					Reset password for user <strong>{showPasswordForm.userName}</strong>
				</p>

				<div class="form-control">
					<label class="label" for="new-password">
						<span class="label-text font-medium">New Password</span>
						<span class="label-text-alt">Enter a secure password</span>
					</label>
					<input
						id="new-password"
						type="password"
						class="input input-bordered"
						bind:value={showPasswordForm.password}
						required
					/>
				</div>

				<div class="modal-action">
					<button
						class="btn btn-outline"
						onclick={() => (showPasswordForm = { show: false, userName: '', password: '' })}
					>
						Cancel
					</button>
					<button class="btn btn-primary" onclick={() => resetPassword()}> Reset Password </button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Group Management Modal -->
	{#if showGroupForm.show}
		<div class="modal modal-open">
			<div class="modal-box">
				<h3 class="text-lg font-bold">
					{showGroupForm.mode === 'add' ? 'Add User to Group' : 'Remove User from Group'}
				</h3>
				<p class="py-4">
					{showGroupForm.mode === 'add'
						? `Add user ${showGroupForm.userName} to a group`
						: `Remove user ${showGroupForm.userName} from group ${showGroupForm.groupName}`}
				</p>

				{#if showGroupForm.mode === 'add'}
					<div class="form-control">
						<label class="label" for="group-name">
							<span class="label-text font-medium">Group Name</span>
							<span class="label-text-alt">Name of the group to add user to</span>
						</label>
						<input
							id="group-name"
							type="text"
							class="input input-bordered"
							placeholder="my-group"
							bind:value={showGroupForm.groupName}
							required
						/>
					</div>
				{/if}

				<div class="modal-action">
					<button
						class="btn btn-outline"
						onclick={() =>
							(showGroupForm = { show: false, userName: '', groupName: '', mode: 'add' })}
					>
						Cancel
					</button>
					<button
						class="btn {showGroupForm.mode === 'add' ? 'btn-primary' : 'btn-error'}"
						onclick={() =>
							showGroupForm.mode === 'add' ? addUserToGroup() : removeUserFromGroup()}
					>
						{showGroupForm.mode === 'add' ? 'Add to Group' : 'Remove from Group'}
					</button>
				</div>
			</div>
		</div>
	{/if}

	<div class="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
		{#each data.users?.body || [] as user}
			{@const userName = user.attrs?.name[0]}
			{@const isEditing = editingUsers[userName]}
			{@const isUnixEnabled = hasUnixExtension(user)}
			<div class="card bg-base-300 flex w-full flex-col">
				<div class="card-body flex flex-1 flex-col">
					<h2 class="card-title mb-4 flex items-center gap-2">
						<span class="flex-1">
							{#if isEditing}
								Editing: {user.attrs?.displayname?.[0] || userName}
							{:else}
								{user.attrs?.displayname?.[0] || userName}
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
									<label class="label" for="displayname-{userName}">
										<span class="label-text font-medium">Display Name</span>
									</label>
									<input
										id="displayname-{userName}"
										class="input input-bordered"
										bind:value={editValues[userName].displayName}
										placeholder="Enter display name"
									/>
								</div>

								<div class="form-control">
									<label class="label" for="email-{userName}">
										<span class="label-text font-medium">Email</span>
									</label>
									<input
										id="email-{userName}"
										type="email"
										class="input input-bordered"
										bind:value={editValues[userName].mail}
										placeholder="user@example.com"
									/>
								</div>

								<div class="form-control">
									<label class="label" for="legal-name-{userName}">
										<span class="label-text font-medium">Legal Name</span>
									</label>
									<input
										id="legal-name-{userName}"
										class="input input-bordered"
										bind:value={editValues[userName].legalName}
										placeholder="Full legal name"
									/>
								</div>
							</div>
						{:else}
							<div class="space-y-4">
								<div class="bg-base-100 rounded-lg p-4">
									<div class="text-base-content/70 mb-1 text-sm font-medium">Username</div>
									<div class="font-mono text-sm">{user.attrs?.name.join(', ')}</div>
								</div>

								{#if user.attrs?.mail?.length}
									<div class="bg-base-100 rounded-lg p-4">
										<div class="text-base-content/70 mb-1 text-sm font-medium">Email</div>
										<div class="text-sm">{user.attrs.mail[0]}</div>
									</div>
								{/if}

								{#if user.attrs?.legalname?.length}
									<div class="bg-base-100 rounded-lg p-4">
										<div class="text-base-content/70 mb-1 text-sm font-medium">Legal Name</div>
										<div class="text-sm">{user.attrs.legalname[0]}</div>
									</div>
								{/if}

								<div class="bg-base-100 rounded-lg p-4">
									<div class="mb-3 flex items-center justify-between">
										<div class="text-base-content/70 text-sm font-medium">Group Membership</div>
										<button
											class="btn btn-sm btn-primary"
											onclick={() => openGroupForm(userName, 'add')}
										>
											Add to Group
										</button>
									</div>
									{#if user.attrs?.memberof?.length}
										<div class="space-y-2">
											{#each user.attrs.memberof as group}
												<div class="bg-base-200 flex items-center justify-between rounded p-2">
													<span class="text-sm">{group}</span>
													<button
														class="btn btn-xs btn-error"
														onclick={() => openGroupForm(userName, 'remove', group)}
													>
														Remove
													</button>
												</div>
											{/each}
										</div>
									{:else}
										<div class="text-base-content/60 text-sm italic">Not a member of any groups</div>
									{/if}
								</div>

								{#if isUnixEnabled}
									<div class="bg-base-100 rounded-lg p-4">
										<div class="mb-2 flex items-center justify-between">
											<div class="text-base-content/70 text-sm font-medium">Unix Extension</div>
										</div>
										<div class="space-y-1 text-xs text-base-content/70">
											{#if user.attrs?.uidnumber}
												<div>UID: {user.attrs.uidnumber[0]}</div>
											{/if}
											{#if user.attrs?.gidnumber}
												<div>GID: {user.attrs.gidnumber[0]}</div>
											{/if}
											{#if user.attrs?.homedirectory}
												<div>Home: {user.attrs.homedirectory[0]}</div>
											{/if}
											{#if user.attrs?.loginshell}
												<div>Shell: {user.attrs.loginshell[0]}</div>
											{/if}
										</div>
									</div>
								{/if}

								<div class="bg-base-100 rounded-lg p-4">
									<div class="mb-3 flex items-center justify-between">
										<div class="text-base-content/70 text-sm font-medium">SSH Keys</div>
										<div class="space-x-2">
											<button
												class="btn btn-sm btn-primary"
												onclick={() => openSshKeyForm(userName)}
											>
												Add Key
											</button>
											<button class="btn btn-sm btn-secondary" onclick={() => getSshKeys(userName)}>
												Copy All
											</button>
										</div>
									</div>
									{#if user.attrs?.ssh_publickey?.length}
										<div class="space-y-2">
											{#each user.attrs.ssh_publickey as key, index}
												<div class="bg-base-200 flex items-center justify-between rounded p-2">
													<code class="flex-1 text-xs break-all"
														>{key.substring(0, 50)}...{key.substring(key.length - 20)}</code
													>
													<button
														class="btn btn-xs btn-error ml-2"
														onclick={() => removeSshKey(userName, `key-${index}`)}
													>
														Remove
													</button>
												</div>
											{/each}
										</div>
									{:else}
										<div class="text-base-content/60 text-sm italic">No SSH keys</div>
									{/if}
								</div>

								<div class="bg-base-100 rounded-lg p-4">
									<div class="text-base-content/70 mb-1 text-sm font-medium">UUID</div>
									<code class="text-sm break-all">{user.attrs?.uuid[0]}</code>
								</div>

								<div class="bg-base-100 rounded-lg p-4">
									<div class="text-base-content/70 mb-1 text-sm font-medium">Classes</div>
									<div class="flex flex-wrap gap-1">
										{#each user.attrs?.class || [] as cls}
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
							<button class="btn btn-outline" onclick={() => toggleEditMode(userName)}>
								Cancel
							</button>
							<button class="btn btn-primary" onclick={() => saveUserChanges(userName)}>
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
											<button onclick={() => openUnixForm(userName)}>Enable Unix Extension</button>
										</li>
									{/if}
									{#if isUnixEnabled}
										<li>
											<button onclick={() => openPasswordForm(userName)}>Reset Password</button>
										</li>
									{/if}
									<li><button onclick={() => toggleEditMode(userName)}>Edit User</button></li>
									<li>
										<button class="text-error" onclick={() => deleteUser(userName)}>Delete User</button>
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