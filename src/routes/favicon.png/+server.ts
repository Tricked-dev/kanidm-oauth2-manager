import { env } from "$env/dynamic/private";
import { redirect } from "@sveltejs/kit";
import { logo } from "../../utils";

export const GET = () => {
    return redirect(
        302,
        logo.url || env.KANIDM_BASE_URL + "/pkg/img/favicon.png",
    );
};
