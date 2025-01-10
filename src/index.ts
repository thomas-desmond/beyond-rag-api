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
			const requestBody = (await request.json()) as { image: string; criteria: string };
			const encodedImage = requestBody.image;
			const criteria = requestBody.criteria;

			const prompt = {
				image: encodedImage,
				prompt: `Write a single paragraph product description for the item in the image with a focus on ${criteria}. I'd like to be able to copy the output and paste it into a product description with no changes.`,
			};
			const messages = [
				{
					role: 'system',
					content: 'You are a friendly assistant tasked with writing captivating product descriptions for an e-commerce website.',
				},
				{
					role: 'user',
					content: 'You are a friendly assistant tasked with writing captivating product descriptions for an e-commerce website.',
				},
			];
			const response = await env.AI.run(
				'@cf/meta/llama-3.2-11b-vision-instruct',
				{ prompt: prompt, messages: messages },
				{
					gateway: {
						id: 'beyond-rag',
						skipCache: false,
						cacheTtl: 3360,
					},
				}
			);

			return Response.json(response, { headers: { ...corsHeaders } });
		}

		// Handle requests to the `/image-description` endpoint
		if (url.pathname === '/social-posts' && request.method === 'POST') {
			const requestBody = (await request.json()) as { description: string };
			const description = requestBody.description;

			const prompt = `Take the description and generate 3 instagram posts based on it. Here is the description: ${description}`;

			const response = await env.AI.run(
				'@cf/meta/llama-3.2-1b-instruct',
				{ prompt: prompt },
				{
					gateway: {
						id: 'beyond-rag',
						skipCache: false,
						cacheTtl: 3360,
					},
				}
			);

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
