/**
 * huangdouduanju 重写脚本入口
 *
 * 加密方案：
 *   - 全部 API 请求/响应体为二进制（application/octet-stream）
 *   - body = IV(16B) + AES-256-CBC(gzip(JSON))
 *   - key = HMAC-SHA256(hexDecode(requestId), deviceTypePassword)
 *   - sign = MD5("Dart|sessionId|requestId|time|urlNoProto") + "-" + time
 *
 * 解锁策略（参考 lzlukvca 脚本）：
 *   - detail: type='free' + is_buy=true → 前端不弹窗直接发 play
 *   - play: 813004 错误时伪造成功响应，构造 m3u8 URL
 *   - doBuy: 伪造 status=true
 *   - user: is_vip=y + balance=999999
 */
import { $app, Console, done } from "@nsnanocat/util";
import { Request } from "./process/Request.mjs";
import { Response } from "./process/Response.mjs";
import { resolveSettings } from "./utils/settings.mjs";
import { cachePlayRequest, getCachedPlayRequest } from "./utils/cache.mjs";

let requestResult = $request;
let responseResult;
let responseMode = false;

function getScriptResponse() {
	try {
		return typeof $response !== "undefined" ? $response : undefined;
	} catch {
		return undefined;
	}
}

!(async () => {
	const scriptResponse = getScriptResponse();
	if (scriptResponse) {
		responseMode = true;
		const settings = resolveSettings();
		Console.logLevel = settings.logLevel;

		// RESPONSE 模式：如果是 play/episodePreview 接口，尝试从缓存读取请求体
		const url = $request?.url || "";
		if (/\/api\/(drama\/play|up\/episodePreview)/.test(url)) {
			const cached = getCachedPlayRequest();
			if (cached) {
				Console.debug(`[play] 从缓存读取请求体: ${JSON.stringify(cached).slice(0, 100)}`);
				$request.__cachedBody = cached;
			}
		}

		responseResult = await Response($request, scriptResponse, settings);
		return;
	}

	// REQUEST 模式：缓存 play/episodePreview 请求体，然后透传
	const url = $request?.url || "";
	if (/\/api\/(drama\/play|up\/episodePreview)/.test(url)) {
		cachePlayRequest($request);
	}
	// 透传请求（不修改）
})()
	.catch(e => Console.error(e))
	.finally(() => {
		if (responseMode) {
			// RESPONSE 模式：返回改写后的响应
			switch (typeof responseResult) {
				case "object":
					if (responseResult.headers?.["Content-Encoding"]) responseResult.headers["Content-Encoding"] = "identity";
					if (responseResult.headers?.["content-encoding"]) responseResult.headers["content-encoding"] = "identity";
					if ($app === "Quantumult X") {
						if (!responseResult.status) responseResult.status = 200;
						delete responseResult.headers?.["Content-Length"];
						delete responseResult.headers?.["content-length"];
						delete responseResult.headers?.["Transfer-Encoding"];
						delete responseResult.headers?.["transfer-encoding"];
						done(responseResult);
					} else if ($app === "Stash") {
						done(responseResult);
					} else {
						done({ response: responseResult });
					}
					break;
				case "undefined":
					done({});
					break;
				default:
					Console.error(`不合法的 response 类型: ${typeof responseResult}`);
					done({});
					break;
			}
		} else {
			// REQUEST 模式：透传请求
			done({});
		}
	});
