"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const msgpackr_1 = require("msgpackr");
const static_1 = __importDefault(require("@fastify/static"));
const path_1 = __importDefault(require("path"));
const utils_1 = require("./utils");
const activeAccount_1 = require("./data/activeAccount");
const versionCheck_1 = __importDefault(require("./routes/cn/versionCheck"));
const leitingAuth_1 = __importDefault(require("./routes/cn/leitingAuth"));
const tool_1 = __importDefault(require("./routes/cn/tool"));
const load_1 = __importDefault(require("./routes/cn/load"));
const asset_1 = __importDefault(require("./routes/cn/asset"));
const web_1 = __importDefault(require("./routes/web"));
const web_api_1 = __importDefault(require("./routes/web_api"));
const seeds_1 = __importDefault(require("./routes/web_api/seeds"));
const seed_validator_1 = __importDefault(require("./lib/seed-validator"));
const reproduce_1 = __importDefault(require("./routes/api/reproduce"));
const tutorial_1 = __importDefault(require("./routes/api/tutorial"));
const gacha_1 = __importDefault(require("./routes/api/gacha"));
const party_1 = __importDefault(require("./routes/api/party"));
const expod_1 = __importDefault(require("./routes/api/expod"));
const storyQuest_1 = __importDefault(require("./routes/api/storyQuest"));
const option_1 = __importDefault(require("./routes/api/option"));
const singleBattleQuest_1 = __importDefault(require("./routes/api/singleBattleQuest"));
const multiBattleQuest_1 = __importDefault(require("./routes/api/multiBattleQuest"));
const attention_1 = __importDefault(require("./routes/api/attention"));
const character_1 = __importDefault(require("./routes/api/character"));
const partyGroup_1 = __importDefault(require("./routes/api/partyGroup"));
const equipment_1 = __importDefault(require("./routes/api/equipment"));
const exBoost_1 = __importDefault(require("./routes/api/exBoost"));
const boxGacha_1 = __importDefault(require("./routes/api/boxGacha"));
const shop_1 = __importDefault(require("./routes/api/shop"));
const exchange_1 = __importDefault(require("./routes/api/exchange"));
const encyclopedia_1 = __importDefault(require("./routes/api/encyclopedia"));
const mail_1 = __importDefault(require("./routes/api/mail"));
const rankingEvent_1 = __importDefault(require("./routes/api/rankingEvent"));
const mission_1 = __importDefault(require("./routes/api/mission"));
const payment_1 = __importDefault(require("./routes/api/payment"));
const news_1 = __importDefault(require("./routes/api/news"));
const raidEvent_1 = __importDefault(require("./routes/api/raidEvent"));
const rushEvent_1 = __importDefault(require("./routes/api/rushEvent"));
const carnivalEvent_1 = __importDefault(require("./routes/api/carnivalEvent"));
const contentsGuide_1 = __importDefault(require("./routes/api/contentsGuide"));
const profile_1 = __importDefault(require("./routes/api/profile"));
const history_1 = __importDefault(require("./routes/api/history"));
const comic_1 = __importDefault(require("./routes/api/comic"));
const questUnlock_1 = __importDefault(require("./routes/api/questUnlock"));
const item_1 = __importDefault(require("./routes/api/item"));
const sessionServer_1 = require("./data/sessionServer");
const fastify = (0, fastify_1.default)({
    logger: {
        level: "info"
    }
});
// Restore saved time offset from active player on startup
(0, activeAccount_1.restoreTimeOffset)();
/**
 * Walk a MsgPack buffer in a single pass. Replaces uint32 tags (0xCE) with
 * int32 (0xD2) for values < 2^31, and with float64 (0xCB) for values ≥ 2^31.
 * All other bytes are copied verbatim.  Handles nested arrays/maps recursively.
 * Returns a new Buffer (may be larger than input when float64 replaces int32).
 */
