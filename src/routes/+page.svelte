<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { onMount } from 'svelte';
	import { kaniRequest } from '../utils';
	import Cropper from 'svelte-easy-crop';

	const { data } = $props();

	let editingApps = $state<Record<string, boolean>>({});
	let editValues = $state<
		Record<string, { displayName: string; origin: string; redirectUrls: string }>
	>({});
	let notifications = $state<
		Array<{ id: string; type: 'success' | 'error' | 'info'; message: string; timeout?: number }>
	>([]);
	let showCreateForm = $state(false);
	let scopeMapModal = $state<{
		show: boolean;
		appName: string;
		mode: 'add' | 'delete';
		groupName?: string;
	}>({
		show: false,
		appName: '',
		mode: 'add'
	});
	let scopeMapForm = $state({
		groupName: '',
		scopes: 'email, profile, openid, groups'
	});
	let imageModal = $state<{
		show: boolean;
		appName: string;
		mode: 'upload' | 'crop' | 'delete';
		file?: File;
		imageSrc?: string;
		cropResult?: { blob: Blob; url: string };
		croppedAreaPixels?: any;
	}>({
		show: false,
		appName: '',
		mode: 'upload'
	});
	let deleteModal = $state<{
		show: boolean;
		appName: string;
		displayName: string;
	}>({
		show: false,
		appName: '',
		displayName: ''
	});
	let createValues = $state({
		name: '',
		displayName: '',
		origin: '',
		redirectUrls: '',
		type: 'basic' as 'basic' | 'public'
	});

	let crop = $state({ x: 0, y: 0 });
	let zoom = $state(1);

	async function handleCropComplete(croppedArea: any) {
		imageModal.croppedAreaPixels = croppedArea.pixels;
	}

	async function cropAndUpload() {
		if (!imageModal.file || !imageModal.imageSrc || !imageModal.croppedAreaPixels) {
			addNotification('error', 'Missing image or crop data');
			return;
		}

		try {
			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d');

			if (!ctx) {
				addNotification('error', 'Canvas context not available');
				return;
			}

			const img = new Image();
			img.crossOrigin = 'anonymous';

			await new Promise((resolve, reject) => {
				img.onload = resolve;
				img.onerror = (e) => {
					console.error('Image load error:', e);
					reject(e);
				};
				img.src = imageModal.imageSrc!;
			});

			const { x, y, width, height } = imageModal.croppedAreaPixels;

			// Ensure canvas dimensions are valid
			if (width <= 0 || height <= 0) {
				addNotification('error', 'Invalid crop dimensions');
				return;
			}

			// Ensure crop area is within image bounds
			if (x < 0 || y < 0 || x + width > img.naturalWidth || y + height > img.naturalHeight) {
				addNotification('error', 'Crop area exceeds image bounds');
				return;
			}

			canvas.width = Math.round(width);
			canvas.height = Math.round(height);

			ctx.clearRect(0, 0, canvas.width, canvas.height);

			ctx.drawImage(
				img,
				Math.round(x),
				Math.round(y),
				Math.round(width),
				Math.round(height),
				0,
				0,
				canvas.width,
				canvas.height
			);

			try {
				const blob: Blob = await new Promise((resolve, reject) => {
					canvas.toBlob((result) => {
						if (result) {
							resolve(result);
						} else {
							reject(new Error('Canvas toBlob returned null'));
						}
					}, 'image/webp');
				});

				const file = new File([blob], 'cropped-image.webp', { type: 'image/webp' });
				await uploadImage(imageModal.appName, file);
			} catch (blobError: any) {
				console.error('Blob creation error:', blobError);
				addNotification('error', `Failed to create image blob: ${blobError.message}`);
			}
		} catch (error: any) {
			console.error('Error cropping image:', error);
			addNotification('error', `Failed to crop image: ${error.message}`);
		}
	}

	function addNotification(type: 'success' | 'error' | 'info', message: string, timeout = 5000) {
		const id = Math.random().toString(36).substr(2, 9);
		notifications.push({ id, type, message, timeout });

		if (timeout > 0) {
			setTimeout(() => {
				notifications = notifications.filter((n) => n.id !== id);
			}, timeout);
		}
	}

	function removeNotification(id: string) {
		notifications = notifications.filter((n) => n.id !== id);
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

	function openImageModal(appName: string, mode: 'upload' | 'delete') {
		imageModal = { show: true, appName, mode };
	}

	function closeImageModal() {
		imageModal = { show: false, appName: '', mode: 'upload' };
		// Clean up any object URLs
		if (imageModal.imageSrc) URL.revokeObjectURL(imageModal.imageSrc);
		if (imageModal.cropResult) URL.revokeObjectURL(imageModal.cropResult.url);
	}

	function validateImageFile(file: File): string | null {
		// Check file size (256KB = 256 * 1024 bytes)
		// if (file.size > 256 * 1024) {
		// 	return 'Image must be less than 256 KB';
		// }

		// Check file type
		const allowedTypes = [
			'image/png',
			'image/jpeg',
			'image/jpg',
			'image/gif',
			'image/svg+xml',
			'image/webp'
		];
		if (!allowedTypes.includes(file.type)) {
			return 'Unsupported image format. Use PNG, JPG, GIF, SVG, or WebP';
		}

		return null;
	}

	async function handleImageUpload(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];

		if (!file) return;

		const error = validateImageFile(file);
		if (error) {
			addNotification('error', error);
			target.value = '';
			return;
		}

		// For SVG and GIF, validate size then upload directly
		if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
			if (file.size > 256 * 1024) {
				addNotification('error', 'Image must be less than 256 KB');
				target.value = '';
				return;
			}
			await uploadImage(imageModal.appName, file);
			target.value = '';
			return;
		}

		// For PNG/JPG/WebP, always open cropper for processing
		imageModal = {
			...imageModal,
			mode: 'crop',
			file,
			imageSrc: URL.createObjectURL(file)
		};
		target.value = '';
	}

	async function uploadImage(appName: string, file: File) {
		try {
			// Create FormData for multipart upload
			const formData = new FormData();
			formData.append('image', file);

			const response = await kaniRequest(fetch, {
				path: `v1/oauth2/${appName}/_image`,
				method: 'POST',
				formData: formData
			});

			if (response.status === 200) {
				addNotification('success', `Successfully uploaded image for ${appName}`);
				closeImageModal();
				await invalidate(() => true);
			} else {
				let errorMessage = 'Failed to upload image';
				if (response.body && typeof response.body === 'string') {
					errorMessage = response.body;
				}
				addNotification('error', errorMessage);
			}
		} catch (error) {
			console.error(error);
			addNotification('error', 'Network error while uploading image');
		}
	}

	async function deleteImage(appName: string) {
		const response = await kaniRequest(fetch, {
			path: `v1/oauth2/${appName}/_image`,
			method: 'DELETE'
		});

		if (response.status === 200) {
			addNotification('success', `Removed image for ${appName}`);
			closeImageModal();
			await invalidate(() => true);
		} else {
			let errorMessage = 'Failed to remove image';
			if (response.body && typeof response.body === 'string') {
				errorMessage = response.body;
			}
			addNotification('error', errorMessage);
		}
	}

	async function copySecret(appName: string) {
		try {
			const result = await kaniRequest<string>(fetch, {
				path: `v1/oauth2/${appName}/_basic_secret`,
				method: 'GET'
			});

			if (result.status === 200 && result.body) {
				await navigator.clipboard.writeText(result.body);
				addNotification('success', `Secret copied to clipboard for ${appName}`);
			} else {
				addNotification('error', 'Failed to fetch secret');
			}
		} catch (error) {
			console.error(error);
			addNotification('error', 'Failed to copy secret to clipboard');
		}
	}

	function openDeleteModal(appName: string, displayName: string) {
		deleteModal = { show: true, appName, displayName };
	}

	function closeDeleteModal() {
		deleteModal = { show: false, appName: '', displayName: '' };
	}

	async function deleteApplication() {
		const response = await kaniRequest(fetch, {
			path: `v1/oauth2/${deleteModal.appName}`,
			method: 'DELETE'
		});

		if (response.status === 200) {
			addNotification('success', `Successfully deleted application: ${deleteModal.displayName}`);
			closeDeleteModal();
			await invalidate(() => true);
		} else {
			let errorMessage = 'Failed to delete application';
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

	onMount(() => {
		const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
		if (!link) return;
		link.href = '/favicon.png';
	});
</script>

<!-- Notification Toast Container -->
<div class="toast toast-top toast-end z-50">
	{#each notifications as notification}
		<div
			class="alert {notification.type === 'success'
				? 'alert-success'
				: notification.type === 'error'
					? 'alert-error'
					: 'alert-info'} max-w-md shadow-lg"
		>
			<div class="flex items-center gap-2">
				{#if notification.type === 'success'}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-6 w-6 shrink-0 stroke-current"
						fill="none"
						viewBox="0 0 24 24"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
						/></svg
					>
				{:else if notification.type === 'error'}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-6 w-6 shrink-0 stroke-current"
						fill="none"
						viewBox="0 0 24 24"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
						/></svg
					>
				{:else}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						class="h-6 w-6 shrink-0 stroke-current"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						></path></svg
					>
				{/if}
				<span class="flex-1 text-sm">{notification.message}</span>
				<button
					class="btn btn-sm btn-circle btn-ghost"
					onclick={() => removeNotification(notification.id)}>✕</button
				>
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
										class="textarea textarea-bordered h-32 font-mono text-sm w-full"
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
									<div class="mb-3 flex items-center justify-between">
										<div class="text-base-content/70 text-sm font-medium">Application Image</div>
										<div class="space-x-2">
											<button
												class="btn btn-sm btn-primary"
												onclick={() => openImageModal(appName, 'upload')}
											>
												{app.attrs?.image?.length ? 'Update' : 'Upload'}
											</button>
											{#if app.attrs?.image?.length}
												<button
													class="btn btn-sm btn-error"
													onclick={() => openImageModal(appName, 'delete')}
												>
													Delete
												</button>
											{/if}
										</div>
									</div>
									{#if app.attrs?.image?.length}
										<div class="flex justify-center">
											<img
												src="/api/kani/image/{appName}"
												alt="Application logo"
												class="border-base-300 h-16 w-16 rounded-lg border object-cover"
											/>
										</div>
									{:else}
										<div
											class="bg-base-200 border-base-300 flex h-16 items-center justify-center rounded-lg border-2 border-dashed"
										>
											<span class="text-base-content/60 text-sm">No image uploaded</span>
										</div>
									{/if}
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
									<div class="mb-3 flex items-center justify-between">
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
												<div class="bg-base-200 flex items-center justify-between rounded p-2">
													<code class="flex-1 text-xs break-all">{scope}</code>
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
							<button
								class="btn btn-error"
								onclick={() => openDeleteModal(appName, app.attrs?.displayname?.[0] || appName)}
							>
								Delete
							</button>
							<button class="btn btn-secondary" onclick={() => copySecret(appName)}>
								Copy Secret
							</button>
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
								.find((app) => app.attrs?.name[0] === scopeMapModal.appName)
								?.attrs?.oauth2_rs_scope_map?.find((scope) =>
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

<!-- Image Management Modal -->
{#if imageModal.show}
	<div class="modal modal-open">
		<div class="modal-box max-w-2xl">
			<h3 class="text-lg font-bold">
				{imageModal.mode === 'upload'
					? 'Upload Application Image'
					: imageModal.mode === 'crop'
						? 'Crop Image'
						: 'Delete Application Image'}
			</h3>

			{#if imageModal.mode === 'upload'}
				<div class="py-4">
					<div class="form-control">
						<label class="label" for="image-upload">
							<span class="label-text font-medium">Select Image</span>
							<span class="label-text-alt">Max 256KB, square format preferred</span>
						</label>
						<input
							id="image-upload"
							type="file"
							accept="image/png,image/jpeg,image/jpg,image/gif,image/svg+xml,image/webp"
							class="file-input file-input-bordered w-full"
							onchange={handleImageUpload}
						/>
					</div>

					<div class="alert alert-info mt-4">
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
							<div><strong>Requirements:</strong></div>
							<ul class="mt-1 list-inside list-disc">
								<li>Maximum 1024 x 1024 pixels</li>
								<li>Less than 256 KB</li>
								<li>Supported formats: PNG, JPG, GIF, SVG, WebP</li>
								<li>Square images work best</li>
							</ul>
							<div class="mt-2">
								<strong>Note:</strong> SVG and GIF files are uploaded directly. Other formats may be
								cropped to square.
							</div>
						</div>
					</div>
				</div>
			{:else if imageModal.mode === 'crop'}
				<div class="py-4">
					<p class="mb-4">Crop your image to make it square (1:1 aspect ratio):</p>
					{#if imageModal.imageSrc}
						<div class="relative h-96 w-full">
							<Cropper
								image={imageModal.imageSrc}
								bind:crop
								bind:zoom
								oncropcomplete={handleCropComplete}
								aspect={1}
							/>
						</div>
						<div class="alert alert-info mt-4">
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
								Image will be converted to WebP format and resized to max 1024px. If still too
								large, it will be resized to 512px.
							</div>
						</div>
					{/if}
				</div>
			{:else}
				{@const app = data.apps.body.find((a) => a.attrs?.name[0] === imageModal.appName)}
				<div class="py-4">
					<p>
						Are you sure you want to delete the image for <strong>{imageModal.appName}</strong>?
					</p>
					<div class="mt-4 flex justify-center">
						<div class="border-base-300 h-32 w-32 overflow-hidden rounded-lg border">
							{#if app?.attrs?.image?.length}
								<img
									src="/api/kani/image/{imageModal.appName}"
									alt="Current application logo"
									class="h-full w-full object-cover"
								/>
							{/if}
						</div>
					</div>
				</div>
			{/if}

			<div class="modal-action">
				<button class="btn btn-outline" onclick={closeImageModal}>Cancel</button>
				{#if imageModal.mode === 'delete'}
					<button class="btn btn-error" onclick={() => deleteImage(imageModal.appName)}>
						Delete Image
					</button>
				{:else if imageModal.mode === 'crop'}
					<button
						class="btn btn-primary"
						onclick={() => cropAndUpload()}
						disabled={!imageModal.croppedAreaPixels}
					>
						Crop & Upload
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}

<!-- Delete Application Confirmation Modal -->
{#if deleteModal.show}
	<div class="modal modal-open">
		<div class="modal-box">
			<h3 class="text-lg font-bold">Delete Application</h3>

			<div class="py-4">
				<div class="alert alert-warning mb-4">
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
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z"
						/>
					</svg>
					<div>
						<div class="font-bold">Warning: This action cannot be undone!</div>
						<div class="text-sm">
							This will permanently delete the OAuth2 application and all its configuration.
						</div>
					</div>
				</div>

				<p class="mb-2 text-lg">Are you sure you want to delete the application:</p>
				<div class="bg-base-200 rounded p-3">
					<div class="text-xl font-bold">{deleteModal.displayName}</div>
					<div class="text-base-content/70 font-mono text-sm">({deleteModal.appName})</div>
				</div>
			</div>

			<div class="modal-action">
				<button class="btn btn-outline" onclick={closeDeleteModal}>Cancel</button>
				<button class="btn btn-error" onclick={() => deleteApplication()}>
					Delete Application
				</button>
			</div>
		</div>
	</div>
{/if}
