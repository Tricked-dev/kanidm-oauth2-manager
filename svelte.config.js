import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter(),
		// Allow deployment under a subpath (e.g. HA ingress prefix).
		// Set BASE_PATH env var at build time or runtime via the Node adapter's
		// ORIGIN/BASE handling. At runtime the Node adapter reads BASE_PATH from
		// the environment, so setting it in run.sh is sufficient.
		paths: {
			base: process.env.BASE_PATH ?? ''
		}
	}
};

export default config;
