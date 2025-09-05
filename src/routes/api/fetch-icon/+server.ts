import type { RequestHandler } from '@sveltejs/kit';

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

		const faviconUrls = [`${baseUrl}/favicon.png`, `${baseUrl}/favicon.svg`];

		const userAgent = 'Mozilla/5.0 (compatible; KanidmOAuth2Manager/1.0)';

		for (const faviconUrl of faviconUrls) {
			try {
				const response = await fetch(faviconUrl, {
					method: 'GET',
					headers: { 'User-Agent': userAgent }
				});

				const contentType = response.headers.get('content-type') || '';

				// Only return image if explicitly valid
				if (response.ok && contentType.startsWith('image/')) {
					const arrayBuffer = await response.arrayBuffer();
					return new Response(arrayBuffer, {
						headers: {
							'content-type': contentType,
							'cache-control': 'public, max-age=3600'
						}
					});
				}

				if (contentType.includes('html')) {
					const html = await response.text();
					const regex =
						/<link\s[^>]*rel=["']?(?:shortcut\s+icon|icon|apple-touch-icon|mask-icon)["']?[^>]*href=["']([^"']+)["'][^>]*>/gi;

					const links: string[] = [];
					let match;
					while ((match = regex.exec(html)) !== null) {
						links.push(match[1]);
					}

					for (const href of links) {
						const absoluteUrl = href.startsWith('http')
							? href
							: `${baseUrl}${href.startsWith('/') ? '' : '/'}${href}`;
						try {
							const iconRes = await fetch(absoluteUrl, {
								method: 'GET',
								headers: { 'User-Agent': userAgent }
							});

							const iconType = iconRes.headers.get('content-type') || '';

							if (iconRes.ok && iconType.startsWith('image/')) {
								const buffer = await iconRes.arrayBuffer();
								return new Response(buffer, {
									headers: {
										'content-type': iconType,
										'cache-control': 'public, max-age=3600'
									}
								});
							}
						} catch {
							continue;
						}
					}
				}
			} catch {
				continue;
			}
		}

		return Response.json(
			{ error: 'No favicon found at the common locations or in HTML' },
			{ status: 404 }
		);
	} catch (error) {
		console.error('Error fetching favicon:', error);
		return Response.json(
			{ error: 'Server error while fetching favicon' },
			{
				status: 500
			}
		);
	}
};
