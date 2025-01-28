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
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		const splitPath = url.pathname.split('/').slice(1);
		const param = new URLSearchParams(url.searchParams);
		const mem = new Memory();

		console.log(splitPath);
		if (splitPath[0] == 'ws') {
			const [client, server] = Object.values(new WebSocketPair());
			server.accept();

			let prevTransactionLength = 0;
			setInterval(async () => {
				const transactions = await mem.get<transaction[]>('transactions');
				if (!transactions) return;
				if (prevTransactionLength == transactions.length) return;

				prevTransactionLength = transactions.length;
				server.send(
					JSON.stringify({
						op: 'now_transactions',
						data: transactions,
					})
				);
				return;
			}, 1000);

			server.addEventListener('message', async (e) => {
				if (typeof e.data != 'string') {
					return;
				}
				const event = JSON.parse(e.data);

				switch (event.op) {
					case 'get': {
						const transactions = await mem.get<transaction[]>('transactions');
						server.send(
							JSON.stringify({
								op: 'now_transactions',
								data: transactions,
							})
						);
						return;
					}
					case 'new_transaction': {
						console.log(event);
						const transactions = await mem.get<transaction[]>('transactions');
						if (!transactions) {
							console.log('new', transactions);
							await mem.set('transactions', [event.data]);
							console.log('set', await mem.get<transaction[]>('transactions'));
							server.send(
								JSON.stringify({
									op: 'new_transaction',
									data: true,
								})
							);
							return;
						}
						console.log('append', transactions);
						transactions.push(event.data);
						await mem.set('transactions', transactions);
						server.send(
							JSON.stringify({
								op: 'new_transaction',
								data: true,
							})
						);
						return;
					}
					case 'delete': {
						const ok = await mem.delete('transactions');
						server.send(
							JSON.stringify({
								op: 'delete',
								data: ok,
							})
						);
						return;
					}
				}
			});

			return new Response(null, {
				status: 101,
				webSocket: client,
			});
		}
		return new Response(null, { status: 400 });
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
