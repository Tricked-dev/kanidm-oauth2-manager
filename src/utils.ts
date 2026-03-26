export const logo = {
	url: ''
};

/**
 * Copy text to clipboard. Falls back to execCommand for non-secure contexts
 * (e.g. plain HTTP access to the HA addon without ingress).
 * Returns true if the copy succeeded by any method.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		// Fallback: insert a temporary textarea and use the legacy execCommand API.
		// Works in plain-HTTP contexts where the Clipboard API is unavailable.
		try {
			const el = document.createElement('textarea');
			el.value = text;
			el.style.position = 'fixed';
			el.style.opacity = '0';
			document.body.appendChild(el);
			el.focus();
			el.select();
			const ok = document.execCommand('copy');
			document.body.removeChild(el);
			return ok;
		} catch {
			return false;
		}
	}
}

/**
 * Copy text to clipboard and show a success/failure notification.
 * Wraps copyToClipboard so callers don't repeat the ok/error pattern.
 */
export async function copyWithNotification(
	text: string,
	successMsg: string,
	addNotification: (type: 'success' | 'error' | 'info', msg: string) => void
): Promise<void> {
	const ok = await copyToClipboard(text);
	addNotification(
		ok ? 'success' : 'error',
		ok ? successMsg : 'Clipboard unavailable — check browser permissions or use HTTPS'
	);
}
