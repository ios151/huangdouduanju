import CryptoJS from "crypto-js";
import { gunzipSync, gzipSync } from "fflate";
import { Console } from "@nsnanocat/util";
import { CRYPTO } from "../config/index.mjs";

// ── 基础工具 ──────────────────────────────────────────────

export function safeJson(text) {
	try {
		return JSON.parse(text);
	} catch {
		return null;
	}
}

/** 二进制字符串 → Uint8Array（proxy 工具中 $response.body 是 binary string） */
export function binStrToBytes(str) {
	if (!str || typeof str !== "string") return new Uint8Array(0);
	const len = str.length;
	if (len <= 0) return new Uint8Array(0);
	const arr = new Uint8Array(len);
	for (let i = 0; i < len; i++) arr[i] = str.charCodeAt(i) & 0xff;
	return arr;
}

/** Uint8Array → 二进制字符串 */
export function bytesToBinStr(bytes) {
	let str = "";
	const chunk = 0x8000;
	for (let i = 0; i < bytes.length; i += chunk) {
		str += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
	}
	return str;
}

/** hex 字符串（去 dash）→ Uint8Array */
export function hexToBytes(hex) {
	const clean = hex.replace(/-/g, "");
	const arr = new Uint8Array(clean.length / 2);
	for (let i = 0; i < clean.length; i += 2) arr[i / 2] = parseInt(clean.substr(i, 2), 16);
	return arr;
}

/** Uint8Array → CryptoJS WordArray */
function toWordArray(bytes) {
	const words = [];
	for (let i = 0; i < bytes.length; i++) words[i >>> 2] |= bytes[i] << (24 - (i % 4) * 8);
	return CryptoJS.lib.WordArray.create(words, bytes.length);
}

