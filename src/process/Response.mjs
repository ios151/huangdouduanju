import { Console } from "@nsnanocat/util";
import { modifySystemInfo } from "../handlers/systemInfo.mjs";
import { modifyUserInfo } from "../handlers/userInfo.mjs";
import { modifyDramaList } from "../handlers/dramaList.mjs";
import { modifyMovieList } from "../handlers/movieList.mjs";
import { modifyDramaDetail } from "../handlers/dramaDetail.mjs";
import { modifyDramaPlay } from "../handlers/dramaPlay.mjs";
import { modifyDoBuy } from "../handlers/doBuy.mjs";
import { modifyUpDetail, modifyUpEpisodePreview, modifyUpBanner, modifyUpHome, modifyUpContent, modifyUpEpisodeList, modifyUpEpisodeFeed, modifyUpRecommend } from "../handlers/upHandlers.mjs";
import { modifyAdPolicy } from "../handlers/adPolicy.mjs";
import { decryptResponse, encryptResponse, safeJson, binStrToBytes } from "../utils/crypto.mjs";
import { getHeader } from "../utils/headers.mjs";

/**
 * 根据 URL 选择 handler
 * @param {string} url
 * @returns {function|null}
 */
function pickHandler(url) {
	if (/\/api\/system\/info/.test(url)) return modifySystemInfo;
	if (/\/api\/ad\/policy/.test(url)) return modifyAdPolicy;
	if (/\/api\/user\/info/.test(url)) return modifyUserInfo;
	if (/\/api\/drama\/play/.test(url)) return modifyDramaPlay;
	if (/\/api\/drama\/doBuy/.test(url)) return modifyDoBuy;
	if (/\/api\/drama\/detail/.test(url)) return modifyDramaDetail;
	// UP 接口
	if (/\/api\/up\/episodePreview/.test(url)) return modifyUpEpisodePreview;
	if (/\/api\/up\/bannerList/.test(url)) return modifyUpBanner;
	if (/\/api\/up\/episodeFeed/.test(url)) return modifyUpEpisodeFeed;
	if (/\/api\/up\/recommend/.test(url)) return modifyUpRecommend;
	if (/\/api\/up\/home/.test(url)) return modifyUpHome;
	if (/\/api\/up\/content/.test(url)) return modifyUpContent;
	if (/\/api\/up\/episodeList/.test(url)) return modifyUpEpisodeList;
	if (/\/api\/up\/detail/.test(url)) return modifyUpDetail;
	if (/\/api\/drama\/navBlock/.test(url)) return modifyDramaList;
	if (/\/api\/movie\/navBlock/.test(url)) return modifyMovieList;
	if (/\/api\/movie\/detail/.test(url)) return modifyDramaDetail;
	if (/\/api\/drama\/navFilter/.test(url)) return modifyDramaList;
	if (/\/api\/movie\/navFilter/.test(url)) return modifyMovieList;
	if (/\/api\/drama\/searchResult/.test(url)) return modifyDramaList;
	if (/\/api\/search\/movie/.test(url)) return modifyDramaList;
	if (/\/api\/drama\/more/.test(url)) return modifyDramaList;
	if (/\/api\/drama\/rank/.test(url)) return modifyDramaList;
	if (/\/api\/drama\/topicDetail/.test(url)) return modifyDramaDetail;
	if (/\/api\/drama\/topicList/.test(url)) return modifyDramaList;
	if (/\/api\/drama\/favorite/.test(url)) return modifyDramaList;
	if (/\/api\/movie\/favorite/.test(url)) return modifyMovieList;
	if (/\/api\/movie\/love/.test(url)) return modifyMovieList;
	if (/\/api\/drama\/love/.test(url)) return modifyDramaList;
	if (/\/api\/movie\/history/.test(url)) return modifyMovieList;
	if (/\/api\/user\/favorite/.test(url)) return modifyDramaList;
	if (/\/api\/drama\/wish/.test(url)) return modifyDramaList;
	if (/\/api\/user\/home/.test(url)) return modifyUserInfo;
	if (/\/api\/user\/vip/.test(url)) return modifyUserInfo;
	return null;
}

/**
 * 解密 → 改写 → 重加密
 */
