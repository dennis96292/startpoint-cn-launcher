"use strict";
// Handles mail.
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
const utils_1 = require("../../utils");
const types_1 = require("../../lib/types");
const activeAccount_1 = require("../../data/activeAccount");
const rankingEventIdQuestMap = {
    [1]: 1001,
    [2]: 2001,
    [3]: 3001,
    [4]: 4001,
    [5]: 5001,
    [1000]: 1000001,
    [1001]: 1001001
};
const rankingEventTopTimesMs = {
    [1]: 54410,
    [2]: 25800,
    [3]: 18880,
    [4]: 31720,
    [5]: 6540
};
/**
 * Generates a ranking summary for a specific player & ranking event.
 *
 * @param playerId
 * @param eventId
 * @returns
 */
function getRankingSummary(playerId, eventId) {
    var _a, _b, _c, _d;
    // get quest
    const questId = rankingEventIdQuestMap[eventId];
    if (questId === undefined)
        return null;
    const topTime = (_a = rankingEventTopTimesMs[eventId]) !== null && _a !== void 0 ? _a : 0;
    // get data for the ranking quest
    const playerQuestData = (0, wdfpData_1.getPlayerSingleQuestProgressSync)(playerId, types_1.QuestCategory.RANKING_EVENT_SINGLE, questId);
    const isAccomplished = playerQuestData !== null && playerQuestData.bestElapsedTimeMs !== undefined && playerQuestData.bestElapsedTimeMs !== null;
    return {
        "best_record": {
            "elapsed_time_ms": isAccomplished ? (_b = playerQuestData.bestElapsedTimeMs) !== null && _b !== void 0 ? _b : 0 : 0,
            "is_accomplished": isAccomplished,
            "score": isAccomplished ? (_c = playerQuestData.highScore) !== null && _c !== void 0 ? _c : 0 : 0
        },
        "leader_character_evolution_img_level": 1,
        "leader_character_id": 1,
        "rank_border_top": {
            "elapsed_time_ms": topTime,
            "is_accomplished": true,
            "score": 1110111
        },
        "rank_percentage": isAccomplished ? 1 - (topTime / ((_d = playerQuestData.bestElapsedTimeMs) !== null && _d !== void 0 ? _d : 1)) : 100
    };
}
const routes = (fastify) => __awaiter(void 0, void 0, void 0, function* () {
    fastify.post("/get_summary", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        const eventId = body.ranking_event_id;
        if (isNaN(viewerId) || isNaN(eventId))
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
        if (playerId === null)
            return reply.status(500).send({
                "error": "Internal Server Error",
                "message": "No player bound to account."
            });
        // get summary
        const summary = getRankingSummary(playerId, eventId);
        if (summary === null)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": `Summary could not be generated for '${eventId}' and PlayerId '${playerId}'.`
            });
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({
                viewer_id: viewerId
            }),
            "data": summary
        });
    }));
    fastify.post("/receive_reward", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        const eventId = body.ranking_event_id;
        if (isNaN(viewerId) || isNaN(eventId))
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
        // get player id
        const playerId = (0, activeAccount_1.resolvePlayerIdSync)(viewerIdSession.accountId);
        if (playerId === null)
            return reply.status(500).send({
                "error": "Internal Server Error",
                "message": "No player bound to account."
            });
        // get summary
        const summary = getRankingSummary(playerId, eventId);
        if (summary === null)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": `Summary could not be generated for '${eventId}' and PlayerId '${playerId}'.`
            });
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({
                viewer_id: viewerId
            }),
            "data": Object.assign({ "status": 1 }, summary)
        });
    }));
});
exports.default = routes;
