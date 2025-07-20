interface KaniRequest {
    method?: "POST" | "GET" | "PATCH";
    body?: any;
    path: string;
}
interface KaniResponse<T> {
    status: number;
    body: T;
}
export async function kaniRequest<T>(
    f: typeof fetch,
    data: KaniRequest,
): Promise<KaniResponse<T>> {
    const result = await f("/api/kani", {
        method: "POST",
        body: JSON.stringify(data),
    });
    return await result.json();
}