function rewriteEncryptedBody(body, handler, requestId, deviceType, $request) {
	if (!body) {
		Console.warn("body 为空");
		return null;
	}
	const decrypted = decryptResponse(body, requestId, deviceType);
	if (!decrypted) {
		Console.error("解密失败");
		return null;
	}
	const { json, plain, decompressed } = decrypted;
	// 明文 JSON（decompressed === null）不需要 requestId
	// 加密 body 才需要 requestId 做重加密
	if (decompressed !== null && !requestId) {
		Console.warn("加密 body 但未找到 requestId，无法重加密");
		return null;
	}
	Console.debug(`解密成功: ${plain.slice(0, 200)}`);
	const changed = handler(json, $request);
	if (!changed) {
		Console.debug("handler 返回 false，无需改写");
		return null;
	}
	Console.debug("handler 返回 true，开始重加密");

	// 保持外层结构 {status, data, time}
	const newPlain = JSON.stringify(json);

	// 如果原来是明文 JSON（decompressed === null），直接返回明文
	if (decompressed === null) {
		Console.debug("原始为明文 JSON，返回明文");
		return { body: newPlain, payload: json };
	}

	const encrypted = encryptResponse(newPlain, requestId, deviceType);
	if (!encrypted) {
		Console.error("重加密失败");
		return null;
	}
	return { body: encrypted, payload: json };
}

/**
 * Response 处理入口
 * @param {object} $request   请求对象（含 url, headers）
 * @param {object} $response  响应对象（含 body, status, headers）
 * @param {object} settings   设置
 */
export async function Response($request, $response, settings) {
	const url = $request.url || "";
	Console.group(`Response ${url}`);
	Console.debug(`request headers keys: ${Object.keys($request.headers || {}).join(",")}`);
	Console.debug(`response headers keys: ${Object.keys($response?.headers || {}).join(",")}`);

	// 优先从响应头取 requestid（Surge/Loon 响应头里有 Requestid）
	const requestId = getHeader($request.headers || {}, "requestid")
		|| getHeader($request.headers || {}, "requestId")
		|| getHeader($request.headers || {}, "Request-Id")
		|| getHeader($response?.headers || {}, "requestid")
		|| getHeader($response?.headers || {}, "requestId")
		|| getHeader($response?.headers || {}, "Requestid");
	const deviceType = getHeader($request.headers || {}, "devicetype")
		|| getHeader($request.headers || {}, "deviceType")
		|| getHeader($request.headers || {}, "Device-Type")
		|| "web";

	Console.debug(`requestId=${requestId}, deviceType=${deviceType}`);

	// 确定响应体：优先 bodyBytes/rawBody（二进制），否则 body
	let body = $response?.bodyBytes || $response?.rawBody || $response?.body;
	try { console.log(`[HD] response body: type=${typeof body}, constructor=${body?.constructor?.name}, hasBodyBytes=${!!$response?.bodyBytes}, hasRawBody=${!!$response?.rawBody}, hasBody=${!!$response?.body}`); } catch {}

	try {
		const handler = pickHandler(url);
		if (!handler) {
			Console.debug("无匹配 handler，透传");
			return undefined;
		}
		Console.debug(`匹配 handler: ${handler.name}`);

		const result = rewriteEncryptedBody(body, handler, requestId, deviceType, $request);
		if (result?.body) {
			// binary-body-mode 下需要返回二进制数据
			// encryptResponse 返回二进制字符串，需要转成 Uint8Array
			const bytes = binStrToBytes(result.body);
			if (bytes.length > 0) {
				// 写回响应 (兼容 Surge/Loon/QX - 同时设置 body/bodyBytes/rawBody)
				$response.body = bytes;
				$response.bodyBytes = bytes;
				$response.rawBody = bytes;

				// 去掉 Content-Encoding / Transfer-Encoding，更新 Content-Length
				if ($response.headers) {
					delete $response.headers["Content-Encoding"];
					delete $response.headers["content-encoding"];
					delete $response.headers["Transfer-Encoding"];
					delete $response.headers["transfer-encoding"];
					$response.headers["Content-Length"] = String(bytes.length);
				}
				$response.status = 200;
				$response.statusCode = 200;
			}
			Console.debug(`返回 Uint8Array, len=${bytes.length}`);
			Console.info("已解密改写并重加密响应");
		} else {
			Console.debug("未变更或无需改写，透传");
			return undefined;
		}
		return $response;
	} finally {
		Console.groupEnd();
	}
}