/** CryptoJS WordArray → Uint8Array */
function fromWordArray(wa) {
	const words = wa.words;
	const len = wa.sigBytes;
	const arr = new Uint8Array(len);
	for (let i = 0; i < len; i++) arr[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
	return arr;
}

/** 随机 IV */
function randomBytes(length) {
	const arr = new Uint8Array(length);
	for (let i = 0; i < length; i++) arr[i] = Math.floor(Math.random() * 256);
	return arr;
}

// ── 密钥派生 ──────────────────────────────────────────────

/**
 * 从 requestId 派生 AES-256 密钥
 * key = HMAC-SHA256(hexDecode(requestId), password)
 * password 取决于 deviceType
 */
export function deriveKey(requestId, deviceType = CRYPTO.defaultDeviceType) {
	const password = CRYPTO.passwords[deviceType] || CRYPTO.passwords[CRYPTO.defaultDeviceType];
	const ridBytes = hexToBytes(requestId);
	const pwBytes = new TextEncoder().encode(password);
	// HMAC-SHA256(ridBytes, pwBytes) → 32 bytes
	const keyWordArray = CryptoJS.HmacSHA256(toWordArray(ridBytes), toWordArray(pwBytes));
	return fromWordArray(keyWordArray);
}

// ── gzip ──────────────────────────────────────────────────

export function gunzip(bytes) {
	return gunzipSync(bytes);
}

export function gzip(bytes) {
	return gzipSync(bytes);
}

// ── 解密 / 加密 ───────────────────────────────────────────

/**
 * 解密响应体
 * @param {string|Uint8Array} body  二进制字符串或字节数组
 * @param {string} requestId        请求头 requestId
 * @param {string} deviceType       请求头 deviceType
 * @returns {{ json: object, plain: string } | null}
 */
export function decryptResponse(body, requestId, deviceType) {
	try {
		// 如果 body 已经是明文 JSON，直接解析（某些平台会自动解压）
		// 支持 string 和 Uint8Array/ArrayBuffer 两种形式
		let bodyStr = null;
		if (typeof body === "string") {
			bodyStr = body;
		} else if (body instanceof Uint8Array) {
			// 尝试当作明文 UTF-8 JSON 解析
			try {
				bodyStr = new TextDecoder().decode(body);
			} catch {}
		} else if (body instanceof ArrayBuffer) {
			try {
				bodyStr = new TextDecoder().decode(new Uint8Array(body));
			} catch {}
		}
		if (bodyStr) {
			const directJson = safeJson(bodyStr);
			if (directJson && (directJson.status !== undefined || directJson.code !== undefined || directJson.data !== undefined)) {
				Console.debug("decryptResponse: body 已是明文 JSON，跳过解密");
				return { json: directJson, plain: bodyStr, decompressed: null };
			}
		}

		let bytes;
		if (body == null) {
			Console.error("decryptResponse: body 为 null/undefined");
			return null;
		}
		if (typeof body === "string") {
			bytes = binStrToBytes(body);
		} else if (body instanceof Uint8Array) {
			bytes = body;
		} else if (body instanceof ArrayBuffer) {
			bytes = new Uint8Array(body);
		} else if (typeof body === "object" && body.buffer instanceof ArrayBuffer) {
			bytes = new Uint8Array(body.buffer, body.byteOffset || 0, body.byteLength);
		} else if (typeof body === "object" && body.byteLength !== undefined) {
			bytes = new Uint8Array(body);
		} else {
			try {
				const str = String(body);
				bytes = binStrToBytes(str);
			} catch {
				Console.error(`decryptResponse: 不支持的 body 类型 ${typeof body}`);
				return null;
			}
		}
		Console.debug(`decryptResponse: bytes len=${bytes.length}, head=[${bytes.slice(0, 16).join(",")}]`);
		Console.debug(`decryptResponse: final bytes len=${bytes.length}`);
		if (bytes.length < CRYPTO.ivLength + 16) {
			Console.warn(`decryptResponse: body 太短 ${bytes.length}`);
			// 如果是字符串，尝试 base64 解码
			if (typeof body === "string") {
				try {
					const decoded = CryptoJS.enc.Base64.parse(body);
					bytes = fromWordArray(decoded);
					Console.debug(`decryptResponse: base64 解码后 bytes len=${bytes.length}, head=[${bytes.slice(0, 16).join(",")}]`);
					if (bytes.length < CRYPTO.ivLength + 16) {
						Console.warn(`decryptResponse: base64 解码后仍然太短 ${bytes.length}`);
						return null;
					}
				} catch {
					Console.warn("decryptResponse: base64 解码失败");
					return null;
				}
			} else {
				return null;
			}
		}

		const iv = bytes.slice(0, CRYPTO.ivLength);
		const ct = bytes.slice(CRYPTO.ivLength);
		const key = deriveKey(requestId, deviceType);
		Console.debug(`decryptResponse: key=[${key.slice(0, 8).join(",")}...] iv=[${iv.slice(0, 8).join(",")}...]`);

		let ptWordArray;
		try {
			ptWordArray = CryptoJS.AES.decrypt(
				{ ciphertext: toWordArray(ct) },
				toWordArray(key),
				{ iv: toWordArray(iv), mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 },
			);
		} catch (e) {
			// AES 解密失败，可能是 body 是 base64 编码的字符串
			if (typeof body === "string") {
				Console.debug("decryptResponse: AES 解密失败，尝试 base64 解码 body");
				const decoded = CryptoJS.enc.Base64.parse(body);
				bytes = fromWordArray(decoded);
				const iv2 = bytes.slice(0, CRYPTO.ivLength);
				const ct2 = bytes.slice(CRYPTO.ivLength);
				ptWordArray = CryptoJS.AES.decrypt(
					{ ciphertext: toWordArray(ct2) },
					toWordArray(key),
					{ iv: toWordArray(iv2), mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 },
				);
			} else {
				throw e;
			}
		}
		const ptBytes = fromWordArray(ptWordArray);
		Console.debug(`decryptResponse: AES 解密后 ptBytes len=${ptBytes.length}`);

		// 尝试 gunzip，如果失败则直接用 ptBytes
		let decompressed;
		try {
			decompressed = gunzip(ptBytes);
		} catch {
			Console.debug("decryptResponse: gunzip 失败，使用原始解密数据");
			decompressed = ptBytes;
		}
		const plain = new TextDecoder().decode(decompressed);
		Console.debug(`decryptResponse: plain len=${plain.length}, head=${plain.slice(0, 100)}`);
		const json = safeJson(plain);
		if (!json) {
			Console.warn("decryptResponse: JSON 解析失败");
			return null;
		}
		return { json, plain, decompressed };
	} catch (e) {
		Console.error(`decryptResponse 异常: ${e}`);
		try { console.log(`[HD] decryptResponse stack: ${e?.stack}`); } catch {}
		return null;
	}
}

/**
 * 加密响应体（修改后的 JSON → gzip → AES → binary string）
 * @param {string} plain            JSON 字符串
 * @param {string} requestId        请求头 requestId（密钥派生）
 * @param {string} deviceType       请求头 deviceType
 * @returns {string}                二进制字符串
 */
export function encryptResponse(plain, requestId, deviceType) {
	const data = new TextEncoder().encode(plain);
	const compressed = gzip(data);
	const iv = randomBytes(CRYPTO.ivLength);
	const key = deriveKey(requestId, deviceType);

	const encrypted = CryptoJS.AES.encrypt(
		toWordArray(compressed),
		toWordArray(key),
		{ iv: toWordArray(iv), mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 },
	);
	const ctBytes = fromWordArray(encrypted.ciphertext);
	const out = new Uint8Array(CRYPTO.ivLength + ctBytes.length);
	out.set(iv, 0);
	out.set(ctBytes, CRYPTO.ivLength);
	return bytesToBinStr(out);
}

// ── 签名 ──────────────────────────────────────────────────

/**
 * 生成请求签名
 * sign = MD5("Dart|{sessionId}|{requestId}|{time}|{urlWithoutProtocol}") + "-" + time
 */
export function buildSign({ sessionId, requestId, time, url }) {
	const urlNoProto = String(url || "").replace(/^https?:\/\//, "");
	const raw = `${CRYPTO.signPrefix}|${sessionId}|${requestId}|${time}|${urlNoProto}`;
	const md5 = CryptoJS.MD5(raw).toString();
	return `${md5}-${time}`;
}
