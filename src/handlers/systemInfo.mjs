// 去广告：清空 system/info 中的全部广告配置
// 关键逻辑（从 main.js 逆向 + 真实响应分析）：
//   arn(a): if (a.k4.length === 0) { JG(); return; }  → splash 数组为空时直接跳首页
//   bBE():  splash_time 为计时秒数，到 0 时若 auto_jump="y" 则自动跳转
//   bX3:    skippable="y" 时可跳过
//   ad_insert_every / ad_source 在 navBlock 列表中控制信息流广告插入
//
// 真实 ads 对象 key（从实际响应抓取）：
//   app_float_bottom_right, app_start, m_banner_top, m_comment_banner,
//   m_episode_gap, m_feed, m_feed2, m_float, m_floor_gap, m_icon,
//   m_list_inline, m_mine_top, m_play_popup, m_top2, m_top3,
//   m_up_list, m_update_banner
//
// 注意：ads 值有两种结构：
//   1. 简单数组：[{id, name, content, link, ...}]
//   2. 嵌套数组：[{anchor, render, ads: [...], insert_every, ...}]
//   两种都要清空

const SPLASH_ARRAY_KEYS = new Set([
	"splash",
	"startup_popups",
]);

const AD_SKIPPABLE_KEYS = new Set([
	"splash_skippable",
	"ad_popup_skippable",
	"ad_pause_skippable",
	"ad_gap_skippable",
]);

const AD_VIP_SKIP_KEYS = new Set([
	"splash_skippable_vip",
	"ad_popup_vip_skip",
	"ad_pause_vip_skip",
	"ad_gap_vip_skip",
]);

const AD_TIME_KEYS = new Set([
	"splash_time",
	"splash_rotate_secs",
]);

// 递归清空广告数组（处理嵌套结构）
function clearAdArray(arr) {
	if (!Array.isArray(arr) || arr.length === 0) return false;
	let changed = false;
	for (const item of arr) {
		if (item && typeof item === "object") {
			// 嵌套结构：item.ads 是广告数组
			if (Array.isArray(item.ads) && item.ads.length > 0) {
				item.ads = [];
				changed = true;
			}
			// 嵌套结构：item.insert_every 控制插入频率
			if (item.insert_every !== undefined && item.insert_every !== 0) {
				item.insert_every = 0;
				changed = true;
			}
		}
	}
	// 清空整个数组
	if (arr.length > 0) {
		arr.length = 0;
		changed = true;
	}
	return changed;
}

function clearAds(data) {
	if (!data || typeof data !== "object") return false;
	let changed = false;

	// data.ads 对象：每个 key 对应广告数组
	if (data.ads && typeof data.ads === "object") {
		for (const key of Object.keys(data.ads)) {
			if (clearAdArray(data.ads[key])) changed = true;
		}
	}

	// data.page_ad_slots：页面级广告配置（drama_home/drama_mine/up_home 等）
	// 每个 slot 是对象，有 ads 数组、insert_every、rotate_secs 等字段
	// 只清空 ads 数组和 insert_every，保留 slot 结构
	if (data.page_ad_slots && typeof data.page_ad_slots === "object") {
		for (const key of Object.keys(data.page_ad_slots)) {
			const slots = data.page_ad_slots[key];
			if (Array.isArray(slots)) {
				for (const slot of slots) {
					if (slot && typeof slot === "object") {
						if (Array.isArray(slot.ads) && slot.ads.length > 0) {
							slot.ads = [];
							changed = true;
						}
						if (slot.insert_every !== undefined && slot.insert_every !== 0) {
							slot.insert_every = 0;
							changed = true;
						}
					}
				}
			}
		}
	}

	// 顶层 splash / startup_popups
	for (const key of SPLASH_ARRAY_KEYS) {
		if (Array.isArray(data[key]) && data[key].length > 0) {
			data[key] = [];
			changed = true;
		}
	}

	// 跳过开关 → y
	for (const key of AD_SKIPPABLE_KEYS) {
		if (data[key] !== undefined && data[key] !== "y") {
			data[key] = "y";
			changed = true;
		}
	}

	// VIP 跳过 → y
	for (const key of AD_VIP_SKIP_KEYS) {
		if (data[key] !== undefined && data[key] !== "y") {
			data[key] = "y";
			changed = true;
		}
	}

	// 启动页倒计时 → 0
	for (const key of AD_TIME_KEYS) {
		if (data[key] !== undefined && data[key] !== "0") {
			data[key] = "0";
			changed = true;
		}
	}

	// splash_auto_jump → y（自动跳过启动页）
	if (data.splash_auto_jump !== undefined && data.splash_auto_jump !== "y") {
		data.splash_auto_jump = "y";
		changed = true;
	}

	// ad_label → n（不显示广告标签）
	if (data.ad_label !== undefined && data.ad_label !== "n") {
		data.ad_label = "n";
		changed = true;
	}

	// place_ad → ""
	if (data.place_ad !== undefined && data.place_ad !== "") {
		data.place_ad = "";
		changed = true;
	}

	// 注意：home_channels / home_blocks 不能删除！
	// home_channels 里 type="ad" 表示"该频道有广告位"，不是"这是广告"
	// home_blocks 里 source="ad" 表示"内容来源是广告位"，不是"这是广告"
	// 删除它们会移除整个频道/布局

	return changed;
}

export function modifySystemInfo(payload) {
	if (!payload || typeof payload !== "object") return false;
	let changed = false;
	if (payload.data && typeof payload.data === "object") {
		changed = clearAds(payload.data) || changed;
	}
	changed = clearAds(payload) || changed;
	return changed;
}
