// 加密参数 —— 从 main.js 逆向提取
// b6o() 按 deviceType 返回不同 password
export const CRYPTO = Object.freeze({
	// deviceType → HMAC-SHA256 password
	passwords: Object.freeze({
		web: "7961beb44246e3012ce228d6b5ced05a",
		ios: "6be13f303785864aac6a6cc2cb3c9dc6",
		android: "c10ca2986a31fb46d4481ce8631c2725",
	}),
	// 图片解密 key（system/info → img_key）
	imgKey: "525202f9149e061d",
	// AES 参数
	ivLength: 16,
	keyLength: 32,
	// sign 前缀
	signPrefix: "Dart",
	// 默认 deviceType
	defaultDeviceType: "web",
});

export const BOXJS_KEYS = Object.freeze({
	logLevel: "hd_log_level",
});

export const DEFAULT_LOG_LEVEL = "info";
