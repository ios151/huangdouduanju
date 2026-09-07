import { Storage } from "@nsnanocat/util";
import { Console } from "@nsnanocat/util";
import { decryptResponse } from "./crypto.mjs";
import { getHeader } from "./headers.mjs";

const CACHE_KEY = "huangdou_play_ctx";
const COVER_CACHE_KEY = "huangdou_covers";

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

/**
 * 缓存 detail 响应中每集的 cover URL（用于构造 preview URL）
 * cover URL 格式: https://{cdn}/{batch}/{drama_id}/chapters/{seq}/cover.jpg
 * preview URL 格式: https://{cdn}/{batch}/{drama_id}/chapters/{seq}/preview.mp4
 */
export function cacheCoverUrls(dramaId, episodes) {
	try {
		if (!dramaId || !Array.isArray(episodes)) return;
		const covers = Storage.getItem(COVER_CACHE_KEY, {}) || {};
		for (const ep of episodes) {
			if (!ep || ep.seq === undefined || !ep.cover) continue;
			const key = `${dramaId}_${ep.seq}`;
			covers[key] = ep.cover;
		}
		Storage.setItem(COVER_CACHE_KEY, covers);
		Console.debug(`[cache] cover URLs 缓存成功: ${Object.keys(covers).length} 条`);
	} catch (e) {
		Console.debug(`[cache] cover URLs 缓存失败: ${e}`);
	}
}

/**
 * 获取指定剧集的 preview URL（从 cover URL 转换）
 * cover.jpg → preview.mp4
 */
export function getPreviewUrl(dramaId, seq) {
	try {
		const covers = Storage.getItem(COVER_CACHE_KEY, {}) || {};
		const key = `${dramaId}_${seq}`;
		const coverUrl = covers[key];
		if (!coverUrl) return null;
		// cover.jpg → preview.mp4
		const previewUrl = String(coverUrl).replace(/\/cover\.[a-z]+$/, "/preview.mp4");
		return previewUrl !== coverUrl ? previewUrl : null;
	} catch {
		return null;
	}
}
