interface KaniRequest {
    method?: "POST" | "GET" | "PATCH" | "DELETE" | "PUT";
    body?: any;
    path: string;
    contentType?: string;
    formData?: FormData;
}
interface KaniResponse<T> {
    status: number;
    body: T;
}

export const logo = {
    url: "",
};

export async function kaniRequest<T>(
    f: typeof fetch,
    data: KaniRequest,
): Promise<KaniResponse<T>> {
    let requestBody: string | FormData;
    let headers: Record<string, string> = {};

    if (data.formData) {
        let form = data.formData;
        delete data["formData"];
        form.set("json", JSON.stringify(data));
        requestBody = form;
    } else {
        requestBody = JSON.stringify(data);
        headers["Content-Type"] = "application/json";
    }

    const result = await f("/api/kani", {
        method: "POST",
        headers,
        body: requestBody,
    });

    const response = await result.json();

    // Debug logging in development mode
    if (import.meta.env.DEV && response.status >= 400) {
        console.group(`🚨 Kanidm API Error: ${data.method || 'GET'} ${data.path}`);
        console.error('Status:', response.status);
        console.error('Response Body:', JSON.stringify(response.body));
        console.error('Full Request:', JSON.stringify(data));
        console.groupEnd();
    }

    return response;
}
