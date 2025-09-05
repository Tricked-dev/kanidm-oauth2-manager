import { env } from '$env/dynamic/private';

export const GET = () => {
	return Response.json(env.KANIDM_BASE_URL);
};
