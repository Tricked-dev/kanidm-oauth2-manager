import dns from 'node:dns/promises';
import type { RequestHandler } from '@sveltejs/kit';

const userAgent = 'Mozilla/5.0 (compatible; KanidmOAuth2Manager/1.0)';

function isPrivateIp(ip: string): boolean {
	if (ip === '::1' || ip === '127.0.0.1') return true;
	if (ip.startsWith('10.')) return true;
	if (ip.startsWith('192.168.')) return true;
	if (ip.startsWith('fc') || ip.startsWith('fd')) return true;
	const parts = ip.split('.').map(Number);
	if (parts.length === 4 && parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
	return false;
}

async function isDomainPublic(hostname: string): Promise<boolean> {
	try {
		const { address } = await dns.lookup(hostname);
		return !isPrivateIp(address);
	} catch {
		return false; // DNS failure = don't leak to DDG
	}
}

async function tryFetchImage(url: string): Promise<Response | null> {
	try {
		const res = await fetch(url, { headers: { 'User-Agent': userAgent } });
		const ct = res.headers.get('content-type') || '';
		if (res.ok && ct.startsWith('image/')) return res;
	} catch {}
	return null;
}

function extractIconsFromHtml(html: string, baseUrl: string): string[] {
	const icons: string[] = [];

	// <link rel="icon|shortcut icon|apple-touch-icon|mask-icon" href="...">
	const linkRe = /<link\s[^>]*>/gi;
	let m: RegExpExecArray | null;
	while ((m = linkRe.exec(html)) !== null) {
		const tag = m[0];
		const relMatch = /rel=["']?([^"'>]+)["']?/i.exec(tag);
		const hrefMatch = /href=["']([^"']+)["']/i.exec(tag);
		if (!relMatch || !hrefMatch) continue;
		const rel = relMatch[1].toLowerCase();
		if (['icon', 'shortcut icon', 'apple-touch-icon', 'mask-icon'].some((r) => rel.includes(r))) {
			icons.push(resolveUrl(hrefMatch[1], baseUrl));
		}
	}

	// <meta property="og:image" content="...">
	const metaRe = /<meta\s[^>]*>/gi;
	while ((m = metaRe.exec(html)) !== null) {
		const tag = m[0];
		if (/property=["']og:image["']/i.test(tag)) {
			const contentMatch = /content=["']([^"']+)["']/i.exec(tag);
			if (contentMatch) icons.push(resolveUrl(contentMatch[1], baseUrl));
		}
	}

	return icons;
}

function resolveUrl(href: string, baseUrl: string): string {
	if (href.startsWith('http')) return href;
	return `${baseUrl}${href.startsWith('/') ? '' : '/'}${href}`;
}

async function imageResponse(res: Response): Promise<Response> {
	const ct = res.headers.get('content-type')!;
	const buf = await res.arrayBuffer();
	return new Response(buf, {
		headers: { 'content-type': ct, 'cache-control': 'public, max-age=3600' }
	});
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { origin } = await request.json();
		if (!origin) return Response.json({ error: 'Origin is required' }, { status: 400 });

		let baseUrl: string;
		let hostname: string;
		let fullUrl: string;
		try {
			const u = new URL(origin);
			baseUrl = u.origin;
			hostname = u.hostname;
			fullUrl = origin; // may include a path like /auto-login
		} catch {
			return Response.json({ error: 'Invalid origin URL' }, { status: 400 });
		}

		// 1. Try direct favicon paths
		for (const path of ['/favicon.ico', '/favicon.png', '/favicon.svg']) {
			const res = await tryFetchImage(`${baseUrl}${path}`);
			if (res) return imageResponse(res);
		}

		// 2. Parse HTML for icon links and og:image
		// Try both the full URL (which may have a specific path) and the origin root
		const htmlUrls = fullUrl !== baseUrl ? [fullUrl, baseUrl] : [baseUrl];
		for (const htmlUrl of htmlUrls) {
			try {
				const htmlRes = await fetch(htmlUrl, { headers: { 'User-Agent': userAgent } });
				if (htmlRes.ok) {
					const html = await htmlRes.text();
					const icons = extractIconsFromHtml(html, baseUrl);
					for (const url of icons) {
						const res = await tryFetchImage(url);
						if (res) return imageResponse(res);
					}
					break; // found a working HTML page, don't try the next one
				}
			} catch {}
		}

		// 3. DDG fallback — only for public IPs (avoids leaking LAN hostnames)
		const isPublic = await isDomainPublic(hostname);
		if (isPublic) {
			console.log(`[fetch-icon] trying DDG for ${hostname}`);
			const res = await tryFetchImage(`https://icons.duckduckgo.com/ip3/${hostname}.ico`);
			if (res) return imageResponse(res);
		} else {
			console.log(`[fetch-icon] skipping DDG for ${hostname} (LAN/private IP)`);
		}

		return Response.json({ error: 'No favicon found' }, { status: 404 });
	} catch (err) {
		console.error('fetch-icon error:', err);
		return Response.json({ error: 'Server error' }, { status: 500 });
	}
};
