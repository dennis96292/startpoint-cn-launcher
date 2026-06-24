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
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../../utils");
const wdfpData_1 = require("../../data/wdfpData");
const utils_2 = require("../../data/utils");
const activeAccount_1 = require("../../data/activeAccount");
const multiRoom_1 = require("../../data/multiRoom");
function wrapOptionFields(d, resVer) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
    var _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3;
    // Align with CN CDN version from client res_ver header, fallback to .env CN_RES_VERSION
    d.available_asset_version = resVer || process.env.CN_RES_VERSION || "1.4.54";
    if (d.user_info) {
        if (typeof d.user_info.last_login_time === 'number') {
            const dt = new Date(d.user_info.last_login_time * 1000);
            const p = (n) => n.toString().padStart(2, '0');
            d.user_info.last_login_time = `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())} ${p(dt.getHours())}:${p(dt.getMinutes())}:${p(dt.getSeconds())}`;
        }
        (_a = (_q = d.user_info).is_bought_fund_ex_quest) !== null && _a !== void 0 ? _a : (_q.is_bought_fund_ex_quest = false);
        (_b = (_r = d.user_info).is_bought_fund_main_quest) !== null && _b !== void 0 ? _b : (_r.is_bought_fund_main_quest = false);
        (_c = (_s = d.user_info).is_bought_fund_laite) !== null && _c !== void 0 ? _c : (_s.is_bought_fund_laite = false);
        (_d = (_t = d.user_info).is_bought_fund_laite2) !== null && _d !== void 0 ? _d : (_t.is_bought_fund_laite2 = false);
        (_e = (_u = d.user_info).is_bought_fund_laite3) !== null && _e !== void 0 ? _e : (_u.is_bought_fund_laite3 = false);
        (_f = (_v = d.user_info).is_newbie) !== null && _f !== void 0 ? _f : (_v.is_newbie = true);
        (_g = (_w = d.user_info).is_comeback) !== null && _g !== void 0 ? _g : (_w.is_comeback = false);
        (_h = (_x = d.user_info).month_card_remain_days) !== null && _h !== void 0 ? _h : (_x.month_card_remain_days = 0);
        (_j = (_y = d.user_info).weekly_bonus_remain_days) !== null && _j !== void 0 ? _j : (_y.weekly_bonus_remain_days = 0);
        (_k = (_z = d.user_info).monthly_payment_total) !== null && _k !== void 0 ? _k : (_z.monthly_payment_total = 0);
        (_l = (_0 = d.user_info).renewal_gift_remain_days) !== null && _l !== void 0 ? _l : (_0.renewal_gift_remain_days = 0);
    }
    if (d.user_option) {
        (_m = (_1 = d.user_option).episode_encyclopedia_suggest_show) !== null && _m !== void 0 ? _m : (_1.episode_encyclopedia_suggest_show = false);
        (_o = (_2 = d.user_option).server_push) !== null && _o !== void 0 ? _o : (_2.server_push = false);
        (_p = (_3 = d.user_option).stamina) !== null && _p !== void 0 ? _p : (_3.stamina = false);
    }
    d.cn_crash_url = `http://${(0, multiRoom_1.getDisplayHost)()}:${process.env.CN_LISTEN_PORT || "8001"}/crash`;
    d.survey_url = "";
    d.qq_group_url = "";
    d.bug_report_url = "";
    d.enable_gift = false;
    d.enable_customer_service = false;
    d.enable_rename = true;
    d.enable_delete_file = false;
    d.enable_newbie = false;
    d.enable_little_assistant = false;
    d.mission_tips = false;
    d.monthly_tip = false;
    d.simple_payment_item_list = [];
    d.ex_boost_draw_result = null;
    d.pass_force_reward = false;
    d.crazy_gacha_result_list = [];
    d.last_crazy_gacha_draw_result = [];
    d.fund_receive_list = [];
    d.login_info = {};
    d.tower_dungeon_list = [];
    d.special_exchange_campaign_list = [];
    d.win_lottery_active_mission_list = [];
    d.stars_gacha_campaign_list = [];
    d.favorite_party_group_list = [];
    d.ranking_event_reward = [];
    d.party_list = [];
    d.payment_rebate_info = { expired_time: 0, status: 0, start_time: 0 };
    d.monthly_charge_bonus_info = { bonus_days: 0, expired_time: 0, init_time: 0, status: 0, start_time: 0 };
    d.comeback_campaign_boss_boost = { period_start_time: 0, period_end_time: 0 };
    return d;
}
const routes = (fastify) => __awaiter(void 0, void 0, void 0, function* () {
    fastify.post("/load", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        try {
            const body = request.body;
            const accountId = body.viewer_id || body.keychain || 1;
            const playerId = (0, activeAccount_1.resolvePlayerIdSync)(accountId);
            if (!playerId) {
                return reply.status(400).send({ error: "Bad Request", message: "No player found" });
            }
            const player = (0, wdfpData_1.getPlayerSync)(playerId);
            if (player === null) {
                return reply.status(500).send({ error: "Internal Server Error", message: "No player data." });
            }
            const now = (0, utils_1.getServerDate)();
            (0, wdfpData_1.dailyResetPlayerDataSync)(player, now);
            (0, wdfpData_1.collectPlayerDataPooledExpSync)(player, now);
            // 若自定义时间与 lastLogin 不同步，强制对齐（防止客户端弹"日期变了"）
            if (now.toDateString() !== player.lastLoginTime.toDateString()) {
                (0, wdfpData_1.updatePlayerSync)({ id: player.id, lastLoginTime: now });
            }
            const clientData = (0, utils_2.getClientSerializedData)(playerId, { viewerId: accountId });
            if (clientData === null) {
                return reply.status(500).send({ error: "Internal Server Error", message: "No player data." });
            }
            const resVer = request.headers['res_ver'];
            console.log(`[CN-LOAD] res_ver=${resVer || '(not sent)'} account=${accountId} player=${playerId} party_slot=${(_a = clientData === null || clientData === void 0 ? void 0 : clientData.user_info) === null || _a === void 0 ? void 0 : _a.party_slot}`);
            wrapOptionFields(clientData, resVer);
            // Inject unfinished quest lists for battle recovery
            const activeQuest = (0, wdfpData_1.getPlayerActiveQuestSync)(playerId);
            if (activeQuest) {
                const entry = { play_id: activeQuest.playId, continue_count: activeQuest.continueCount };
                if (activeQuest.isMulti) {
                    clientData.unfinished_quest_list = [];
                    clientData.unfinished_multi_quest_list = [entry];
                }
                else {
                    clientData.unfinished_quest_list = [entry];
                    clientData.unfinished_multi_quest_list = [];
                }
            }
            else {
                clientData.unfinished_quest_list = [];
                clientData.unfinished_multi_quest_list = [];
            }
            reply.header("content-type", "application/x-msgpack");
            reply.status(200).send({
                data_headers: (0, utils_1.generateDataHeaders)({
                    asset_update: true,
                    viewer_id: accountId,
                    servertime: (0, utils_1.getServerTime)(),
                }),
                data: clientData
            });
        }
        catch (e) {
            console.error(`[CN-LOAD] ERROR:`, e.message, e.stack);
            return reply.status(500).send({ error: "Internal Server Error", message: e.message });
        }
    }));
});
exports.default = routes;
