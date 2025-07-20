import type { RequestHandler } from "@sveltejs/kit";
import {
    KANIDM_BASE_URL,
    KANIDM_PASSWORD,
    KANIDM_USERNAME,
} from "$env/static/private";

const BASE_URL = `${KANIDM_BASE_URL}/v1/auth`;
const API_BASE_URL = KANIDM_BASE_URL;
const HEADERS = {
    "content-type": "application/json",
};

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

export const GET: RequestHandler = async ({ request, params }) => {
    const session = await login(
        KANIDM_USERNAME,
        KANIDM_PASSWORD,
    );

    let requestHeaders: Record<string, string> = {
        "Authorization": `Bearer ${session.state.success}`,
    };

    const result = await fetch(
        `${API_BASE_URL}/ui/images/oauth2/${params.image}`,
        {
            headers: requestHeaders,
        },
    );
    return new Response(await result.arrayBuffer(), {
        headers: {
            "content-type": result.headers.get("content-type")!,
        },
    });
};
