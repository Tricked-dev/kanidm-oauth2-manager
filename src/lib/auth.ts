import { env } from '$env/dynamic/private';

const BASE_URL = `${env.KANIDM_BASE_URL}/v1/auth`;
const HEADERS = {
	'content-type': 'application/json'
};

// Token cache with 5-minute expiry
interface CachedToken {
	token: string;
	expires: number;
}

let tokenCache: CachedToken | null = null;
// Kanidm's privileged ReadWrite window is ~5 min by default policy.
// Cache at 4 min so we always re-auth before the privilege window closes.
const TOKEN_CACHE_DURATION = 4 * 60 * 1000;

async function postAuthStep(step: Record<string, any>, sessionId?: string): Promise<Response> {
	const headers: Record<string, string> = { ...HEADERS };
	if (sessionId) {
		headers['x-kanidm-auth-session-id'] = sessionId;
	}

	return await fetch(BASE_URL, {
		method: 'POST',
		headers,
		body: JSON.stringify({ step })
	});
}

async function login(
	username: string,
	password: string
): Promise<{ sessionid: string; state: { success: string }; sessionId: string }> {
	// Step 1: Initialize session (privileged:true requests a non-limited session
	// so that write operations such as create group / generate token are allowed)
	const initRes = await postAuthStep({ init2: { username, issue: 'token', privileged: true } });
	const sessionId = initRes.headers.get('x-kanidm-auth-session-id');
	if (!sessionId) throw new Error('Session ID missing');

	// Step 2: Begin password auth method
	await postAuthStep({ begin: 'password' }, sessionId);

	// Step 3: Submit credentials
	const authRes = await postAuthStep({ cred: { password } }, sessionId);

	const authJson = await authRes.json();
	return { ...authJson, sessionJwt: sessionId };
}

export function clearTokenCache() {
	tokenCache = null;
}

export async function getCachedToken(): Promise<string> {
	const now = Date.now();

	// Check if we have a valid cached token
	if (tokenCache && tokenCache.expires > now) {
		return tokenCache.token;
	}

	// Token is expired or doesn't exist, get a new one
	if (import.meta.env.DEV) {
		console.log('Fetching new token');
	}
	const session = await login(env.KANIDM_USERNAME, env.KANIDM_PASSWORD);

	// Cache the new token
	tokenCache = {
		token: session.state.success,
		expires: now + TOKEN_CACHE_DURATION
	};

	return tokenCache.token;
}
