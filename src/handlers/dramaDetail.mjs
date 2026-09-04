// 详情解锁：drama/detail、movie/detail
// 核心逻辑（参考 lzlukvca 脚本 + main.js 逆向）：
//   episode.type='free' + episode.is_buy=true → 前端 ans()=false → 不弹窗直接发 play
//   不能改成 coin/points（会弹金币/积分窗），也不能保留 vip（弹会员窗）

function unlockEpisode(ep) {
	if (!ep || typeof ep !== "object") return false;
	let changed = false;

	// 关键：type='free' + is_buy=true
	if (ep.type !== undefined && ep.type !== "free") {
		ep.type = "free";
		changed = true;
	}
	if (ep.is_buy !== undefined && ep.is_buy !== true) {
		ep.is_buy = true;
		changed = true;
	}

	// 价格清零
	if (ep.price !== undefined && ep.price !== 0 && ep.price !== "0") {
		ep.price = 0;
		changed = true;
	}
	if (ep.money !== undefined && ep.money !== 0 && ep.money !== "0") {
		ep.money = 0;
		changed = true;
	}
	if (ep.price_coin !== undefined && ep.price_coin !== "0" && ep.price_coin !== 0) {
		ep.price_coin = "0";
		changed = true;
	}

	// methods 清空
	if (ep.methods !== undefined && Array.isArray(ep.methods) && ep.methods.length > 0) {
		ep.methods = [];
		changed = true;
	}

	// is_free / isFree / free → true
	for (const key of ["is_free", "isFree", "free"]) {
		if (ep[key] !== undefined && ep[key] !== true && ep[key] !== "1" && ep[key] !== "y") {
			ep[key] = true;
			changed = true;
		}
	}

	// pay_type → "free"
	if (ep.pay_type !== undefined && ep.pay_type !== "free" && ep.pay_type !== "") {
		ep.pay_type = "free";
		changed = true;
	}

	return changed;
}

function unlockDrama(drama) {
	if (!drama || typeof drama !== "object") return false;
	let changed = false;

	// 整剧付费字段
	if (drama.pay_type !== undefined && drama.pay_type !== "free" && drama.pay_type !== "") {
		drama.pay_type = "free";
		changed = true;
	}
	if (drama.money !== undefined && drama.money !== "0" && drama.money !== 0) {
		drama.money = "0";
		changed = true;
	}
	if (drama.episode_price !== undefined && drama.episode_price !== "0" && drama.episode_price !== 0) {
		drama.episode_price = "0";
		changed = true;
	}
	if (drama.points_price !== undefined && drama.points_price !== "0" && drama.points_price !== 0) {
		drama.points_price = "0";
		changed = true;
	}

	// free_episodes → 全部免费
	if (drama.free_episodes !== undefined && drama.episodes && Array.isArray(drama.episodes)) {
		if (drama.free_episodes !== drama.episodes.length) {
			drama.free_episodes = drama.episodes.length;
			changed = true;
		}
	}

	// vip/coin/points episodes → 空
	if (drama.vip_episodes !== undefined && drama.vip_episodes !== "" && drama.vip_episodes !== []) {
		drama.vip_episodes = [];
		changed = true;
	}
	if (drama.coin_episodes !== undefined && drama.coin_episodes !== "" && drama.coin_episodes !== []) {
		drama.coin_episodes = [];
		changed = true;
	}
	if (drama.points_episodes !== undefined && drama.points_episodes !== "" && drama.points_episodes !== []) {
		drama.points_episodes = [];
		changed = true;
	}

	// is_buy_whole → true
	if (drama.is_buy_whole !== undefined && drama.is_buy_whole !== true) {
		drama.is_buy_whole = true;
		changed = true;
	}
	// can_vip_watch → true
	if (drama.can_vip_watch !== undefined && drama.can_vip_watch !== true) {
		drama.can_vip_watch = true;
		changed = true;
	}

	// corner → ""
	if (drama.corner !== undefined && drama.corner !== "" && drama.corner !== "免费") {
		drama.corner = "";
		changed = true;
	}

	// 播放前广告：清空 play_ads 数组
	if (Array.isArray(drama.play_ads) && drama.play_ads.length > 0) {
		drama.play_ads = [];
		changed = true;
	}
	// play_ads_auto_jump → "y"（自动跳过播放广告）
	if (drama.play_ads_auto_jump !== undefined && drama.play_ads_auto_jump !== "y") {
		drama.play_ads_auto_jump = "y";
		changed = true;
	}
	// play_ads_time → "0"（广告倒计时为0）
	if (drama.play_ads_time !== undefined && drama.play_ads_time !== "0" && drama.play_ads_time !== 0) {
		drama.play_ads_time = "0";
		changed = true;
	}

	// 剧集列表
	for (const key of ["episodes", "list", "items", "episode_list"]) {
		if (Array.isArray(drama[key])) {
			for (const ep of drama[key]) changed = unlockEpisode(ep) || changed;
		}
	}

	return changed;
}

export function modifyDramaDetail(payload) {
	if (!payload || typeof payload !== "object") return false;
	let changed = false;
	const data = payload.data && typeof payload.data === "object" ? payload.data : payload;
	changed = unlockDrama(data) || changed;
	changed = unlockDrama(payload) || changed;
	return changed;
}
