// doBuy 响应：伪造成功 status=true
// App 端确认解锁调 /drama/doBuy，成功后判定 status 必须为 boolean true
// 服务端对金币/会员剧返回错误 → 弹窗拦截。这里伪造成功

export function modifyDoBuy(payload) {
	if (!payload || typeof payload !== "object") return false;
	let changed = false;

	if (payload.status !== true) {
		payload.status = true;
		changed = true;
	}
	if (payload.error !== undefined) {
		delete payload.error;
		changed = true;
	}
	if (payload.errorCode !== undefined) {
		delete payload.errorCode;
		changed = true;
	}

	return changed;
}
