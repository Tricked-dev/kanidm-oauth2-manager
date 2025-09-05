<script lang="ts">
	import { kaniRequest } from '../../utils';
	import { invalidate } from '$app/navigation';
	import Cropper from 'svelte-easy-crop';

	interface ImageModalState {
		show: boolean;
		appName: string;
		mode: 'upload' | 'crop' | 'delete';
		file?: File;
		imageSrc?: string;
		cropResult?: { blob: Blob; url: string };
		croppedAreaPixels?: any;
	}

	const {
		imageModal,
		data,
		addNotification
	}: {
		imageModal: ImageModalState;
		data: any;
		addNotification: (type: 'success' | 'error' | 'info', message: string) => void;
	} = $props();

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

			if (width <= 0 || height <= 0) {
				addNotification('error', 'Invalid crop dimensions');
				return;
			}

			if (x < 0 || y < 0 || x + width > img.naturalWidth || y + height > img.naturalHeight) {
				addNotification('error', 'Crop area exceeds image bounds');
				return;
			}

			// Determine target size: scale down if larger than 1024px
			let targetSize = Math.min(Math.round(width), Math.round(height), 1024);

			canvas.width = targetSize;
			canvas.height = targetSize;

			ctx.clearRect(0, 0, canvas.width, canvas.height);

			// Draw the cropped and potentially scaled image
			ctx.drawImage(
				img,
				Math.round(x),
				Math.round(y),
				Math.round(width),
				Math.round(height),
				0,
				0,
				targetSize,
				targetSize
			);

			// Create initial blob
			let blob: Blob = await new Promise((resolve, reject) => {
				canvas.toBlob(
					(result) => {
						if (result) {
							resolve(result);
						} else {
							reject(new Error('Canvas toBlob returned null'));
						}
					},
					'image/webp',
					0.9
				);
			});

			// If still over 256KB and we haven't tried 512px yet, resize to 512px
			if (blob.size > 256 * 1024 && targetSize > 512) {
				targetSize = 512;
				canvas.width = targetSize;
				canvas.height = targetSize;

				ctx.clearRect(0, 0, canvas.width, canvas.height);

				ctx.drawImage(
					img,
					Math.round(x),
					Math.round(y),
					Math.round(width),
					Math.round(height),
					0,
					0,
					targetSize,
					targetSize
				);

				blob = await new Promise((resolve, reject) => {
					canvas.toBlob(
						(result) => {
							if (result) {
								resolve(result);
							} else {
								reject(new Error('Canvas toBlob returned null'));
							}
						},
						'image/webp',
						0.9
					);
				});
			}

			const file = new File([blob], 'cropped-image.webp', { type: 'image/webp' });
			addNotification(
				'info',
				`Image processed: ${targetSize}x${targetSize}px, ${Math.round(blob.size / 1024)}KB`
			);
			await uploadImage(imageModal.appName, file);
		} catch (error: any) {
			console.error('Error cropping image:', error);
			addNotification('error', `Failed to crop image: ${error.message}`);
		}
	}

	function closeImageModal() {
		imageModal.show = false;
		imageModal.appName = '';
		imageModal.mode = 'upload';
		if (imageModal.imageSrc) URL.revokeObjectURL(imageModal.imageSrc);
		if (imageModal.cropResult) URL.revokeObjectURL(imageModal.cropResult.url);
	}

	function validateImageFile(file: File): string | null {
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

		imageModal.mode = 'crop';
		imageModal.file = file;
		imageModal.imageSrc = URL.createObjectURL(file);
		target.value = '';
	}

	async function uploadImage(appName: string, file: File) {
		try {
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
</script>

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
				{@const app = data.apps.body.find((a: any) => a.attrs?.name[0] === imageModal.appName)}
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
