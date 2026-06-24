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
const assets_1 = require("../../lib/assets");
const quest_1 = require("../../lib/quest");
const utils_1 = require("../../utils");
function processStoryQuestFinish(playerId, viewerId, questSection, questId) {
    const playerData = (0, wdfpData_1.getPlayerSync)(playerId);
    if (playerData === null)
        return null;
    const questData = (0, assets_1.getQuestFromCategorySync)(questSection, questId);
    if (questData === null) {
        console.log(`[STORY] quest not found: category=${questSection} questId=${questId}`);
        return null;
    }
    if (questData.sPlusReward !== undefined) {
        console.log(`[STORY] battle quest rejected: category=${questSection} questId=${questId}`);
        return null;
    }
    const questProgress = (0, wdfpData_1.getPlayerSingleQuestProgressSync)(playerId, questSection, questId);
    const finished = questProgress !== null ? questProgress.finished : false;
    const rewardResult = !finished && questData.clearReward !== undefined ? (0, quest_1.givePlayerRewardSync)(playerId, questData.clearReward) : null;
    if (!finished) {
        if (questProgress === null) {
            (0, wdfpData_1.insertPlayerQuestProgressSync)(playerId, questSection, {
                questId: questId,
                finished: true,
                clearRank: 5
            });
        }
        else {
            (0, wdfpData_1.updatePlayerQuestProgressSync)(playerId, questSection, {
                questId: questId,
                finished: true,
                clearRank: 5
            });
        }
    }
    return {
        data: !finished ? {
            "user_info": {
                "free_vmoney": playerData.freeVmoney + ((rewardResult === null || rewardResult === void 0 ? void 0 : rewardResult.user_info.free_vmoney) || 0),
                "free_mana": playerData.freeMana + ((rewardResult === null || rewardResult === void 0 ? void 0 : rewardResult.user_info.free_mana) || 0)
            },
            "character_list": (rewardResult === null || rewardResult === void 0 ? void 0 : rewardResult.character_list) || [],
            "joined_character_id_list": (rewardResult === null || rewardResult === void 0 ? void 0 : rewardResult.joined_character_id_list) || [],
            "equipment_list": (rewardResult === null || rewardResult === void 0 ? void 0 : rewardResult.equipment_list) || [],
            "items": (rewardResult === null || rewardResult === void 0 ? void 0 : rewardResult.items) || {},
            "presigned_quest_category": []
        } : []
    };
}
const routes = (fastify) => __awaiter(void 0, void 0, void 0, function* () {
    fastify.post("/finish", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
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
        const playerId = (0, activeAccount_1.resolvePlayerIdSync)(viewerIdSession.accountId);
        if (playerId === null)
            return reply.status(500).send({
                "error": "Internal Server Error",
                "message": "No player bound to account."
            });
        const result = processStoryQuestFinish(playerId, viewerId, body.category, body.quest_id);
        if (result === null)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Invalid quest ID provided."
            });
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
            "data": result.data
        });
    }));
    // finish_with_skip — NPC helper auto-complete (no score/statistics)
    fastify.post("/finish_with_skip", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
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
        const playerId = (0, activeAccount_1.resolvePlayerIdSync)(viewerIdSession.accountId);
        if (playerId === null)
            return reply.status(500).send({
                "error": "Internal Server Error",
                "message": "No player bound to account."
            });
        const result = processStoryQuestFinish(playerId, viewerId, body.category, body.quest_id);
        if (result === null)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Invalid quest ID provided."
            });
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
            "data": result.data
        });
    }));
});
exports.default = routes;
