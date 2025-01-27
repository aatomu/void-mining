// @ts-check

/**
 *
 * @param nonce {number}
 * @param prevHash {string}
 * @param log {any[]}
 * @return hash {string}
 */
async function generateHash(nonce, prevHash, log) {
	const obj = new TextEncoder().encode(JSON.stringify({
			nonce: nonce,
			prevHash: prevHash,
			log: log
	}))
	let buf = await crypto.subtle.digest("SHA-512", obj)
	return Array.from(new Uint8Array(buf)).map((v) => v.toString(16).padStart(2, "0")).join("")
}

/**
*
* @param hash {string}
*/
function isMatchChainPrefix(hash) {
	return hash.startsWith("0000")
}

async function main() {
	const log = [{
			text: "aaa"
	}, {
			text: "bbb"
	}, {
			text: "ccc"
	},
	]

	let hashList = []
	let prevHash = ""
	console.time("ticker")
	for (let i = 0; i < 10; i++) {
			let nonce = 0
			while (true) {
					const hash = await generateHash(nonce,prevHash,log)
					if (isMatchChainPrefix(hash)) {
							console.log(`no.${i} nonce:${nonce}, hash:${hash}`)
							console.timeLog("ticker")
							prevHash=hash
							hashList.push(hash)
							break
					}
					if (nonce%10000==0) {
					console.log(`no.${i} nonce:${nonce} calc...`)
					console.timeLog("ticker")
			}
					nonce++
			}
	}
	console.log(`finish`)
	console.timeEnd("ticker")
	console.log(hashList)
}
