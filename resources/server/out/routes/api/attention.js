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
const wdfpData_1 = require("../../data/wdfpData");
const activeAccount_1 = require("../../data/activeAccount");
const utils_1 = require("../../utils");
const routes = (fastify) => __awaiter(void 0, void 0, void 0, function* () {
    fastify.post("/check", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        if (!viewerId || isNaN(viewerId))
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Invalid request body."
            });
        const viewerIdSession = yield (0, wdfpData_1.getSession)(viewerId.toString());
        if (!viewerIdSession)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Invalid viewer id."
            });
        // get player
        const playerId = (0, activeAccount_1.resolvePlayerIdSync)(viewerIdSession.accountId);
        const player = playerId !== null ? (0, wdfpData_1.getPlayerSync)(playerId) : null;
        if (player === null)
            return reply.status(500).send({
                "error": "Internal Server Error",
                "message": "No players bound to account."
            });
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({
                viewer_id: viewerId
            }),
            "data": {
                "config": {
                    "attention_recruitment_interval_seconds": 15,
                    "attention_recruitment_redeliver_limit": 20,
                    "attention_polling_interval_seconds_normal": 10,
                    "attention_polling_interval_seconds_battle": 15,
                    "multi_attention_lifetime_seconds": 30,
                    "contribution_score_rate_to_parasite": 0.25,
                    "attention_log_interval_seconds": 600,
                    "disable_finish_duration_seconds": 5,
                    "disable_decline_count_seconds": 60,
                    "disable_decline_count_limit": 14,
                    "disable_decline_duration_seconds": 30,
                    "disable_intent_disconnect_duration_seconds": 300,
                    "disable_unintent_disconnect_duration_seconds": 5,
                    "disable_remote_error_duration_seconds": 300,
                    "attention_animation_time_seconds": 6,
                    "disable_expire_count_limit": 4,
                    "disable_expire_duration_seconds": 180,
                    "polling_delay_normal_seconds_range_min": 1,
                    "polling_delay_normal_seconds_range_max": 10,
                    "polling_delay_battle_seconds_range_min": 1,
                    "polling_delay_battle_seconds_range_max": 15,
                    "return_attention_max_num": 3
                }
            }
        });
    }));
    // ---- action (stub: NPC-only, no real matching) ----
    fastify.post("/action", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        const body = request.body;
        const viewerId = body.viewer_id;
        if (!viewerId || isNaN(viewerId)) {
            console.log(`[ATTENTION] action: 400 invalid viewer_id=${viewerId}`);
            return reply.status(400).send({
                "error": "Bad Request", "message": "Invalid request body."
            });
        }
        console.log(`[ATTENTION] action: viewer=${viewerId} factors=${(_b = (_a = body.priority_factors) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0}`);
        console.log(`[ATTENTION] action: factors_detail=${JSON.stringify(body.priority_factors)}`);
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
            "data": {
                "priority_action_score": 0,
                "priority_playing_score": 0
            }
        });
    }));
    // ---- logger (stub: NPC-only, discard logs) ----
    fastify.post("/logger", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _c, _d;
        const body = request.body;
        const viewerId = body.viewer_id;
        if (!viewerId || isNaN(viewerId)) {
            console.log(`[ATTENTION] logger: 400 invalid viewer_id=${viewerId}`);
            return reply.status(400).send({
                "error": "Bad Request", "message": "Invalid request body."
            });
        }
        console.log(`[ATTENTION] logger: viewer=${viewerId} logs=${(_d = (_c = body.client_logs) === null || _c === void 0 ? void 0 : _c.length) !== null && _d !== void 0 ? _d : 0}`);
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
            "data": {}
        });
    }));
});
exports.default = routes;
