// 列表免费 + 去信息流广告：drama/navBlock、movie/navBlock 中的 items 统一标记免费
// 真实字段（从 main.js 逆向）：
//   item: isFree / free / is_free, type("free"或其他), price, money, pay_type, price_coin

function unlockItem(item) {
	if (!item || typeof item !== "object") return false;
	let changed = false;

	// isFree / free / is_free → true / "1" / "y"
	for (const key of ["isFree", "free", "is_free"]) {
		if (item[key] !== undefined) {
			const v = item[key];
			if (v !== true && v !== "1" && v !== "y" && v !== 1) {
				item[key] = typeof v === "boolean" ? true : (typeof v === "number" ? 1 : "1");
				changed = true;
			}
		}
	}

	// type → "free"
	if (item.type !== undefined && item.type !== "free" && item.type !== "") {
		item.type = "free";
		changed = true;
	}
	// pay_type → "free"
	if (item.pay_type !== undefined && item.pay_type !== "free" && item.pay_type !== "") {
		item.pay_type = "free";
		changed = true;
	}
	// price → "0"
	if (item.price !== undefined && item.price !== "0" && item.price !== 0) {
		item.price = "0";
		changed = true;
	}
	// money → "0"
	if (item.money !== undefined && item.money !== "0" && item.money !== 0) {
		item.money = "0";
		changed = true;
	}
	// price_coin → "0"
	if (item.price_coin !== undefined && item.price_coin !== "0" && item.price_coin !== 0) {
		item.price_coin = "0";
		changed = true;
	}
	// cost_gold → "0"
	if (item.cost_gold !== undefined && item.cost_gold !== "0" && item.cost_gold !== 0) {
		item.cost_gold = "0";
		changed = true;
	}
	// whole_price_coin → "0"
	if (item.whole_price_coin !== undefined && item.whole_price_coin !== "0" && item.whole_price_coin !== 0) {
		item.whole_price_coin = "0";
		changed = true;
	}

	// corner → ""（去掉"会员"角标）
	if (item.corner !== undefined && item.corner !== "" && item.corner !== "免费") {
		item.corner = "";
		changed = true;
	}

	return changed;
}

/** 清空列表块中的广告插入参数 */
function clearListAdFields(block) {
	if (!block || typeof block !== "object") return false;
	let changed = false;
	if (block.ad_insert_every !== undefined && block.ad_insert_every !== 0) {
		block.ad_insert_every = 0;
		changed = true;
	}
	if (block.ad_source !== undefined && block.ad_source !== "") {
		block.ad_source = "";
		changed = true;
	}
	// navFilter 里的 ad_every
	if (block.ad_every !== undefined && block.ad_every !== 0) {
		block.ad_every = 0;
		changed = true;
	}
	return changed;
}

function walk(value) {
	let changed = false;
	if (Array.isArray(value)) {
		for (const item of value) changed = unlockItem(item) || walk(item) || changed;
	} else if (value && typeof value === "object") {
		changed = clearListAdFields(value) || changed;
		if (Array.isArray(value.items)) {
			for (const item of value.items) changed = unlockItem(item) || changed;
		}
		if (Array.isArray(value.list)) {
			for (const item of value.list) changed = unlockItem(item) || walk(item) || changed;
		}
		for (const key of Object.keys(value)) {
			if (key !== "items" && key !== "list") changed = walk(value[key]) || changed;
		}
	}
	return changed;
}

export function modifyDramaList(payload) {
	if (!payload || typeof payload !== "object") return false;
	let changed = false;
	if (payload.data && typeof payload.data === "object") changed = walk(payload.data) || changed;
	else changed = walk(payload) || changed;
	return changed;
}
