type history = block[];

type block = {
	index: number;
	transactions: transaction[];
	nonce: number;
	difficulty: number;
	hash: string;
};

type transaction = {
	date: number;
	text: string;
};

enum pointer {
	pool = 'transaction_pool',
	history = 'history',
}

enum opCode {
	transactionGet = 'transaction_get',
	transactionNew = 'transaction_new',
	transactionAppend = 'transaction_append',
	transactionDelete = 'transaction_delete',
}

type eventReceive = eventReceiveTransactionGet | eventReceiveTransactionAppend | eventReceiveTransactionDelete;

type eventReceiveTransactionGet = {
	op: opCode.transactionGet;
};

type eventReceiveTransactionAppend = {
	op: opCode.transactionAppend;
	data: transaction;
};

type eventReceiveTransactionDelete = {
	op: opCode.transactionDelete;
};

//1. append transaction to transaction_pool
//2. mining call when transaction_pool.length > n
//3. mining result check
//4. save to history

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		const splitPath = url.pathname.split('/').slice(1);
		// const param = new URLSearchParams(url.searchParams);

		const mem = new Memory();
		const blockChain = new BlockChain();

		console.log(splitPath);
		if (splitPath[0] == 'ws') {
			const [client, server] = Object.values(new WebSocketPair());
			server.accept();

			let prevTransactionLength = 0;
			setInterval(async () => {
				const transactions = await mem.get<transaction[]>(pointer.pool);
				if (!transactions) return;
				if (prevTransactionLength == transactions.length) return;

				prevTransactionLength = transactions.length;
				server.send(
					objectToString({
						op: opCode.transactionNew,
						data: transactions,
					})
				);
				return;
			}, 1000);

			server.addEventListener('message', async (e) => {
				if (typeof e.data != 'string') {
					return;
				}
				const event: eventReceive = JSON.parse(e.data);

				switch (event.op) {
					case opCode.transactionGet: {
						const transactions = await mem.get<transaction[]>(pointer.pool);
						server.send(
							objectToString({
								op: opCode.transactionGet,
								data: transactions,
							})
						);
						return;
					}
					case opCode.transactionAppend: {
						console.log(event);
						const transactions = await mem.get<transaction[]>(pointer.pool);
						if (!transactions) {
							console.log('new', transactions);
							await mem.set(pointer.pool, [event.data]);
							console.log('set', await mem.get<transaction[]>(pointer.pool));
							server.send(
								objectToString({
									op: opCode.transactionAppend,
									data: true,
								})
							);
							return;
						}
						console.log('append', transactions);
						transactions.push(event.data);
						await mem.set(pointer.pool, transactions);
						server.send(
							objectToString({
								op: opCode.transactionAppend,
								data: true,
							})
						);
						return;
					}
					case opCode.transactionDelete: {
						const ok = await mem.delete(pointer.pool);
						server.send(
							objectToString({
								op: opCode.transactionDelete,
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

	async get<T>(key: pointer): Promise<T | undefined> {
		const req = new Request(`https://example.com/${key}`);
		const result: T | undefined = await this.cache.match(req).then((res: Response | undefined) => {
			if (!res) {
				return undefined;
			}
			return res.json();
		});
		return result;
	}

	async set(key: pointer, value: object): Promise<void> {
		const req = new Request(`https://example.com/${key}`);
		const res = new Response(objectToString(value));
		await this.cache.put(req, res);
		return;
	}

	async delete(key: pointer): Promise<boolean> {
		const req = new Request(`https://example.com/${key}`);
		const ok = await this.cache.delete(req);
		return ok;
	}
}

class BlockChain {
	constructor() {}

	async hash(b: block, prevHash: string): Promise<string> {
		const obj = new TextEncoder().encode(
			objectToString({
				index: b.index,
				transactions: b.transactions,
				nonce: b.nonce,
				difficulty: b.difficulty,
				prevHash: prevHash,
			})
		);
		let buf = await crypto.subtle.digest('SHA-512', obj);
		return Array.from(new Uint8Array(buf))
			.map((v) => v.toString(16).padStart(2, '0'))
			.join('');
	}
	async checksum(b: block, prevHash: string): Promise<boolean> {
		if (!b.hash.startsWith('0'.repeat(b.difficulty))) {
			return false;
		}
		return b.hash == (await this.hash(b, prevHash));
	}
}

function objectToString(obj: any): string {
	var o: { [key: string]: any } = {};
	const keys = Object.keys(obj).sort();
	keys.forEach((key) => {
		o[key] = obj[key];
	});
	return JSON.stringify(o);
}
