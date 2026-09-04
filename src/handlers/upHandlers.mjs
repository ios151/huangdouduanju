// UP 接口 handler：黄豆 UP 主内容解锁 + 去广告
// 真实字段（从实际响应抓取）：
//   episodeFeed item: can_view, ep_is_free, ep_price_coin, episode_min_coin, whole_coin, pay_mode
//   recommend item: UP 主信息（无付费字段）
//   bannerList: {list: [], total: 0}

function getHostFromUrl(url) {
	try {
		const m = String(url).match(/^https?:\/\/([^/]+)/);
		return m ? m[1] : null;
	} catch {
		return null;
	}
}

// 解锁 episodeFeed item
function unlockFeedItem(item) {
	if (!item || typeof item !== "object") return false;
	let changed = false;

	// can_view → true
	if (item.can_view !== undefined && item.can_view !== true) {
		item.can_view = true;
		changed = true;
	}
	// ep_is_free → true
	if (item.ep_is_free !== undefined && item.ep_is_free !== true) {
		item.ep_is_free = true;
		changed = true;
	}
	// ep_price_coin → 0
	if (item.ep_price_coin !== undefined && item.ep_price_coin !== 0 && item.ep_price_coin !== "0") {
		item.ep_price_coin = 0;
		changed = true;
	}
	// episode_min_coin → 0
	if (item.episode_min_coin !== undefined && item.episode_min_coin !== 0 && item.episode_min_coin !== "0") {
		item.episode_min_coin = 0;
		changed = true;
	}
	// whole_coin → 0
	if (item.whole_coin !== undefined && item.whole_coin !== 0 && item.whole_coin !== "0") {
		item.whole_coin = 0;
		changed = true;
	}
	// pay_type → "free"
	if (item.pay_type !== undefined && item.pay_type !== "free" && item.pay_type !== "") {
		item.pay_type = "free";
		changed = true;
	}
	// pay_mode → ""（免费）
	if (item.pay_mode !== undefined && item.pay_mode !== "" && item.pay_mode !== "free") {
		item.pay_mode = "free";
		changed = true;
	}
	// money → "0"
	if (item.money !== undefined && item.money !== "0" && item.money !== 0) {
		item.money = "0";
		changed = true;
	}
	// corner → ""
	if (item.corner !== undefined && item.corner !== "") {
		item.corner = "";
		changed = true;
	}

	return changed;
}

// /up/episodeFeed — UP 剧集信息流，解锁所有 item
export function modifyUpEpisodeFeed(payload) {
	if (!payload || typeof payload !== "object") return false;
	let changed = false;
	const data = payload.data && typeof payload.data === "object" ? payload.data : payload;
	if (Array.isArray(data?.list)) {
		for (const item of data.list) changed = unlockFeedItem(item) || changed;
	}
	return changed;
}

// /up/recommend — UP 主推荐列表（无付费字段，透传）
export function modifyUpRecommend(payload) {
	return false;
}

// /up/detail — UP 剧详情，解锁剧集
function unlockUpDrama(drama) {
	if (!drama || typeof drama !== "object") return false;
	let changed = false;

	if (drama.pay_type !== undefined && drama.pay_type !== "free" && drama.pay_type !== "") {
		drama.pay_type = "free";
		changed = true;
	}
	if (drama.money !== undefined && drama.money !== "0" && drama.money !== 0) {
		drama.money = "0";
		changed = true;
	}
	if (drama.cost_gold !== undefined && drama.cost_gold !== "0" && drama.cost_gold !== 0) {
		drama.cost_gold = "0";
		changed = true;
	}
	if (drama.is_buy !== undefined && drama.is_buy !== true) {
		drama.is_buy = true;
		changed = true;
	}
	if (drama.can_view !== undefined && drama.can_view !== true) {
		drama.can_view = true;
		changed = true;
	}
	if (drama.ep_is_free !== undefined && drama.ep_is_free !== true) {
		drama.ep_is_free = true;
		changed = true;
	}
	if (drama.ep_price_coin !== undefined && drama.ep_price_coin !== 0 && drama.ep_price_coin !== "0") {
		drama.ep_price_coin = 0;
		changed = true;
	}
	if (drama.episode_min_coin !== undefined && drama.episode_min_coin !== 0 && drama.episode_min_coin !== "0") {
		drama.episode_min_coin = 0;
		changed = true;
	}
	if (drama.whole_coin !== undefined && drama.whole_coin !== 0 && drama.whole_coin !== "0") {
		drama.whole_coin = 0;
		changed = true;
	}
	if (drama.type !== undefined && drama.type !== "free" && drama.type !== "") {
		drama.type = "free";
		changed = true;
	}

	// 剧集列表
	for (const key of ["episodes", "list", "items", "episode_list"]) {
		if (Array.isArray(drama[key])) {
			for (const ep of drama[key]) {
				if (ep.type !== undefined && ep.type !== "free") { ep.type = "free"; changed = true; }
				if (ep.is_buy !== undefined && ep.is_buy !== true) { ep.is_buy = true; changed = true; }
				if (ep.can_view !== undefined && ep.can_view !== true) { ep.can_view = true; changed = true; }
				if (ep.ep_is_free !== undefined && ep.ep_is_free !== true) { ep.ep_is_free = true; changed = true; }
				if (ep.cost_gold !== undefined && ep.cost_gold !== "0" && ep.cost_gold !== 0) { ep.cost_gold = "0"; changed = true; }
				if (ep.ep_price_coin !== undefined && ep.ep_price_coin !== 0 && ep.ep_price_coin !== "0") { ep.ep_price_coin = 0; changed = true; }
				if (ep.price !== undefined && ep.price !== "0" && ep.price !== 0) { ep.price = "0"; changed = true; }
			}
		}
	}

	return changed;
}

