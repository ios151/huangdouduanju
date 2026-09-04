import { Storage } from "@nsnanocat/util";
import { Console } from "@nsnanocat/util";
import { decryptResponse } from "./crypto.mjs";
import { getHeader } from "./headers.mjs";

const CACHE_KEY = "huangdou_play_ctx";

/**
 * 缓存 play 请求体（在 REQUEST 阶段调用）
 * 把加密的请求体解密后缓存 drama_id 和 seq
 * 使用 NSNanoCat Storage 框架，兼容所有代理工具
 */
export function cachePlayRequest($request) {
	try {
		const headers = $request?.headers || {};
		const requestId = getHeader(headers, "requestid") || getHeader(headers, "requestId");
		const deviceType = getHeader(headers, "devicetype") || getHeader(headers, "deviceType") || "web";
		const body = $request?.bodyBytes || $request?.body;

		if (!body || !requestId) {
			Console.debug("[cache] play 请求体或 requestId 为空");
			return;
		}

		const decrypted = decryptResponse(body, requestId, deviceType);
		if (!decrypted || !decrypted.json) {
			Console.debug("[cache] play 请求体解密失败");
			return;
		}

		const data = decrypted.json.data || decrypted.json;
		const cached = {
			id: String(data.id || ""),
			seq: String(data.seq || ""),
			drama_id: String(data.drama_id || data.id || ""),
		};

		// 用框架的 Storage 写入（兼容 Surge/Loon/Stash/Egern/Shadowrocket 的 $persistentStore、QX 的 $prefs）
		Storage.setItem(CACHE_KEY, cached);
		Console.debug(`[cache] play 请求体缓存成功: ${JSON.stringify(cached)}`);
	} catch (e) {
		Console.debug(`[cache] play 请求体缓存失败: ${e}`);
	}
}

/**
 * 获取缓存的 play 请求体（在 RESPONSE 阶段调用）
 * 使用 NSNanoCat Storage 框架，兼容所有代理工具
 */
export function getCachedPlayRequest() {
	try {
		const cached = Storage.getItem(CACHE_KEY, null);
		if (cached && typeof cached === "object" && cached.id) {
			return cached;
		}
		return null;
	} catch {
		return null;
	}
}
