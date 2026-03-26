import { base } from '$app/paths';
import { invalidateAll } from '$app/navigation';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KaniRequest {
	method?: 'POST' | 'GET' | 'PATCH' | 'DELETE' | 'PUT';
	body?: any;
	path: string;
	contentType?: string;
	formData?: FormData;
}

export interface KaniResponse<T> {
	status: number;
	body: T;
	/** Kanidm operation ID — matches the kopid in server logs for easy correlation. */
	kopid?: string;
}

// ---------------------------------------------------------------------------
// API proxy
// ---------------------------------------------------------------------------

/** Typed proxy to the internal /api/kani endpoint. */
export async function kaniRequest<T>(f: typeof fetch, data: KaniRequest): Promise<KaniResponse<T>> {
	let requestBody: string | FormData;
	let headers: Record<string, string> = {};

	if (data.formData) {
		const form = data.formData;
		delete data['formData'];
		form.set('json', JSON.stringify(data));
		requestBody = form;
	} else {
		requestBody = JSON.stringify(data);
		headers['Content-Type'] = 'application/json';
	}

	const result = await f(`${base}/api/kani`, {
		method: 'POST',
		headers,
		body: requestBody
	});

	const response = await result.json();

	if (import.meta.env.DEV && response.status >= 400) {
		console.group(`🚨 Kanidm API Error: ${data.method || 'GET'} ${data.path}`);
		console.error('Status:', response.status);
		console.error('Response Body:', JSON.stringify(response.body));
		console.error('Full Request:', JSON.stringify(data));
		console.groupEnd();
	}

	return response;
}

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

/**
 * Extract a human-readable error string from a Kanidm API response body.
 * Kanidm returns errors in several shapes depending on the operation:
 *   - plain string  e.g. "\"some message\""
 *   - { invalidattribute: "..." }
 *   - { detail: "..." }
 * Centralising this means one place to update when Kanidm changes its error format.
 */
export function parseKanidmError(body: unknown, fallback: string): string {
	if (typeof body === 'string') return body.replace(/^"|"$/g, '');
	if (body && typeof body === 'object') {
		if ('invalidattribute' in body) return String((body as any).invalidattribute);
		if ('detail' in body) return String((body as any).detail);
	}
	return fallback;
}

// ---------------------------------------------------------------------------
// Attrs builder
// ---------------------------------------------------------------------------

/**
 * Build a Kanidm attrs object from a plain record.
 * String values are trimmed and wrapped in an array.
 * Array values are passed through as-is.
 * Falsy / empty values are omitted entirely.
 *
 * Lowercasing (e.g. for `name`) is the caller's responsibility.
 */
export function buildAttrs(
	fields: Record<string, string | string[] | undefined | null>
): Record<string, string[]> {
	const attrs: Record<string, string[]> = {};
	for (const [key, value] of Object.entries(fields)) {
		if (Array.isArray(value) && value.length > 0) {
			attrs[key] = value;
		} else if (typeof value === 'string' && value.trim()) {
			attrs[key] = [value.trim()];
		}
	}
	return attrs;
}

// ---------------------------------------------------------------------------
// Response handler
// ---------------------------------------------------------------------------

/**
 * Handle a Kanidm API response uniformly:
 * - 200 → run onSuccess, invalidateAll, show success notification, return true
 * - status in statusMessages → show that specific message, return false
 * - anything else → parseKanidmError + fallback message, return false
 */
export async function handleKaniResponse<T>(
	response: KaniResponse<T>,
	options: {
		successMessage: string;
		errorMessage: string;
		addNotification: (type: 'success' | 'error' | 'info', msg: string) => void;
		onSuccess?: () => void | Promise<void>;
		/** Map of HTTP status codes to specific user-facing messages. */
		statusMessages?: Record<number, string>;
	}
): Promise<boolean> {
	if (response.status === 200) {
		if (options.onSuccess) await options.onSuccess();
		await invalidateAll();
		options.addNotification('success', options.successMessage);
		return true;
	}

	const kopidSuffix = response.kopid ? ` [${response.kopid.slice(0, 8)}]` : '';
	const specific = options.statusMessages?.[response.status];
	if (specific) {
		options.addNotification('error', specific + kopidSuffix);
		return false;
	}

	options.addNotification('error', parseKanidmError(response.body, options.errorMessage) + kopidSuffix);
	return false;
}
