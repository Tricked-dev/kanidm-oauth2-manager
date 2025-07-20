import { kaniRequest } from "../utils";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ params, fetch }) => {
    return {
        apps: await kaniRequest(fetch,{
            path: "v1/oauth2",
        }),
    };
};
