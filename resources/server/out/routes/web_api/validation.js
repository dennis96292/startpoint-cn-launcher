"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePlayerField = exports.PLAYER_FIELD_RULES = exports.VALID_ITEM_IDS = exports.VALID_CHARACTER_IDS = exports.MAX_TIME_OFFSET_MS = exports.MAX_INT = void 0;
// 写入端点结构安全校验（防坏档）：只挡会真正坏档/崩溃的输入，不卡游戏平衡。
const character_json_1 = __importDefault(require("../../../assets/character.json"));
const item_ids_json_1 = __importDefault(require("../../../assets/item_ids.json"));
exports.MAX_INT = 2147483647; // 2^31 - 1，客户端 int 上限（≥2^31 解码成 null = 坏档）
exports.MAX_TIME_OFFSET_MS = 31536000000000; // 约 ±1000 年（内部 ms，不受 2^31 约束）
exports.VALID_CHARACTER_IDS = new Set(Object.keys(character_json_1.default).map(Number));
exports.VALID_ITEM_IDS = new Set(item_ids_json_1.default);
const uint = { kind: "uint" };
const uintNull = { kind: "uintNull" };
// 白名单：Player 已知可编辑字段（id 不在内 = 禁改）
exports.PLAYER_FIELD_RULES = {
    stamina: uint,
    boostPoint: uint,
    bossBoostPoint: uint,
    transitionState: uint,
    role: uint,
    vmoney: uint,
    freeVmoney: uint,
    rankPoint: uint,
    starCrumb: uint,
    bondToken: uint,
    expPool: uint,
    leaderCharacterId: uint,
    partySlot: uint,
    degreeId: uint,
    birth: uint,
    freeMana: uint,
    paidMana: uint,
    name: { kind: "string", max: 32 },
    comment: { kind: "string", max: 128 },
    enableAuto3x: { kind: "bool" },
    tutorialSkipFlag: { kind: "boolNull" },
    tutorialStep: uintNull,
    tutorialGachaCharacterId: uintNull,
    timeOffset: { kind: "timeOffset" },
    staminaHealTime: { kind: "date" },
    lastLoginTime: { kind: "date" },
    expPooledTime: { kind: "date" },
};
function isNullish(raw) {
    return raw === "" || raw === "null" || raw === null || raw === undefined;
}
function parseUint(field, raw) {
    const n = Number(raw);
    if (!Number.isFinite(n))
        return { ok: false, error: `${field} 不是有效数字` };
    const v = Math.trunc(n);
    if (v < 0 || v > exports.MAX_INT)
        return { ok: false, error: `${field} 超出范围（需 0 ~ ${exports.MAX_INT}）` };
    return { ok: true, value: v };
}
function validatePlayerField(field, raw) {
    const rule = exports.PLAYER_FIELD_RULES[field];
    if (!rule)
        return { ok: false, error: `不允许修改字段：${field}` };
    switch (rule.kind) {
        case "uint":
            return parseUint(field, raw);
        case "uintNull":
            return isNullish(raw) ? { ok: true, value: null } : parseUint(field, raw);
        case "bool":
            return { ok: true, value: raw === true || raw === "true" || raw === "1" };
        case "boolNull":
            return isNullish(raw) ? { ok: true, value: null } : { ok: true, value: raw === true || raw === "true" || raw === "1" };
        case "string": {
            const s = String(raw);
            if (s.length > rule.max)
                return { ok: false, error: `${field} 过长（最多 ${rule.max} 字符）` };
            return { ok: true, value: s };
        }
        case "timeOffset": {
            if (isNullish(raw))
                return { ok: true, value: null };
            const n = Number(raw);
            if (!Number.isFinite(n))
                return { ok: false, error: `${field} 不是有效数字` };
            const v = Math.trunc(n);
            if (Math.abs(v) > exports.MAX_TIME_OFFSET_MS)
                return { ok: false, error: `${field} 超出范围（约 ±1000 年）` };
            return { ok: true, value: v };
        }
        case "date": {
            const d = new Date(raw);
            if (isNaN(d.getTime()))
                return { ok: false, error: `${field} 不是有效日期` };
            return { ok: true, value: d };
        }
    }
}
exports.validatePlayerField = validatePlayerField;
