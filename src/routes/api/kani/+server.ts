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
    
    const contentType = request.headers.get('content-type') ?? '';
    let data: any;
    let requestBody: string | FormData | Uint8Array | undefined;
    let requestHeaders: Record<string, string> = {
        "Authorization": `Bearer ${session.state.success}`,
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
            requestHeaders["content-type"] = data.contentType;
        } else if (data.body) {
            // Handle JSON data
            requestBody = JSON.stringify(data.body);
            requestHeaders["content-type"] = "application/json";
        }
    }
    
    console.log("fetching path:", `${API_BASE_URL}/${data.path}`);

    const result = await fetch(
        `${API_BASE_URL}/${data.path}`,
        {
            method: data.method,
            headers: requestHeaders,
            body: requestBody,
        },
    );
    
    if(!result.ok) {
        console.log("Request failed:", result.status, result.statusText);
        if (requestBody instanceof FormData) {
            console.log("FormData keys:", Array.from(requestBody.keys()));
        } else {
            console.log("BODY:", data.body);
        }
    }
    
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
    console.log(JSON.stringify(res));
    return Response.json(res, {
        headers: {
            "content-type": ct,
        },
    });
};
