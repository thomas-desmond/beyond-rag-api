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

// Supported languages
type SupportedLanguage = 'en' | 'es' | 'pt';

// Base prompts in English with language instruction
const PROMPTS = {
	imageDescription: 'Generate a single-paragraph product description based on the provided image.',
	socialPosts: 'Take the description and generate 3 instagram posts based on it. Here is the description:'
};

// Language names for instruction
const LANGUAGE_NAMES = {
	en: 'English',
	es: 'Spanish',
	pt: 'Portuguese'
};

/**
 * Get language from Accept-Language header (expects en, es, or pt)
 */
function getLanguageFromHeader(acceptLanguage: string | null): SupportedLanguage {
	if (!acceptLanguage) return 'en';
	
	const lang = acceptLanguage.toLowerCase();
	if (lang === 'es' || lang === 'pt') {
		return lang;
	}
	
	return 'en'; // Default to English
}

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
			
			// Get language from Accept-Language header
			const acceptLanguage = request.headers.get('Accept-Language');
			const language = getLanguageFromHeader(acceptLanguage);
			const languageName = LANGUAGE_NAMES[language];
			
			// Build prompt with language instruction
			const prompt = language === 'en' 
				? PROMPTS.imageDescription
				: `${PROMPTS.imageDescription} Please respond in ${languageName}.`;

			const response = await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct' as keyof AiModels,
				{
					image: encodedImage,
					prompt: prompt,
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

		// Handle requests to the `/social-posts` endpoint
		if (url.pathname === '/social-posts' && request.method === 'POST') {
			const requestBody = (await request.json()) as { description: string };
			const description = requestBody.description;
			
			// Get language from Accept-Language header
			const acceptLanguage = request.headers.get('Accept-Language');
			const language = getLanguageFromHeader(acceptLanguage);
			const languageName = LANGUAGE_NAMES[language];
			
			// Build prompt with language instruction
			const basePrompt = `${PROMPTS.socialPosts} ${description}`;
			const prompt = language === 'en' 
				? basePrompt
				: `${basePrompt} Please respond in ${languageName}.`;

			const input: AiTextGenerationInput = {
				prompt: prompt,
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
