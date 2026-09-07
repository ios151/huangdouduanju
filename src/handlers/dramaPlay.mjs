// 播放解锁：drama/play
// 服务器对 VIP 剧返回 {"status":"n","error":"该短剧为 VIP 专享","errorCode":813004}
// 成功响应包含: lines, drama_id, seq, name, duration, m3u8, preview_m3u8, hls_key, is_preview, preview_seconds
//
// 解锁策略：当返回 813004/813005/813006 时，伪造成功响应
// m3u8 URL 的域名从请求 URL 动态提取，不写死

function getHostFromUrl(url) {
	try {
		const m = String(url).match(/^https?:\/\/([^/]+)/);
		return m ? m[1] : null;
	} catch {
		return null;
	}
}

function forgePlayResponse(dramaId, seq, host) {
	const base = host || "cocoaview.cc";
	const m3u8Url = `https://${base}/api/drama/hls/${dramaId}/${seq}/play.m3u8?line=free`;
	return {
		status: "y",
		data: {
			drama_id: String(dramaId),
			duration: 0,
			hls_key: "",
			lines: [
				{ name: "free", url: m3u8Url },
			],
			m3u8: m3u8Url,
			name: String(seq),
			preview_m3u8: "",
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

	// 如果是付费错误响应，伪造成功
	const payErrorCodes = [813004, 813005, 813006, 813103, "813004", "813005", "813006", "813103"];
	if (payload.status === "n" && payErrorCodes.includes(payload.errorCode)) {
		// 从缓存获取 drama_id 和 seq
		const cached = $request?.__cachedBody || null;
		if (cached && cached.id) {
			const host = getHostFromUrl($request?.url);
			const forged = forgePlayResponse(cached.id, cached.seq || cached.drama_id, host);
			// 替换整个 payload
			Object.keys(payload).forEach(k => delete payload[k]);
			Object.assign(payload, forged);
			changed = true;
			return changed;
		}
		// 没有缓存，透传原响应
		return false;
	}

	// 成功响应中的权限字段
	const data = payload.data && typeof payload.data === "object" ? payload.data : null;
	if (data) {
		const isPreview = (data.is_preview !== undefined && data.is_preview !== false && data.is_preview !== "0")
			|| (typeof data.m3u8 === "string" && /\/preview\.(mp4|m3u8)/.test(data.m3u8))
			|| (Array.isArray(data.lines) && data.lines.some(l => typeof l?.url === "string" && /\/preview\.(mp4|m3u8)/.test(l.url)));

		if (isPreview) {
			// 试看载荷：is_preview=true 或 URL 含 preview
			// 只翻标志位不够，播放源还是 preview.mp4，需要注入完整 play.m3u8
			// 优先从响应体自身取 drama_id/seq，避免全局缓存时序竞争
			const dramaId = data.drama_id || data.id;
			const seq = data.seq;
			if (dramaId && seq !== undefined) {
				const host = getHostFromUrl($request?.url);
				const forged = forgePlayResponse(dramaId, seq, host);
				// 用伪造的 data 替换原 data（保留外层 status/time）
				Object.keys(data).forEach(k => delete data[k]);
				Object.assign(data, forged.data);
				changed = true;
				return changed;
			}
			// 响应体没有 drama_id/seq，尝试从缓存取
			const cached = $request?.__cachedBody || null;
			if (cached && cached.id) {
				const host = getHostFromUrl($request?.url);
				const forged = forgePlayResponse(cached.id, cached.seq || cached.drama_id, host);
				Object.keys(data).forEach(k => delete data[k]);
				Object.assign(data, forged.data);
				changed = true;
				return changed;
			}
			// 都没有，退而求其次只翻标志位
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
