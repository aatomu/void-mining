/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.json`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

interface transaction {
	date: number;
	text: string;
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		return new Response('Hello World!');
	},
} satisfies ExportedHandler<Env>;

class Memory {
	cache: Cache;

	constructor() {
		this.cache = caches.default;
	}

	async get<T>(key: string): Promise<T | undefined> {
		const req = new Request(`https://example.com/${key}`);
		const result: T | undefined = await this.cache.match(req).then((res: Response | undefined) => {
			if (!res) {
				return undefined;
			}
			return res.json();
		});
		return result;
	}

	async set(key: string, value: object): Promise<void> {
		const req = new Request(`https://example.com/${key}`);
		const res = new Response(JSON.stringify(value));
		await this.cache.put(req, res);
		return;
	}

	async delete(key: string): Promise<boolean> {
		const req = new Request(`https://example.com/${key}`);
		const ok = await this.cache.delete(req);
		return ok;
	}
}
