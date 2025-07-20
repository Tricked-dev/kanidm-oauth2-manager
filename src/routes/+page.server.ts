import { env } from "$env/dynamic/private";
import { kaniRequest } from "../utils";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch }) => {
    return {
        home: env.KANIDM_BASE_URL,
        apps: await kaniRequest(fetch, {
            path: "v1/oauth2",
        }) as {
            body: { attrs: Record<string, string[]> }[];
        },
    };
};
