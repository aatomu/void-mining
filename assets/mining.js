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

	for (let i = 0; i < 10; i++) {
		let nonce = 0
		while (true) {
			const hash = await generateHash(nonce, prevHash, log)
			if (isMatchChainPrefix(hash)) {
				console.log(`no.${i} nonce:${nonce}, hash:${hash}`)
				appendLog(`no.${i} nonce:${nonce}, hash:${hash}`)
				prevHash = hash
				hashList.push(hash)
				break
			}
			if (nonce % 10000 == 0) {
				console.log(`no.${i} nonce:${nonce} calc...`)
				appendLog(`no.${i} nonce:${nonce} calc...`)
			}
			nonce++
		}
	}
	console.log(hashList)
}

/**
 *
 * @param {string} text log text
 */
function appendLog(text) {
	/**
	 * @type {HTMLTextAreaElement}
	 */
	//@ts-ignore
	const element = document.getElementById("mining")
	const time = new Date()

	element.value += `${time.getHours().toString().padStart(2, "0")}:${time.getMinutes().toString().padStart(2, "0")}:${time.getSeconds().toString().padStart(2, "0")}.${time.getMilliseconds().toString().padStart(3, "0")}: ${text}\n`

	const maxScroll = element.scrollHeight - element.clientHeight
	if (maxScroll-element.scrollTop < 50) {
	element.scrollTo({ top: maxScroll, behavior: "smooth" })
	}
}
