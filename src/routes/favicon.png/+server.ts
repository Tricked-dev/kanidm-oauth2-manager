import { KANIDM_BASE_URL } from "$env/static/private"
import { redirect } from "@sveltejs/kit"

export const GET = () => {
    return redirect(302, KANIDM_BASE_URL + "/pkg/img/favicon.png")
}