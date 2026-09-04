// /api/ad/policy — 明文 JSON 广告策略
// 真实响应（明文，不加密）：
//   {"code":0,"data":{"insert_every":5,"pre_roll_every_vip":2,"pre_roll_every_normal":2,
//    "pre_roll_ok":true,"popup_ok":true,"pause_ok":true,"no_ad":false,
//    "skip_after":5,"skip_after_vip":2,...}}
//
// 去广告策略：
//   no_ad → true（无广告）
//   pre_roll_ok → false（关闭播放前广告）
//   insert_every → 0（不插入信息流广告）
//   popup_ok → false（关闭弹窗广告）
//   pause_ok → false（关闭暂停广告）

export function modifyAdPolicy(payload) {
	if (!payload || typeof payload !== "object") return false;
	let changed = false;
	const data = payload.data && typeof payload.data === "object" ? payload.data : payload;
	if (!data || typeof data !== "object") return false;

	if (data.no_ad !== undefined && data.no_ad !== true) {
		data.no_ad = true;
		changed = true;
	}
	if (data.pre_roll_ok !== undefined && data.pre_roll_ok !== false) {
		data.pre_roll_ok = false;
		changed = true;
	}
	if (data.popup_ok !== undefined && data.popup_ok !== false) {
		data.popup_ok = false;
		changed = true;
	}
	if (data.pause_ok !== undefined && data.pause_ok !== false) {
		data.pause_ok = false;
		changed = true;
	}
	if (data.insert_every !== undefined && data.insert_every !== 0) {
		data.insert_every = 0;
		changed = true;
	}
	if (data.pre_roll_every_vip !== undefined && data.pre_roll_every_vip !== 0) {
		data.pre_roll_every_vip = 0;
		changed = true;
	}
	if (data.pre_roll_every_normal !== undefined && data.pre_roll_every_normal !== 0) {
		data.pre_roll_every_normal = 0;
		changed = true;
	}
	if (data.base_every_vip !== undefined && data.base_every_vip !== 0) {
		data.base_every_vip = 0;
		changed = true;
	}
	if (data.base_every_normal !== undefined && data.base_every_normal !== 0) {
		data.base_every_normal = 0;
		changed = true;
	}
	if (data.popup_every_vip !== undefined && data.popup_every_vip !== 0) {
		data.popup_every_vip = 0;
		changed = true;
	}
	if (data.popup_every_normal !== undefined && data.popup_every_normal !== 0) {
		data.popup_every_normal = 0;
		changed = true;
	}
	if (data.pause_every_episodes !== undefined && data.pause_every_episodes !== 0) {
		data.pause_every_episodes = 0;
		changed = true;
	}
	if (data.session_cap !== undefined && data.session_cap !== 0) {
		data.session_cap = 0;
		changed = true;
	}
	if (data.apply !== undefined && data.apply !== false) {
		data.apply = false;
		changed = true;
	}

	return changed;
}
