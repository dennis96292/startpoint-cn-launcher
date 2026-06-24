"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRequestPlatformSync = exports.Platform = exports.generateDataHeaders = exports.generateViewerId = exports.generateIdpAlias = exports.getDateFromServerTime = exports.getServerTimeForPlayer = exports.getTimeOffset = exports.setServerTimeOffset = exports.setServerTime = exports.getServerDate = exports.getServerTime = void 0;
const crypto_1 = require("crypto");
// The server's current time offset (real time + offset = simulated time)
let timeOffset = null; // milliseconds, null = use system time
console.log(`[TIME] startup offset=${timeOffset !== null && timeOffset !== void 0 ? timeOffset : 'null(system)'}`);
/**
 * Returns the current server time as a unix epoch.
 * Without argument: returns simulated current time.
 * With argument: converts the given Date to epoch (ignoring offset for serialization).
 *
 * @param date An optional date to convert to epoch.
 * @returns The unix epoch.
 */
function getServerTime(date) {
    if (date !== undefined) {
        return Math.floor(date.getTime() / 1000);
    }
    return Math.floor((Date.now() + (timeOffset !== null && timeOffset !== void 0 ? timeOffset : 0)) / 1000);
}
exports.getServerTime = getServerTime;
/**
 * Gets the current server time as a Date.
 *
 * @returns The current server time as a date.
 */
function getServerDate() {
    return timeOffset !== null ? new Date(Date.now() + timeOffset) : new Date();
}
exports.getServerDate = getServerDate;
/**
 * Sets a custom server time from an absolute date.
 * The offset (target - real time) is computed and stored.
 * Set to null to reset to system time.
 */
function setServerTime(date) {
    timeOffset = date ? date.getTime() - Date.now() : null;
    console.log(`[TIME] setServerTime → ${(date === null || date === void 0 ? void 0 : date.toISOString()) || 'null(system)'} offset=${timeOffset}`);
}
exports.setServerTime = setServerTime;
/**
 * Sets the time offset directly (used on startup restore).
 */
function setServerTimeOffset(offset) {
    timeOffset = offset;
    console.log(`[TIME] startup restore offset=${offset !== null && offset !== void 0 ? offset : 'null(system)'}`);
}
exports.setServerTimeOffset = setServerTimeOffset;
/**
 * Returns the raw time offset (used for persistence).
 */
function getTimeOffset() {
    return timeOffset;
}
exports.getTimeOffset = getTimeOffset;
/**
 * Returns server time for a specific player.
 * Uses player.time_offset if set, otherwise falls back to global server offset.
 */
function getServerTimeForPlayer(playerId) {
    if (playerId) {
        try {
            const { getPlayerTimeOffsetSync } = require("./data/activeAccount");
            const offset = getPlayerTimeOffsetSync(playerId);
            if (offset !== null)
                return Math.floor((Date.now() + offset) / 1000);
        }
        catch (_a) { }
    }
    return getServerTime();
}
exports.getServerTimeForPlayer = getServerTimeForPlayer;
/**
 * Converts a server time value (unix epoch in seconds) into a Date.
 *
 * @param serverTime The unix epoch value.
 * @returns The date.
 */
function getDateFromServerTime(serverTime) {
    return new Date(serverTime * 1000);
}
exports.getDateFromServerTime = getDateFromServerTime;
/**
 * Generates an IdpAlias to identify a particular device.
 *
 * @param appId
 * @param idpId
 * @param serialNo
 * @returns The generated IdpAlias
 */
function generateIdpAlias(appId, deviceId, serialNo) {
    return `${appId}:${deviceId}:${serialNo}`;
}
exports.generateIdpAlias = generateIdpAlias;
/**
 * Generates a random viewer ID using the crypto library.
 *
 * @returns A number between 100,000,000 and 999,999,999
 */
function generateViewerId() {
    return (0, crypto_1.randomInt)(100000000, 999999999);
}
exports.generateViewerId = generateViewerId;
/**
 * Generates a default data headers object, which is used in communication with the client.
 *
 * @param customValues A partial DataHeaders object with custom fields to replace the default ones.
 * @returns A DataHeaders object.
 */
function generateDataHeaders(customValues = {}, fields = ['force_update', 'asset_update', 'short_udid', 'viewer_id', 'servertime', 'result_code']) {
    const defaultHeaders = {
        force_update: false,
        asset_update: false,
        short_udid: 0,
        viewer_id: 0,
        servertime: 0,
        result_code: 1
    };
    const headers = {};
    for (const field of fields) {
        const customValue = customValues[field];
        let defaultValue = defaultHeaders[field];
        // servertime evaluated fresh each request (uses simulated time if set)
        if (field === 'servertime') {
            defaultValue = getServerTime();
        }
        headers[field] = customValue === undefined ? defaultValue : customValue;
    }
    return headers;
}
exports.generateDataHeaders = generateDataHeaders;
var Platform;
(function (Platform) {
    Platform[Platform["ANDROID"] = 0] = "ANDROID";
    Platform[Platform["IOS"] = 1] = "IOS";
})(Platform || (exports.Platform = Platform = {}));
function getRequestPlatformSync(request) {
    // check user agent
    if ((request.headers["user-agent"] || '').includes('iOS;'))
        return Platform.IOS;
    // check requestedby header
    if ((request.headers["requestedby"] || '') === 'ios')
        return Platform.IOS;
    return Platform.ANDROID;
}
exports.getRequestPlatformSync = getRequestPlatformSync;
