import { env } from "$env/dynamic/private"
import { redirect } from "@sveltejs/kit"

export const GET = () => {
    return redirect(302, env.KANIDM_BASE_URL + "/pkg/img/favicon.png")
}