import type { RequestHandler } from "@sveltejs/kit";
import { KANIDM_BASE_URL, KANIDM_USERNAME, KANIDM_PASSWORD } from "$env/static/private";

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

export const POST: RequestHandler = async ({ request }) => {
    const session = await login(
        KANIDM_USERNAME,
        KANIDM_PASSWORD,
    );
    const data = await request.json();
    console.log("fetching path:", `${API_BASE_URL}/${data.path}`,)
    const result = await fetch(
        `${API_BASE_URL}/${data.path}`,
        {
            method: data.method,
            headers: {
                "content-type": data?.body ? "application/json" : undefined!,
                "Authorization": `Bearer ${session.state.success}`,
            },
            body: data?.body ? JSON.stringify(data.body) : undefined,
        },
    );
    let res;
    let ct = result.headers.get("content-type") ?? "";
    if (!ct.includes("json")) {
        res = {
            status: result.status,
            body: await result.text(),
        };
    } else {
        res = { status: result.status, body: await result.json() };
    }

    console.log(res);
    console.log(JSON.stringify(res.body))
    return Response.json(res, {
        headers: {
            "content-type": ct,
        },
    });
};
