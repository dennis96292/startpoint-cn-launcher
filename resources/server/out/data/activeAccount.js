"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlayerTimeOffsetSync = exports.resolvePlayerIdSync = exports.saveAccountDefaultPlayer = exports.getAccountDefaultPlayer = exports.restoreTimeOffset = exports.saveTimeOffset = exports.setSelectedAccountId = exports.getSelectedAccountId = exports.setActivePlayerId = exports.getActivePlayerId = void 0;
/**
 * Web 面板状态管理：当前活跃存档。
 * 持久化到 .database/active_account.json
 */
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../utils");
const account_1 = require("./domains/account");
const STATE_FILE = path.join(process.env.DB_DIR || path.join(__dirname, "..", "..", ".database"), "active_account.json");
function readState() {
    var _a, _b, _c, _d, _e;
    try {
        if (fs.existsSync(STATE_FILE)) {
            const raw = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
            return {
                activePlayerId: (_a = raw.activePlayerId) !== null && _a !== void 0 ? _a : null,
                selectedAccountId: (_b = raw.selectedAccountId) !== null && _b !== void 0 ? _b : null,
                timeOffset: (_c = raw.timeOffset) !== null && _c !== void 0 ? _c : null,
                lastSetTime: (_d = raw.lastSetTime) !== null && _d !== void 0 ? _d : null,
                defaultPlayers: (_e = raw.defaultPlayers) !== null && _e !== void 0 ? _e : {},
            };
        }
    }
    catch ( /* ignore corrupt file */_f) { /* ignore corrupt file */ }
    return { activePlayerId: null, selectedAccountId: null, timeOffset: null, lastSetTime: null, defaultPlayers: {} };
}
function writeState(state) {
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir))
        fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state));
}
function getActivePlayerId() {
    return readState().activePlayerId;
}
exports.getActivePlayerId = getActivePlayerId;
function setActivePlayerId(id) {
    const state = readState();
    state.activePlayerId = id;
    writeState(state);
}
exports.setActivePlayerId = setActivePlayerId;
function getSelectedAccountId() {
    return readState().selectedAccountId;
}
exports.getSelectedAccountId = getSelectedAccountId;
function setSelectedAccountId(id) {
    const state = readState();
    state.selectedAccountId = id;
    writeState(state);
}
exports.setSelectedAccountId = setSelectedAccountId;
/**
 * Save time offset from Web panel, also updates active player's time_offset.
 */
function saveTimeOffset(offset) {
    const state = readState();
    state.timeOffset = offset;
    state.lastSetTime = offset !== null ? new Date(Date.now() + offset).toISOString() : null;
    writeState(state);
    // Also persist to current active player
    const pid = state.activePlayerId;
    if (pid) {
        try {
            const { getDb } = require("./wdfpData");
            getDb().prepare(`UPDATE players SET time_offset = ? WHERE id = ?`).run(offset, pid);
        }
        catch (_a) { }
    }
}
exports.saveTimeOffset = saveTimeOffset;
/**
 * Restore time offset on server startup.
 * Uses saved offset, or defaults to 2024-07-23 12:00 UTC if not set.
 * NOTE: must stay BEFORE 2024-07-25 — that is 谢胧/waterdragon_kunfu (121033)'s debut pickup banner
 * (gacha 1637 "新角色特选扭蛋", 2024-07-25~08-08). The CDN art predates 谢胧, so any server date
 * inside/after that banner makes the home screen preload 谢胧's pickup art → C8100 crash.
 * The clock drifts with real time, so it will re-enter 谢胧's window after ~2 days; reset the date
 * in the admin panel if the crash recurs (or pin the time).
 */
function restoreTimeOffset() {
    const state = readState();
    if (state.timeOffset !== null) {
        (0, utils_1.setServerTimeOffset)(state.timeOffset);
    }
    else {
        const defaultDate = new Date("2024-07-23T12:00:00Z");
        const offset = defaultDate.getTime() - Date.now();
        state.timeOffset = offset;
        state.lastSetTime = defaultDate.toISOString();
        writeState(state);
        (0, utils_1.setServerTimeOffset)(offset);
    }
}
exports.restoreTimeOffset = restoreTimeOffset;
/**
 * Get the default player ID for a specific account.
 * Falls back to null if no default is set.
 */
function getAccountDefaultPlayer(accountId) {
    var _a;
    const state = readState();
    return (_a = state.defaultPlayers[accountId]) !== null && _a !== void 0 ? _a : null;
}
exports.getAccountDefaultPlayer = getAccountDefaultPlayer;
/**
 * Save the default player ID for a specific account.
 */
function saveAccountDefaultPlayer(accountId, playerId) {
    const state = readState();
    state.defaultPlayers[accountId] = playerId;
    writeState(state);
}
exports.saveAccountDefaultPlayer = saveAccountDefaultPlayer;
/**
 * Resolves the active player ID for an account.
 * Uses per-account defaultPlayers, falls back to first player.
 * Returns null if the account has no players.
 */
function resolvePlayerIdSync(accountId) {
    const playerIds = (0, account_1.getAccountPlayersSync)(accountId);
    if (!playerIds.length)
        return null;
    const state = readState();
    const preferredId = state.defaultPlayers[accountId];
    return (preferredId && playerIds.includes(preferredId)) ? preferredId : playerIds[0];
}
exports.resolvePlayerIdSync = resolvePlayerIdSync;
/**
 * Returns the per-player time_offset, or null if not set.
 */
function getPlayerTimeOffsetSync(playerId) {
    var _a;
    try {
        const { getDb } = require("./wdfpData");
        const row = getDb().prepare(`SELECT time_offset FROM players WHERE id = ?`).get(playerId);
        return (_a = row === null || row === void 0 ? void 0 : row.time_offset) !== null && _a !== void 0 ? _a : null;
    }
    catch (_b) {
        return null;
    }
}
exports.getPlayerTimeOffsetSync = getPlayerTimeOffsetSync;