function fixUint32Tags(buf) {
    const out = Buffer.allocUnsafe(buf.length * 2); // worst-case: all 0xCE → 0xCB (+80%)
    let w = 0; // write position
    const put = (b) => { out[w++] = b; };
    const copy = (off, len) => {
        for (let i = 0; i < len; i++)
            out[w++] = buf[off + i];
    };
    function walk(off) {
        const tag = buf[off];
        let pos = off + 1;
        // positive fixint  0x00..0x7f
        if (tag <= 0x7f) {
            put(tag);
            return pos;
        }
        // negative fixint  0xe0..0xff
        if (tag >= 0xe0) {
            put(tag);
            return pos;
        }
        switch (tag) {
            case 0xc0:
            case 0xc2:
            case 0xc3: // nil / false / true
                put(tag);
                return pos;
            case 0xcc:
            case 0xd0: // uint8 / int8
                copy(off, 2);
                return pos + 1;
            case 0xcd:
            case 0xd1: // uint16 / int16
                copy(off, 3);
                return pos + 2;
            case 0xce: { // uint32 → int32 (< 2^31) or float64 (≥ 2^31)
                const u32 = buf.readUint32BE(pos);
                if (u32 < 0x80000000) {
                    put(0xd2); // int32 tag
                    copy(pos, 4); // data bytes unchanged
                }
                else {
                    put(0xcb); // float64 tag
                    const f64 = Buffer.allocUnsafe(8);
                    f64.writeDoubleBE(u32);
                    for (let j = 0; j < 8; j++)
                        put(f64[j]);
                }
                return pos + 4;
            }
            case 0xd2: // int32
                copy(off, 5);
                return pos + 4;
            case 0xcf:
            case 0xd3: // uint64 / int64
                copy(off, 9);
                return pos + 8;
            case 0xca: // float32
                copy(off, 5);
                return pos + 4;
            case 0xcb: // float64
                copy(off, 9);
                return pos + 8;
            case 0xd9: { // str8
                const len = buf[pos];
                copy(off, 2 + len);
                return pos + 1 + len;
            }
            case 0xda: { // str16
                const len = buf.readUint16BE(pos);
                copy(off, 3 + len);
                return pos + 2 + len;
            }
            case 0xdb: { // str32
                const len = buf.readUint32BE(pos);
                copy(off, 5 + len);
                return pos + 4 + len;
            }
            case 0xc4: { // bin8
                const len = buf[pos];
                copy(off, 2 + len);
                return pos + 1 + len;
            }
            case 0xc5: { // bin16
                const len = buf.readUint16BE(pos);
                copy(off, 3 + len);
                return pos + 2 + len;
            }
            case 0xc6: { // bin32
                const len = buf.readUint32BE(pos);
                copy(off, 5 + len);
                return pos + 4 + len;
            }
            case 0xdc: { // array16
                const count = buf.readUint16BE(pos);
                put(tag);
                put(buf[off + 1]);
                put(buf[off + 2]); // count bytes
                pos += 2;
                for (let i = 0; i < count; i++)
                    pos = walk(pos);
                return pos;
            }
            case 0xdd: { // array32
                const count = buf.readUint32BE(pos);
                put(tag);
                copy(off + 1, 4); // count bytes
                pos += 4;
                for (let i = 0; i < count; i++)
                    pos = walk(pos);
                return pos;
            }
            case 0xde: { // map16
                const count = buf.readUint16BE(pos);
                put(tag);
                put(buf[off + 1]);
                put(buf[off + 2]); // count bytes
                pos += 2;
                for (let i = 0; i < count; i++) {
                    pos = walk(pos);
                    pos = walk(pos);
                }
                return pos;
            }
            case 0xdf: { // map32
                const count = buf.readUint32BE(pos);
                put(tag);
                copy(off + 1, 4); // count bytes
                pos += 4;
                for (let i = 0; i < count; i++) {
                    pos = walk(pos);
                    pos = walk(pos);
                }
                return pos;
            }
            // ext family (copy verbatim)
            case 0xc7: { // ext8
                const len = buf[pos];
                copy(off, 2 + len + 1);
                return pos + 1 + len + 1;
            }
            case 0xc8: { // ext16
                const len = buf.readUint16BE(pos);
                copy(off, 3 + len + 1);
                return pos + 2 + len + 1;
            }
            case 0xc9: { // ext32
                const len = buf.readUint32BE(pos);
                copy(off, 5 + len + 1);
                return pos + 4 + len + 1;
            }
            case 0xd4:
                copy(off, 2);
                return pos + 1; // fixext1
            case 0xd5:
                copy(off, 3);
                return pos + 2; // fixext2
            case 0xd6:
                copy(off, 5);
                return pos + 4; // fixext4
            case 0xd7:
                copy(off, 9);
                return pos + 8; // fixext8
            case 0xd8:
                copy(off, 17);
                return pos + 16; // fixext16
            default: {
                // fixstr   0xa0..0xbf
                if (tag >= 0xa0 && tag <= 0xbf) {
                    const len = tag & 0x1f;
                    copy(off, 1 + len);
                    return pos + len;
                }
                // fixarray 0x90..0x9f
                if (tag >= 0x90 && tag <= 0x9f) {
                    put(tag);
                    const count = tag & 0x0f;
                    for (let i = 0; i < count; i++)
                        pos = walk(pos);
                    return pos;
                }
                // fixmap   0x80..0x8f
                if (tag >= 0x80 && tag <= 0x8f) {
                    put(tag);
                    const count = tag & 0x0f;
                    for (let i = 0; i < count; i++) {
                        pos = walk(pos);
                        pos = walk(pos);
                    }
                    return pos;
                }
                put(tag); // unknown, copy defensively
                return pos;
            }
        }
    }
    let i = 0;
    while (i < buf.length)
        i = walk(i);
    return out.subarray(0, w);
}
fastify.addHook("onSend", (_, reply, payload, done) => {
    try {
        if (reply.getHeader("content-type") === "application/x-msgpack") {
            const packed = fixUint32Tags((0, msgpackr_1.pack)(payload));
            done(null, packed.toString("base64"));
            return;
        }
    }
    catch (_a) { }
    done(null, payload);
});
function jsonParser(_, body, done) {
    try {
        done(null, JSON.parse(body));
    }
    catch (_a) {
        done(null, undefined);
    }
}
fastify.addContentTypeParser("application/x-www-form-urlencoded", { parseAs: "string" }, (_request, body, done) => {
    try {
        done(null, (0, msgpackr_1.unpack)(Buffer.from(body, "base64")));
    }
    catch (_a) {
        try {
            done(null, Object.fromEntries(new URLSearchParams(body)));
        }
        catch (_b) {
            jsonParser(_request, body, done);
        }
    }
});
fastify.addContentTypeParser("application/json", { parseAs: "string" }, jsonParser);
fastify.register(versionCheck_1.default);
fastify.register(leitingAuth_1.default, { prefix: "/api/index.php" });
const apiPrefix = "/api/index.php";
fastify.register(load_1.default, { prefix: apiPrefix });
fastify.register(asset_1.default, { prefix: `${apiPrefix}/asset` });
function stubMsgpackReply(reply, data, playerId) {
    const servertime = playerId ? (0, utils_1.getServerTimeForPlayer)(playerId) : (0, utils_1.getServerTime)();
    reply.header("content-type", "application/x-msgpack");
    reply.status(200).send({
        data_headers: { force_update: false, asset_update: false, short_udid: 0, viewer_id: 0, servertime, result_code: 1 },
        data
    });
}
fastify.post(`${apiPrefix}/assetintitle/version_info_in_title`, (_request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    const { CDN_TOTAL_SIZE, ENTITY_LISTS_DIR } = require("./routes/cn/asset");
    stubMsgpackReply(reply, {
        base_url: `${CDN_BASE_URL}/${ENTITY_LISTS_DIR}/`,
        files_list: `${CDN_BASE_URL}/${ENTITY_LISTS_DIR}/10939-android_medium.csv`,
        total_size: CDN_TOTAL_SIZE,
        delayed_assets_size: 0
    });
}));
fastify.post(`${apiPrefix}/tool/check_social_link_enable`, (_request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    stubMsgpackReply(reply, { enable: false });
}));
// Gift code exchange (礼包码兑换): enable button in menu, exchange not implemented
fastify.post(`${apiPrefix}/tool/check_enable_gift`, (_request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    stubMsgpackReply(reply, { enable_gift: true });
}));
fastify.post(`${apiPrefix}/tool/contact_active`, (_request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    stubMsgpackReply(reply, { enable_customer_service: false });
}));
fastify.post(`${apiPrefix}/tool/custom_notify`, (_request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    stubMsgpackReply(reply, {});
}));
fastify.post(`${apiPrefix}/channels/channel_leiting_pay/query_unfinish_order`, (_request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    stubMsgpackReply(reply, { order_id: "" });
}));
fastify.post(`${apiPrefix}/channels/channel_leiting_pay/query_purcharge`, (_request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    stubMsgpackReply(reply, { status: 3 }); // 3 = purchase success
}));
fastify.post(`${apiPrefix}/channels/channel_leiting_pay/set_unfinish_order_status`, (_request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    stubMsgpackReply(reply, {});
}));
// PassCard (修行之道): get current pass card data
fastify.post(`${apiPrefix}/Pass_card/get_pass_card`, (_request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    stubMsgpackReply(reply, { point: 0, is_buy: false, all_received_record: [] });
}));
// PassCard: claim all available rewards
fastify.post(`${apiPrefix}/Pass_card/receive_all`, (_request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    stubMsgpackReply(reply, { all_received_record: [] });
}));
// Episode trial reading: finish stub (character story trial)
fastify.post(`${apiPrefix}/episode_trial_reading/finish`, (_request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    stubMsgpackReply(reply, {});
}));
fastify.get("/debug", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    var _c;
    const ts = new Date().toISOString();
    const loc = ((_c = request.query) === null || _c === void 0 ? void 0 : _c.loc) || "unknown";
    // Parse C3032 from beacon query string (04e patch sends via CrashUtil.debugBeacon)
    try {
        parseC3032Beacon(loc);
    }
    catch (_) { }
    try {
        parsePlayBeacon(loc);
    }
    catch (_) { }
    reply.status(200).send("OK");
}));
// Parse C3032 from beacon loc string — ★ garbled to â, extract digits via garbled pattern
function parseC3032Beacon(loc) {
    if (!loc.includes("C3032"))
        return;
    const seedMatch = loc.match(/seed=(\d+)/);
    if (!seedMatch)
        return;
    const badSeed = parseInt(seedMatch[1], 10);
    const movieMatch = loc.match(/movie_id=(\w+)/);
    const movieId = movieMatch ? movieMatch[1] : "normal";
    console.log(`[DBG-BCN] C3032 seed=${badSeed} movieId=${movieId}`);
    const starDigits = [...loc.matchAll(/â(\d)/g)];
    // first match = ball rarity (結果レア度), second = char rarity (キャラクターレア度)
    const ballRarity = starDigits.length > 0 ? parseInt(starDigits[0][1], 10) : 3;
    // Extract play= field (0=no animation, 1=played) — APK 04e patch v2
    const playMatch = loc.match(/play=(\d)/);
    const didPlay = playMatch ? playMatch[1] === '1' : null;
    const r = ballRarity - 3; // 0=★3, 1=★4, 2=★5
    if (didPlay !== null)
        seed_validator_1.default.recordPlay(movieId, badSeed, didPlay); // record for flushAll
    // C3032 = client-verified rarity → verifiedPool (superset of playPool/confirmPool)
    console.log(`[DBG-BCN] C3032 → moveToVerified [${movieId}] seed=${badSeed} ★${ballRarity}`);
    seed_validator_1.default.moveToVerified(movieId, badSeed, r);
    if (didPlay === false) {
        console.log(`[DBG-BCN] C3032 → confirm [${movieId}] seed=${badSeed} ★${ballRarity}`);
        seed_validator_1.default.confirm(movieId, badSeed, r); // play=0 → confirmPool
    }
    const playStr = didPlay === true ? ' play=1' : didPlay === false ? ' play=0' : '';
    console.log(`[BEACON] C3032 → ${didPlay === true ? 'play' : 'confirm'} seed ${badSeed} ★${ballRarity}${playStr} [${movieId}]`);
    if (didPlay === null) {
        seed_validator_1.default.addPending(movieId, badSeed, r);
    }
}
// PLAY beacon — every draw reports play=1|0 (APK 04e Patch 5)
// Format: PLAY|play=1|seed=10000001, movie_id=fes
function parsePlayBeacon(loc) {
    if (loc.startsWith("PLAY|")) {
        const seedMatch = loc.match(/seed=(\d+)/);
        if (!seedMatch) {
            console.log(`[PLAY] no seed in: ${loc.substring(0, 80)}`);
            return;
        }
        const seed = parseInt(seedMatch[1], 10);
        const movieMatch = loc.match(/movie_id=(\w+)/);
        const movieId = movieMatch ? movieMatch[1] : "normal";
        const playMatch = loc.match(/play=(\d)/);
        const didPlay = playMatch ? playMatch[1] === '1' : false;
        console.log(`[DBG-BCN] PLAY seed=${seed} play=${didPlay ? '1' : '0'} movieId=${movieId}`);
        seed_validator_1.default.recordPlay(movieId, seed, didPlay); // record for flushAll
        if (didPlay) {
            const r = seed_validator_1.default.getSentR(movieId, seed);
            if (r !== undefined && r !== null) {
                seed_validator_1.default.addPlay(movieId, seed, r, true);
                seed_validator_1.default.moveToVerified(movieId, seed, r);
                console.log(`[PLAY] playPool seed=${seed} movie=${movieId}`);
            }
            else {
                console.log(`[PLAY] play=1 skipped seed=${seed} getSentR=${r === null ? 'null' : 'undefined'} (already cleaned up by prior beacon)`);
            }
        }
        else {
            const r = seed_validator_1.default.getSentR(movieId, seed);
            console.log(`[DBG-BCN] PLAY play=0 → confirm [${movieId}] seed=${seed} r=${r !== undefined && r !== null ? '★' + (r + 3) : r === null ? 'null' : 'undefined'}`);
            if (r !== undefined)
                seed_validator_1.default.confirm(movieId, seed, r);
        }
    }
}
fastify.post("/debug", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    var _d;
    const ts = new Date().toISOString();
    const loc = ((_d = request.body) === null || _d === void 0 ? void 0 : _d.loc) || "unknown";
    console.log(`[BEACON ${ts}] ${loc}`);
    // Parse C3032 beacons for auto-purification (04e patch skips throw but keeps beacon)
    try {
        parseC3032Beacon(loc);
    }
    catch (_) { }
    reply.status(200).send("OK");
}));
fastify.post("/crash", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    // Log crash (truncated to avoid log explosion)
    const bodyStr = JSON.stringify(request.body);
    console.log(`[CRASH] ${bodyStr.substring(0, 2000)}`);
    // Parse C3032 gacha seed mismatches and auto-block bad seeds
    try {
        const seedMatch = bodyStr.match(/seed=(\d+)/);
        if (seedMatch && bodyStr.includes("C3032")) {
            const badSeed = parseInt(seedMatch[1], 10);
            const ballMatch = bodyStr.match(/結果レア度=★(\d)/);
            const ballRarity = ballMatch ? parseInt(ballMatch[1], 10) : 0;
            const r = ballRarity - 3;
            const movieMatch = bodyStr.match(/movie_id=(\w+)/);
            const movieId = movieMatch ? movieMatch[1] : "normal";
            // Crash path: no play= info → pendingPlay (rarity known, play unknown)
            if (r >= 0 && r <= 2)
                seed_validator_1.default.addPending(movieId, badSeed, r);
            console.log(`[CRASH] seed ${badSeed} device★${ballRarity} movie=${movieId}`);
        }
    }
    catch (e) { }
    reply.status(200).send("OK");
}));
fastify.register(tool_1.default, { prefix: `${apiPrefix}/tool` });
fastify.register(reproduce_1.default, { prefix: `${apiPrefix}/reproduce` });
fastify.register(tutorial_1.default, { prefix: `${apiPrefix}/tutorial` });
fastify.register(gacha_1.default, { prefix: `${apiPrefix}/gacha` });
fastify.register(party_1.default, { prefix: `${apiPrefix}/party` });
fastify.register(expod_1.default, { prefix: `${apiPrefix}/expod` });
fastify.register(storyQuest_1.default, { prefix: `${apiPrefix}/story_quest` });
fastify.register(option_1.default, { prefix: `${apiPrefix}/option` });
fastify.register(singleBattleQuest_1.default, { prefix: `${apiPrefix}/single_battle_quest` });
fastify.register(multiBattleQuest_1.default, { prefix: `${apiPrefix}/multi_battle_quest` });
fastify.register(attention_1.default, { prefix: `${apiPrefix}/attention` });
fastify.register(character_1.default, { prefix: `${apiPrefix}/character` });
fastify.register(partyGroup_1.default, { prefix: `${apiPrefix}/party_group` });
fastify.register(equipment_1.default, { prefix: `${apiPrefix}/equipment` });
fastify.register(exBoost_1.default, { prefix: `${apiPrefix}/ex_boost` });
fastify.register(boxGacha_1.default, { prefix: `${apiPrefix}/box_gacha` });
fastify.register(shop_1.default, { prefix: `${apiPrefix}/shop` });
fastify.register(exchange_1.default, { prefix: `${apiPrefix}/exchange` });
fastify.register(encyclopedia_1.default, { prefix: `${apiPrefix}/encyclopedia` });
fastify.register(mail_1.default, { prefix: `${apiPrefix}/mail` });
fastify.register(rankingEvent_1.default, { prefix: `${apiPrefix}/ranking_event` });
fastify.register(mission_1.default, { prefix: `${apiPrefix}/mission` });
fastify.register(payment_1.default, { prefix: `${apiPrefix}/payment` });
fastify.register(news_1.default, { prefix: `${apiPrefix}/news` });
fastify.register(raidEvent_1.default, { prefix: `${apiPrefix}/event/raid` });
fastify.register(rushEvent_1.default, { prefix: `${apiPrefix}/event/rush` });
fastify.register(carnivalEvent_1.default, { prefix: `${apiPrefix}/carnival_event` });
fastify.register(contentsGuide_1.default, { prefix: `${apiPrefix}/contents_guide` });
fastify.register(profile_1.default, { prefix: `${apiPrefix}/profile` });
fastify.register(history_1.default, { prefix: `${apiPrefix}/history` });
fastify.register(comic_1.default, { prefix: `${apiPrefix}/comic` });
fastify.register(questUnlock_1.default, { prefix: `${apiPrefix}/quest` });
fastify.register(item_1.default, { prefix: `${apiPrefix}/item` });
// Web management panel
fastify.register(web_1.default);
fastify.register(web_api_1.default, { prefix: "/api" });
fastify.register(seeds_1.default, { prefix: "/api/seeds" });
const cdnHost = process.env.CN_LISTEN_HOST || "localhost";
const cdnPort = process.env.CN_LISTEN_PORT || "8001";
const cdnDisplayHost = cdnHost === "0.0.0.0" ? "localhost" : cdnHost;
const CDN_BASE_URL = process.env.CDN_BASE_URL || `http://${cdnDisplayHost}:${cdnPort}/patch/cn`;
const cdnDir = process.env.CDN_DIR || ".cdn";
fastify.register(static_1.default, {
    root: path_1.default.isAbsolute(cdnDir) ? cdnDir : path_1.default.join(__dirname, "..", cdnDir),
    prefix: "/patch",
    decorateReply: false
});
// Web static assets
fastify.register(static_1.default, {
    root: path_1.default.join(__dirname, "..", "web", "public"),
    prefix: "/public",
    decorateReply: false
});
// Catch-all to log unknown endpoints
fastify.setNotFoundHandler((request, reply) => {
    console.log(`[UNKNOWN] ${request.method} ${request.url}`);
    reply.status(404).send({ error: "Not Found" });
});
const host = (_a = process.env.CN_LISTEN_HOST) !== null && _a !== void 0 ? _a : "0.0.0.0";
const port = parseInt((_b = process.env.CN_LISTEN_PORT) !== null && _b !== void 0 ? _b : "8001");
fastify.listen({ port, host }, (err, address) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(`CN StarPoint listening on http://${host}:${port}`);
    // Start multi battle TCP session server
    (0, sessionServer_1.startSessionServer)();
});
