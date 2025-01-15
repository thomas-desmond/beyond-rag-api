/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const corsHeaders = getCorsHeaders();
		if (handleOptionsRequest(request, corsHeaders)) {
			return new Response('OK', {
				headers: corsHeaders,
			});
		}

		const url = new URL(request.url);

		// Handle requests to the `/image-description` endpoint
		if (url.pathname === '/image-description' && request.method === 'POST') {
			const requestBody = (await request.json()) as { image: number[] };
			const encodedImage = requestBody.image;

			const response = await env.AI.run(
				'@cf/meta/llama-3.2-11b-vision-instruct' as keyof AiModels,
				{
					image: encodedImage,
					prompt: 'Generate a single-paragraph product description based on the provided image.',
				},
				{
					gateway: {
						id: 'beyond-rag',
						skipCache: false,
						cacheTtl: 300,
					},
				}
			);

			return Response.json(response, { headers: { ...corsHeaders } });
		}

		// Handle requests to the `/image-description` endpoint
		if (url.pathname === '/social-posts' && request.method === 'POST') {
			const requestBody = (await request.json()) as { description: string };
			const description = requestBody.description;

			const input: AiTextGenerationInput = {
				prompt: `Take the description and generate 3 instagram posts based on it. Here is the description: ${description}`,
			};

			const response = await env.AI.run('@cf/meta/llama-3.2-1b-instruct', input, {
				gateway: {
					id: 'beyond-rag',
					skipCache: false,
					cacheTtl: 300,
				},
			});

			return Response.json(response, { headers: { ...corsHeaders } });
		}

		return new Response('Not Found', { status: 404 });
	},
} satisfies ExportedHandler<Env>;

function getCorsHeaders() {
	return {
		'Access-Control-Allow-Headers': '*',
		'Access-Control-Allow-Methods': 'POST',
		'Access-Control-Allow-Origin': '*',
	};
}

function handleOptionsRequest(request: Request, corsHeaders: HeadersInit): boolean {
	if (request.method === 'OPTIONS') {
		return true;
	}
	return false;
}
