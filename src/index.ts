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
			const requestBody = (await request.json()) as { image: string };
			const encodedImage = requestBody.image;

			const input = {
				messages: [
					{
						role: 'system',
						content:
							'You are a product marketing assistant specializing in generating concise, single-paragraph product descriptions. Your responses must be limited to an engaging, vivid, and persuasive product description that highlights the key features and benefits of the product depicted in the provided image. Avoid adding any extra information, such as explanations, background, or unrelated commentary',
					},
					{
						role: 'assistant',
						content:
							'Based on the provided image, craft a single-paragraph product description that is vivid, persuasive, and concise. Highlight the product’s key features and benefits in an engaging tone. Ensure your response is limited to the description only, with no additional context, explanations, or unrelated details.',
					},
					{
						role: 'user',
						content: `Examine the provided image and generate a single-paragraph product description. Focus on creating a concise, engaging description that highlights the product's standout features and benefits. Do not include any additional information or commentary—only the description itself.`,
					},
				],
				image: encodedImage,
			};
			const response = await env.AI.run(
				'@cf/meta/llama-3.2-11b-vision-instruct',
				{
					image: encodedImage,
					messages: input.messages,
				},
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

			const input: AiTextGenerationInput = {
				prompt: `Take the description and generate 3 instagram posts based on it. Here is the description: ${description}`,
			};

			const response = await env.AI.run('@cf/meta/llama-3.2-1b-instruct', input, {
				gateway: {
					id: 'beyond-rag',
					skipCache: false,
					cacheTtl: 3360,
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
