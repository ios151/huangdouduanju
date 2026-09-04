// VIP 解锁：修改 user/info 中的会员状态、余额、播放次数

const VIP_EXPIRE = "2099-12-31";

function patchUser(user) {
	if (!user || typeof user !== "object") return false;
	let changed = false;

	if (user.is_vip !== "y") { user.is_vip = "y"; changed = true; }
	if (user.is_up !== undefined && user.is_up !== "y") { user.is_up = "y"; changed = true; }
	if (user.up_status !== undefined && user.up_status !== 1) { user.up_status = 1; changed = true; }
	if (user.balance !== undefined && user.balance !== "999999") { user.balance = "999999"; changed = true; }
	if (user.score !== undefined && user.score !== "999999") { user.score = "999999"; changed = true; }
	if (user.level !== undefined && user.level !== "99") { user.level = "99"; changed = true; }
	if (user.play_num !== undefined) { user.play_num = "999999/999999"; changed = true; }
	if (user.need_bind_email !== undefined) { user.need_bind_email = false; changed = true; }
	if (user.need_bind_contact !== undefined) { user.need_bind_contact = false; changed = true; }
	if (user.group_name !== undefined && !user.group_name) { user.group_name = "至尊SVIP"; changed = true; }
	if (user.group_end_time !== undefined && !user.group_end_time) { user.group_end_time = VIP_EXPIRE; changed = true; }
	if (user.nickname !== undefined) { user.nickname = "联合国儿童基金会"; changed = true; }

	return changed;
}

export function modifyUserInfo(payload) {
	if (!payload || typeof payload !== "object") return false;
	let changed = false;
	changed = patchUser(payload) || changed;
	if (payload.data && typeof payload.data === "object") changed = patchUser(payload.data) || changed;
	if (payload.userInfo && typeof payload.userInfo === "object") changed = patchUser(payload.userInfo) || changed;
	if (payload.user && typeof payload.user === "object") changed = patchUser(payload.user) || changed;
	return changed;
}
