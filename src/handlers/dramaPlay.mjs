// 播放解锁：drama/play
// 服务器对付费剧返回 {"status":"n","error":"本集需金币解锁","errorCode":813005}
// 成功响应包含: lines, drama_id, seq, name, duration, m3u8, preview_m3u8, hls_key, is_preview, preview_seconds
//
// 重要变更：服务器现在对 play.m3u8 URL 添加 exp + sig 签名验证
// 旧方案伪造 play.m3u8?line=free 已返回 403，无法绕过
// 新策略：
//   1. 成功响应：直接透传服务器返回的签名 URL，仅修正 is_preview/preview_seconds
//   2. 付费错误(813005)：用 detail 缓存的 cover URL 构造 CloudFront preview.mp4 回退
//   3. 预览响应：保留 preview URL，修正标志位

import { getCachedPlayRequest, getPreviewUrl } from "../utils/cache.mjs";

function getHostFromUrl(url) {
	try {
		const m = String(url).match(/^https?:\/\/([^/]+)/);
		return m ? m[1] : null;
	} catch {
		return null;
	}
}

/**
 * 用 preview URL 构造回退响应
 * preview.mp4 在 CloudFront 上无需签名即可访问
 */
function forgePreviewResponse(dramaId, seq, previewUrl) {
	if (!previewUrl) return null;
	return {
		status: "y",
		data: {
			drama_id: String(dramaId),
			duration: 0,
			hls_key: "",
			lines: [
				{ id: "0", lid: "0", code: "free", name: "free", m3u8_url: previewUrl, url: previewUrl },
			],
			m3u8: previewUrl,
			name: String(seq),
			preview_m3u8: previewUrl,
			seq: Number(seq) || seq,
			is_preview: false,
			preview_seconds: 0,
		},
		time: new Date().toISOString().replace("T", " ").slice(0, 19),
	};
}

export function modifyDramaPlay(payload, $request) {
	if (!payload || typeof payload !== "object") return false;
	let changed = false;

	// 付费错误响应：尝试用 preview URL 回退
	const payErrorCodes = [813004, 813005, 813006, 813103, "813004", "813005", "813006", "813103"];
	if (payload.status === "n" && payErrorCodes.includes(payload.errorCode)) {
		const cached = $request?.__cachedBody || getCachedPlayRequest() || null;
		const dramaId = cached?.id || cached?.drama_id || "";
		const seq = cached?.seq || "";
		if (dramaId && seq) {
			const previewUrl = getPreviewUrl(dramaId, seq);
			if (previewUrl) {
				const forged = forgePreviewResponse(dramaId, seq, previewUrl);
				if (forged) {
					Object.keys(payload).forEach(k => delete payload[k]);
					Object.assign(payload, forged);
					changed = true;
					return changed;
				}
			}
		}
		// 没有 preview URL，透传原响应
		return false;
	}

	// 成功响应中的权限字段
	const data = payload.data && typeof payload.data === "object" ? payload.data : null;
	if (data) {
		const isPreview = (data.is_preview !== undefined && data.is_preview !== false && data.is_preview !== "0")
			|| (typeof data.m3u8 === "string" && /\/preview\.(mp4|m3u8)/.test(data.m3u8))
			|| (Array.isArray(data.lines) && data.lines.some(l => typeof l?.url === "string" && /\/preview\.(mp4|m3u8)/.test(l.url)));

		if (isPreview) {
			// 试看载荷：保留 preview URL 但修正标志位让播放器完整播放
			if (data.is_preview !== undefined && data.is_preview !== false && data.is_preview !== "0") {
				data.is_preview = false;
				changed = true;
			}
			if (data.preview_seconds !== undefined && data.preview_seconds !== "0" && data.preview_seconds !== 0) {
				data.preview_seconds = "0";
				changed = true;
			}
		} else {
			// 非试看，正常修正权限字段
			if (data.is_preview !== undefined && data.is_preview !== false && data.is_preview !== "0") {
				data.is_preview = false;
				changed = true;
			}
			if (data.preview_seconds !== undefined && data.preview_seconds !== "0" && data.preview_seconds !== 0) {
				data.preview_seconds = "0";
				changed = true;
			}
		}
	}

	return changed;
}
