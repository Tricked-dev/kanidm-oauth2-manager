import { env } from "$env/dynamic/private";
import type { Load } from "@sveltejs/kit";
import { kaniRequest, logo } from "../utils";

export const load: Load = async ({ fetch, url }) => {
    const result = await kaniRequest(fetch, {
        path: "v1/oauth2",
    }) as {
        body: { attrs: Record<string, string[]> }[];
    };

    result.body.forEach((app) =>
        app.attrs.oauth2_rs_origin?.forEach((origin) => {
            if (origin.includes(url.hostname)) {
                if (app.attrs?.image?.length) {
                    logo.url = `/api/kani/image/${app.attrs?.name[0]}`;
                }
            }
        })
    );

    return {
        home: env.KANIDM_BASE_URL,
        apps: result,
    };
};
