import { KANIDM_BASE_URL, KANIDM_USERNAME, KANIDM_PASSWORD } from "$env/static/private";

const BASE_URL = `${KANIDM_BASE_URL}/v1/auth`;
const HEADERS = {
    "content-type": "application/json",
};

// Token cache with 5-minute expiry
interface CachedToken {
    token: string;
    expires: number;
}

let tokenCache: CachedToken | null = null;
const TOKEN_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

async function postAuthStep(
    step: Record<string, any>,
    sessionId?: string,
): Promise<Response> {
    const headers: Record<string, string> = { ...HEADERS };
    if (sessionId) {
        headers["x-kanidm-auth-session-id"] = sessionId;
    }

    return await fetch(BASE_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({ step }),
    });
}

async function login(
    username: string,
    password: string,
): Promise<
    { sessionid: string; state: { success: string }; sessionId: string }
> {
    // Step 1: Initialize session
    const initRes = await postAuthStep({ init: username });
    const sessionId = initRes.headers.get("x-kanidm-auth-session-id");
    if (!sessionId) throw new Error("Session ID missing");

    // Step 2: Begin password auth method
    await postAuthStep({ begin: "password" }, sessionId);

    // Step 3: Submit credentials
    const authRes = await postAuthStep(
        { cred: { password } },
        sessionId,
    );

    const authJson = await authRes.json();
    return { ...authJson, sessionJwt: sessionId };
}

export async function getCachedToken(): Promise<string> {
    const now = Date.now();
    
    // Check if we have a valid cached token
    if (tokenCache && tokenCache.expires > now) {
        console.log("Using cached token");
        return tokenCache.token;
    }
    
    // Token is expired or doesn't exist, get a new one
    console.log("Fetching new token");
    const session = await login(KANIDM_USERNAME, KANIDM_PASSWORD);
    
    // Cache the new token
    tokenCache = {
        token: session.state.success,
        expires: now + TOKEN_CACHE_DURATION
    };
    
    return tokenCache.token;
}