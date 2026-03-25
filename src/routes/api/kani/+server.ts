import type { RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getCachedToken, clearTokenCache } from '$lib/auth';

// Allowlist of valid Kanidm API path prefixes.
// Prevents the proxy from being used to reach arbitrary endpoints on the
// Kanidm server (or anything else reachable from the container) via a
// crafted data.path value.
const ALLOWED_PATH_PREFIXES = [
	'v1/oauth2',
	'v1/group',
	'v1/person',
	'v1/account',
	'v1/service_account'
];

function isAllowedPath(path: string): boolean {
	if (!path || typeof path !== 'string') return false;
	// Reject anything with path traversal attempts
	if (path.includes('..') || path.includes('//')) return false;
	return ALLOWED_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export const POST: RequestHandler = async ({ request }) => {
	const token = await getCachedToken();

	const contentType = request.headers.get('content-type') ?? '';
	let data: any;
	let requestBody: string | FormData | Uint8Array | undefined;
	let requestHeaders: Record<string, string> = {
		Authorization: `Bearer ${token}`
	};

	if (contentType.includes('multipart/form-data')) {
		// Handle FormData (multipart uploads)
		const formData = await request.formData();
		const jsonData = formData.get('json') as string;
		data = JSON.parse(jsonData);

		// Create new FormData with the file for the Kanidm API
		const kanidmFormData = new FormData();
		const imageFile = formData.get('image') as File;
		if (imageFile) {
			kanidmFormData.append('image', imageFile);
		}
		requestBody = kanidmFormData;
		// Don't set content-type header for multipart, let fetch handle it
	} else {
		// Handle JSON data
		data = await request.json();

		if (data.contentType && data.body && typeof data.body === 'string') {
			// Handle binary data (base64 encoded)
			const binaryString = atob(data.body);
			const uint8Array = new Uint8Array(binaryString.length);
			for (let i = 0; i < binaryString.length; i++) {
				uint8Array[i] = binaryString.charCodeAt(i);
			}
			requestBody = uint8Array;
			requestHeaders['content-type'] = data.contentType;
		} else if (data.body) {
			// Handle JSON data
			requestBody = JSON.stringify(data.body);
			requestHeaders['content-type'] = 'application/json';
		}
	}
	if (!isAllowedPath(data.path)) {
		console.warn(`[kani] Blocked request to disallowed path: ${data.path}`);
		return Response.json({ status: 403, body: 'Path not allowed' }, { status: 403 });
	}

	async function doFetch(token: string) {
		return fetch(`${env.KANIDM_BASE_URL}/${data.path}`, {
			method: data.method,
			headers: { ...requestHeaders, Authorization: `Bearer ${token}` },
			body: requestBody
		});
	}

	if (import.meta.env.DEV) {
		console.log('fetching path:', `${env.KANIDM_BASE_URL}/${data.path}`);
	}

	let result = await doFetch(token);

	// If Kanidm rejects the token (e.g. session expired / server restarted),
	// clear the cache and retry once with a fresh token.
	if (result.status === 401) {
		clearTokenCache();
		const freshToken = await getCachedToken();
		result = await doFetch(freshToken);
	}

	if (!result.ok) {
		if (import.meta.env.DEV) {
			console.log('Request failed:', result.status, result.statusText);
			if (requestBody instanceof FormData) {
				console.log('FormData keys:', Array.from(requestBody.keys()));
			} else {
				console.log('BODY:', data.body);
			}
		}
	}

	let res;
	let ct = result.headers.get('content-type') ?? '';
	if (!ct.includes('json')) {
		res = {
			status: result.status,
			body: await result.text()
		};
	} else {
		res = { status: result.status, body: await result.json() };
	}
	if (import.meta.env.DEV) {
		console.log(res);
		console.log(JSON.stringify(res));
	}

	return Response.json(res, {
		headers: {
			'content-type': ct
		}
	});
};
