import type { RequestHandler } from "@sveltejs/kit";
import { KANIDM_BASE_URL } from "$env/static/private";
import { getCachedToken } from "$lib/auth";

const API_BASE_URL = KANIDM_BASE_URL;

export const GET: RequestHandler = async ({ params }) => {
    const appName = params.image;
    if (!appName) {
        return new Response('App name required', { status: 400 });
    }
    
    const token = await getCachedToken();
    
    const result = await fetch(`${API_BASE_URL}/ui/images/oauth2/${appName}`, {
        method: 'GET',
        headers: {
            "Authorization": `Bearer ${token}`,
        },
    });
    console.log(result)
    if (!result.ok) {
        return new Response('Image not found', { status: result.status });
    }
    
    // Forward the image response with proper content type
    const contentType = result.headers.get('content-type') || 'image/png';
    const imageBuffer = await result.arrayBuffer();
    
    return new Response(imageBuffer, {
        headers: {
            'content-type': contentType,
            'cache-control': 'public, max-age=1', 
        },
    });
};