export function modifyUpDetail(payload) {
	if (!payload || typeof payload !== "object") return false;
	let changed = false;
	const data = payload.data && typeof payload.data === "object" ? payload.data : payload;
	changed = unlockUpDrama(data) || changed;
	changed = unlockUpDrama(payload) || changed;

	// 清空播放广告
	if (data && Array.isArray(data.play_ads) && data.play_ads.length > 0) {
		data.play_ads = [];
		changed = true;
	}

	return changed;
}

// /up/episodePreview — 返回 {status, msg, m3u8, hls_key, ...}
export function modifyUpEpisodePreview(payload, $request) {
	if (!payload || typeof payload !== "object") return false;
	let changed = false;

	if (payload.status !== true && payload.status !== "y") {
		payload.status = true;
		delete payload.msg;
		if (!payload.m3u8) {
			const cached = $request?.__cachedBody;
			if (cached && cached.id) {
				const host = getHostFromUrl($request?.url);
				payload.m3u8 = `https://${host || "cocoaview.cc"}/api/drama/hls/${cached.id}/0/preview.m3u8?line=free`;
			}
		}
		changed = true;
	}

	return changed;
}

// /up/bannerList — UP 横幅广告，清空
export function modifyUpBanner(payload) {
	if (!payload || typeof payload !== "object") return false;
	let changed = false;
	const data = payload.data && typeof payload.data === "object" ? payload.data : payload;
	if (data && Array.isArray(data.list) && data.list.length > 0) {
		data.list = [];
		changed = true;
	}
	return changed;
}

// /up/home — UP 首页，去广告 + 解锁
export function modifyUpHome(payload) {
	if (!payload || typeof payload !== "object") return false;
	let changed = false;
	const data = payload.data && typeof payload.data === "object" ? payload.data : payload;

	for (const key of ["banner", "ads", "banners", "play_ads", "features"]) {
		if (Array.isArray(data[key]) && data[key].length > 0) {
			data[key] = [];
			changed = true;
		}
	}

	for (const key of ["list", "items", "dramas", "contents"]) {
		if (Array.isArray(data[key])) {
			for (const item of data[key]) changed = unlockFeedItem(item) || unlockUpDrama(item) || changed;
		}
	}

	return changed;
}

// /up/content — UP 内容
export function modifyUpContent(payload) {
	if (!payload || typeof payload !== "object") return false;
	let changed = false;
	const data = payload.data && typeof payload.data === "object" ? payload.data : payload;
	changed = unlockUpDrama(data) || unlockFeedItem(data) || changed;

	for (const key of ["banner", "ads", "play_ads", "features"]) {
		if (Array.isArray(data[key]) && data[key].length > 0) {
			data[key] = [];
			changed = true;
		}
	}

	return changed;
}

// /up/episodeList — UP 剧集列表
export function modifyUpEpisodeList(payload) {
	if (!payload || typeof payload !== "object") return false;
	let changed = false;
	const data = payload.data && typeof payload.data === "object" ? payload.data : payload;

	const unlockEp = (ep) => {
		if (!ep || typeof ep !== "object") return;
		if (ep.type !== undefined && ep.type !== "free") { ep.type = "free"; changed = true; }
		if (ep.is_buy !== undefined && ep.is_buy !== true) { ep.is_buy = true; changed = true; }
		if (ep.can_view !== undefined && ep.can_view !== true) { ep.can_view = true; changed = true; }
		if (ep.ep_is_free !== undefined && ep.ep_is_free !== true) { ep.ep_is_free = true; changed = true; }
		if (ep.cost_gold !== undefined && ep.cost_gold !== "0" && ep.cost_gold !== 0) { ep.cost_gold = "0"; changed = true; }
		if (ep.ep_price_coin !== undefined && ep.ep_price_coin !== 0 && ep.ep_price_coin !== "0") { ep.ep_price_coin = 0; changed = true; }
		if (ep.price !== undefined && ep.price !== "0" && ep.price !== 0) { ep.price = "0"; changed = true; }
	};

	if (Array.isArray(data)) {
		for (const ep of data) unlockEp(ep);
	} else if (data && typeof data === "object") {
		for (const key of ["list", "items", "episodes"]) {
			if (Array.isArray(data[key])) for (const ep of data[key]) unlockEp(ep);
		}
	}

	return changed;
}
