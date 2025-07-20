import type { RequestHandler } from "@sveltejs/kit";
import { KANIDM_BASE_URL } from "$env/static/private";
import { getCachedToken } from "$lib/auth";

const API_BASE_URL = KANIDM_BASE_URL;


export const POST: RequestHandler = async ({ request }) => {
    const token = await getCachedToken();
    
    const contentType = request.headers.get('content-type') ?? '';
    let data: any;
    let requestBody: string | FormData | Uint8Array | undefined;
    let requestHeaders: Record<string, string> = {
        "Authorization": `Bearer ${token}`,
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

