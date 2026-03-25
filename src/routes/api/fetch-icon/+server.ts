import type { RequestHandler } from '@sveltejs/kit';

// Block the cloud metadata endpoint only - it has no legitimate use in any
// network context and is the one target that could cause real harm if this
// addon were ever deployed on a cloud VM. Everything else (RFC 1918, localhost,
// HA bridge addresses) is intentionally reachable in homelab deployments.
const BLOCKED_HOSTS = [
	'169.254.169.254', // AWS/GCP/Azure IMDSv1 - cloud metadata credential theft
	'fd00:ec2::254' //    AWS IMDSv6 equivalent
];

function isBlockedUrl(url: string): boolean {
	try {
		const parsed = new URL(url);

		// Block non-HTTP(S) schemes - file://, ftp://, etc have no place here
		if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
			console.warn(`[fetch-icon] Blocked non-HTTP scheme: ${parsed.protocol} from ${url}`);
			return true;
		}

		// Block cloud metadata endpoint - if you see this in logs, someone is
		// either misconfigured or poking around. Either way, not happening.
		if (BLOCKED_HOSTS.includes(parsed.hostname)) {
			console.warn(`[fetch-icon] 🚨 BLOCKED request to cloud metadata endpoint: ${url}`);
			console.warn(`[fetch-icon] 🚨 This is either a misconfiguration or a probe attempt.`);
			return true;
		}

		return false;
	} catch {
		return true; // Unparseable URL - block it
	}
}

const USER_AGENT = 'Mozilla/5.0 (compatible; KanidmOAuth2Manager/1.0)';

async function fetchImage(url: string): Promise<globalThis.Response | null> {
	if (isBlockedUrl(url)) return null;
	try {
		const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
		const ct = res.headers.get('content-type') || '';
		if (res.ok && ct.startsWith('image/')) return res;
	} catch {
		// ignore, try next candidate
	}
	return null;
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { origin } = await request.json();

		if (!origin) {
			return Response.json({ error: 'Origin is required' }, { status: 400 });
		}

		let baseUrl: string;
		try {
			baseUrl = new URL(origin).origin;
		} catch {
			return Response.json({ error: 'Invalid origin URL' }, { status: 400 });
		}

		if (isBlockedUrl(baseUrl)) {
			return Response.json({ error: 'Origin not allowed' }, { status: 403 });
		}

		// 1. Try well-known direct paths (ico first — most common by far)
		const directUrls = [
			`${baseUrl}/favicon.ico`,
			`${baseUrl}/favicon.png`,
			`${baseUrl}/favicon.svg`
		];

		for (const url of directUrls) {
			const res = await fetchImage(url);
			if (res) {
				const ct = res.headers.get('content-type')!;
				return new Response(await res.arrayBuffer(), {
					headers: { 'content-type': ct, 'cache-control': 'public, max-age=3600' }
				});
			}
		}

		// 2. Fetch the root page and parse <link rel="icon"> tags
		try {
			const rootRes = await fetch(baseUrl, { headers: { 'User-Agent': USER_AGENT } });
			const rootCt = rootRes.headers.get('content-type') || '';
			if (rootRes.ok && rootCt.includes('html')) {
				const html = await rootRes.text();
				const regex =
					/<link\s[^>]*rel=["']?(?:shortcut\s+icon|icon|apple-touch-icon|mask-icon)["']?[^>]*href=["']([^"']+)["'][^>]*>/gi;
				let match;
				while ((match = regex.exec(html)) !== null) {
					const href = match[1];
					const absoluteUrl = href.startsWith('http')
						? href
						: `${baseUrl}${href.startsWith('/') ? '' : '/'}${href}`;
					const res = await fetchImage(absoluteUrl);
					if (res) {
						const ct = res.headers.get('content-type')!;
						return new Response(await res.arrayBuffer(), {
							headers: { 'content-type': ct, 'cache-control': 'public, max-age=3600' }
						});
					}
				}
			}
		} catch {
			// root page unreachable — fall through to 404
		}

		return Response.json(
			{ error: 'No favicon found at the common locations or in HTML' },
			{ status: 404 }
		);
	} catch (error) {
		console.error('Error fetching favicon:', error);
		return Response.json({ error: 'Server error while fetching favicon' }, { status: 500 });
	}
};
