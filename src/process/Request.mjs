import { $app, Console, fetch } from "@nsnanocat/util";
import { stripZstd } from "../utils/headers.mjs";
import { resolveSettings } from "../utils/settings.mjs";
import { Response } from "./Response.mjs";

/**
 * Request 模式（script-request-body / echo）：
 * 代理工具把请求交给脚本 → 脚本 fetch 上游 → 解密改写 → 返回响应
 */
export async function Request($request) {
	let $response = undefined;
	const settings = resolveSettings();
	Console.logLevel = settings.logLevel;
	Console.debug(`Current App: ${$app}, logLevel=${Console.logLevel}`);

	$request.headers = stripZstd($request.headers || {});
	const url = $request.url || "";
	const method = ($request.method || "GET").toUpperCase();
	Console.group(`Request ${method} ${url}`);

	const upstreamHeaders = { ...($request.headers || {}) };
	if (["Surge", "Loon", "Stash"].includes($app)) upstreamHeaders["X-Surge-Skip-Scripting"] = "true";

	const upstreamReq = {
		url: $request.url,
		method: $request.method,
		headers: upstreamHeaders,
	};
	// 请求体：黄豆短剧的请求体是加密二进制
	Console.debug(`$request.body: type=${typeof $request.body}, len=${$request.body?.length}`);
	Console.debug(`$request.bodyBytes: type=${typeof $request.bodyBytes}, exists=${!!$request.bodyBytes}`);
	if (method !== "GET") {
		if ($request.bodyBytes != null) {
			upstreamReq.bodyBytes = $request.bodyBytes;
			Console.debug(`使用 bodyBytes 传递请求体, type=${typeof $request.bodyBytes}`);
		} else if ($request.body != null) {
			// body 是 binary string，转成 Uint8Array 再传
			const bodyStr = $request.body;
			if (typeof bodyStr === "string") {
				const bodyBytes = new Uint8Array(bodyStr.length);
				for (let i = 0; i < bodyStr.length; i++) bodyBytes[i] = bodyStr.charCodeAt(i) & 0xff;
				upstreamReq.bodyBytes = bodyBytes.buffer;
				Console.debug(`body string → bodyBytes, len=${bodyBytes.length}`);
			} else {
				upstreamReq.body = $request.body;
				Console.debug(`使用 body 传递请求体, type=${typeof $request.body}`);
			}
		} else {
			Console.warn("请求体为空！body 和 bodyBytes 都是 null");
		}
	}
	if ($app === "Quantumult X") upstreamReq.opts = { hints: false };

	Console.debug("发起上游请求...");
	$response = await fetch(upstreamReq);
	if (!$response) $response = { status: 200, headers: {}, body: "" };

	Console.debug(`上游响应: status=${$response.status}, body type=${typeof $response.body}, bodyBytes?=${!!$response.bodyBytes}, body len=${$response.body?.length}`);

	$response = await Response($request, $response, settings);

	if ($response.headers) {
		delete $response.headers["Content-Encoding"];
		delete $response.headers["content-encoding"];
		delete $response.headers["Content-Length"];
		delete $response.headers["content-length"];
		delete $response.headers["Transfer-Encoding"];
		delete $response.headers["transfer-encoding"];
	}

	Console.groupEnd();
	return { $request, $response };
}
