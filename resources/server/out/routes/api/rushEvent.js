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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rushEventFolderMaxRounds = void 0;
const types_1 = require("../../data/types");
const wdfpData_1 = require("../../data/wdfpData");
const assets_1 = require("../../lib/assets");
const types_2 = require("../../lib/types");
const utils_1 = require("../../utils");
const singleBattleQuest_1 = require("./singleBattleQuest");
const rush_1 = require("../../lib/rush");
const utils_2 = require("../../data/utils");
const activeAccount_1 = require("../../data/activeAccount");
const rush_event_ranking_reward_json_1 = __importDefault(require("../../../assets/rush_event_ranking_reward.json"));
var ResetQuestType;
(function (ResetQuestType) {
    ResetQuestType[ResetQuestType["EMPTY"] = 0] = "EMPTY";
    ResetQuestType[ResetQuestType["FOLDER"] = 1] = "FOLDER";
    ResetQuestType[ResetQuestType["ENDLESS"] = 2] = "ENDLESS";
})(ResetQuestType || (ResetQuestType = {}));
const rankingRewards = rush_event_ranking_reward_json_1.default;
exports.rushEventFolderMaxRounds = {
    [types_2.RushEventFolder.INTERMEDIATE]: 2,
    [types_2.RushEventFolder.ADVANCED]: 2,
    [types_2.RushEventFolder.GODLY]: 2
};
const routes = (fastify) => __awaiter(void 0, void 0, void 0, function* () {
    fastify.post("/summary", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        const body = request.body;
        const viewerId = body.viewer_id;
        const eventId = body.event_id;
        console.log(`[RUSH] summary: viewer=${viewerId} eventId=${eventId}`);
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
        // get rush event data
        let rushEventData = (0, wdfpData_1.getPlayerRushEventSync)(playerId, eventId);
        if (rushEventData === null) {
            rushEventData = (0, wdfpData_1.getDefaultPlayerRushEventSync)(eventId);
            (0, wdfpData_1.insertPlayerRushEventSync)(playerId, rushEventData);
        }
        // get cleared folder id list
        const clearedFolderIdList = (0, wdfpData_1.getPlayerRushEventClearedFoldersSync)(playerId, eventId);
        // get serialized parties
        const serializedPlayedParties = (0, rush_1.getSerializedPlayerRushEventPlayedPartiesSync)(playerId, eventId);
        console.log(`[RUSH] summary: folderParties=${Object.keys((_a = serializedPlayedParties.folderParties) !== null && _a !== void 0 ? _a : {}).length} endlessParties=${Object.keys((_b = serializedPlayedParties.endlessParties) !== null && _b !== void 0 ? _b : {}).length}`);
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({
                viewer_id: viewerId
            }),
            "data": {
                "endless_battle_next_round": rushEventData.endlessBattleNextRound,
                "endless_battle_max_round": rushEventData.endlessBattleMaxRound,
                "active_rush_battle_folder_id": rushEventData.activeRushBattleFolderId,
                "endless_battle_played_max_round": rushEventData.endlessBattleMaxRound,
                "cleared_folder_id_list": clearedFolderIdList,
                "endless_battle_played_party_list": serializedPlayedParties.endlessParties,
                "rush_battle_played_party_list": serializedPlayedParties.folderParties,
                "endless_battle_my_ranking": (0, rush_1.getPlayerRushEventEndlessBattleRankingSync)(playerId, eventId, {
                    rushEventData: rushEventData
                }),
                "aggregated_time": (0, utils_2.clientSerializeDate)((0, utils_1.getServerDate)()),
            }
        });
    }));
    fastify.post("/select_folder", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        const eventId = body.event_id;
        const folderId = body.folder_id;
        console.log(`[RUSH] select_folder: viewer=${viewerId} eventId=${eventId} folderId=${folderId}`);
        if (isNaN(viewerId) || isNaN(eventId) || isNaN(folderId))
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
        // get existing rush event data 
        const rushEventData = (0, wdfpData_1.getPlayerRushEventSync)(playerId, eventId);
        if (rushEventData === null)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": `No rush event data for rush event with id '${eventId}'`
            });
        // Error if a folder has already been selected
        if (rushEventData.activeRushBattleFolderId !== null)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Already selected a folder for this rush event."
            });
        // update folder
        (0, wdfpData_1.updatePlayerRushEventSync)(playerId, {
            eventId: eventId,
            activeRushBattleFolderId: folderId
        });
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({
                viewer_id: viewerId
            }),
            "data": {
                "folder_id": folderId,
                "event_id": eventId
            }
        });
    }));
    fastify.post("/ranking", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _c;
        const body = request.body;
        const viewerId = body.viewer_id;
        const eventId = body.event_id;
        const page = (_c = body.page) !== null && _c !== void 0 ? _c : 0;
        console.log(`[RUSH] ranking: viewer=${viewerId} eventId=${eventId} page=${page}`);
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
        // get player endless rank
        const endlessRanking = (0, rush_1.getPlayerRushEventEndlessBattleRankingSync)(playerId, eventId);
        // get all rankings for page
        const rankings = (0, wdfpData_1.getRushEventEndlessRankingListSync)(eventId, page);
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({
                viewer_id: viewerId
            }),
            "data": {
                "aggregated_time": (0, utils_2.clientSerializeDate)((0, utils_1.getServerDate)()),
                "current_page": page + 1,
                "page_max": rankings.pageMax,
                "my_data": endlessRanking,
                "ranking_data": rankings.list
            }
        });
    }));
    fastify.post("/ranking/played_party", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _d;
        const body = request.body;
        const viewerId = body.viewer_id;
        const eventId = body.event_id;
        const rankNumber = body.rank_number;
        if (isNaN(viewerId) || isNaN(eventId) || isNaN(rankNumber))
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
        // get party list
        const partyList = (_d = (0, rush_1.getRushEventEndlessBattleRankPlayedPartyListSync)(rankNumber, eventId)) !== null && _d !== void 0 ? _d : [];
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({
                viewer_id: viewerId
            }),
            "data": {
                "rush_ranking_party": partyList
            }
        });
    }));
    fastify.post("/aggregated_time", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        const eventId = body.event_id;
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
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({
                viewer_id: viewerId
            }),
            "data": {
                "aggregated_time": (0, utils_2.clientSerializeDate)((0, utils_1.getServerDate)())
            }
        });
    }));
    fastify.post("/party", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        if (isNaN(viewerId))
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
        // get parties
        let playerPartyGroups = (0, wdfpData_1.getPlayerPartyGroupListSync)(playerId, types_1.PartyCategory.EVENT);
        console.log(`[RUSH] party: EVENT groups=${Object.keys(playerPartyGroups).length}`);
        if (0 >= Object.keys(playerPartyGroups).length) {
            console.log(`[RUSH] party: creating default EVENT parties`);
            playerPartyGroups = (0, wdfpData_1.getDefaultPlayerPartyGroupsSync)(types_1.PartyCategory.EVENT);
            (0, wdfpData_1.insertPlayerPartyGroupListSync)(playerId, playerPartyGroups);
        }
        // convert to proper format
        const userPartyGroupList = [];
        for (const [idString, group] of Object.entries(playerPartyGroups)) {
            const partyList = [];
            // convert parties
            for (const [partyIdString, party] of Object.entries(group.list)) {
                partyList.push({
                    ability_soul_ids: party.abilitySoulIds,
                    character_ids: party.characterIds,
                    equipment_ids: party.equipmentIds,
                    unison_character_ids: party.unisonCharacterIds,
                    options: {
                        allow_other_players_to_heal_me: party.options.allowOtherPlayersToHealMe
                    },
                    party_edited: party.edited,
                    party_id: Number(partyIdString),
                    party_name: party.name
                });
            }
            userPartyGroupList.push({
                "party_group_color_id": group.colorId,
                "party_group_id": Number(idString),
                "party_list": partyList
            });
        }
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({
                viewer_id: viewerId
            }),
            "data": {
                "user_party_group_list": userPartyGroupList
            }
        });
    }));
    fastify.post("/battle/start", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        const isAutoStartMode = body.is_auto_start_mode;
        const partyId = body.party_id;
        const questId = body.quest_id;
        console.log(`[RUSH] battle/start: viewer=${viewerId} questId=${questId} partyId=${partyId} autoStart=${isAutoStartMode}`);
        if (isNaN(viewerId) || isNaN(partyId) || isNaN(questId) || isAutoStartMode === undefined)
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
        // get quest
        const questData = (0, assets_1.getQuestFromCategorySync)(types_2.QuestCategory.RUSH_EVENT, questId);
        if (questData === null || !('rankPointReward' in questData) || questData.rushEventId === undefined)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Quest doesn't exist."
            });
        // insert active quest for '/single_battle_quest/finish' endpoint
        (0, singleBattleQuest_1.insertActiveQuest)(playerId, {
            questId: questId,
            category: types_2.QuestCategory.RUSH_EVENT,
            useBoostPoint: false,
            useBossBoostPoint: false,
            isAutoStartMode: isAutoStartMode,
            isMulti: false,
            playId: body.play_id,
            continueCount: 0
        });
        const headers = (0, utils_1.generateDataHeaders)({
            viewer_id: viewerId
        });
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": headers,
            "data": {
                "user_info": {
                    "last_main_quest_id": body.quest_id
                },
                "is_multi": "single",
                "start_time": headers['servertime'],
                "quest_name": ""
            }
        });
    }));
    fastify.post("/reset", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        const eventId = body.event_id;
        const questType = body.quest_type;
        const resetTargetId = body.reset_target_id;
        const isResetAfterTargetRound = body.is_reset_after_target_round;
        console.log(`[RUSH] reset: viewer=${viewerId} eventId=${eventId} questType=${questType} resetTargetId=${resetTargetId} isResetAfterTarget=${isResetAfterTargetRound}`);
        if (isNaN(viewerId) || isNaN(eventId) || isNaN(questType))
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
        if (questType === ResetQuestType.FOLDER) {
            // if reset target was provided, we're not resetting the entire folder
            if (resetTargetId !== undefined) {
                (0, wdfpData_1.deletePlayerRushEventPlayedPartiesUntilSync)(playerId, eventId, types_1.RushEventBattleType.FOLDER, resetTargetId);
            }
            else {
                // reset entire folder
                // update the active folder value
                (0, wdfpData_1.updatePlayerRushEventSync)(playerId, {
                    eventId: eventId,
                    activeRushBattleFolderId: null
                });
                // delete played parties
                (0, wdfpData_1.deletePlayerRushEventPlayedPartyListSync)(playerId, eventId, types_1.RushEventBattleType.FOLDER);
            }
        }
        else if (resetTargetId !== undefined) {
            // endless battle resetting
            if (isResetAfterTargetRound) {
                // "reset up until here"
                (0, wdfpData_1.deletePlayerRushEventPlayedPartiesUntilSync)(playerId, eventId, types_1.RushEventBattleType.ENDLESS, resetTargetId);
            }
            else {
                // "reset only here"
                (0, wdfpData_1.deletePlayerRushEventPlayedPartySync)(playerId, eventId, resetTargetId, types_1.RushEventBattleType.ENDLESS);
            }
        }
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({
                viewer_id: viewerId
            }),
            "data": []
        });
    }));
    // ---- reward ----
    fastify.post("/reward", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _e, _f;
        const body = request.body;
        const viewerId = body.viewer_id;
        const eventId = body.event_id;
        console.log(`[RUSH] reward: viewer=${viewerId} eventId=${eventId}`);
        if (!viewerId || isNaN(viewerId) || isNaN(eventId))
            return reply.status(400).send({
                "error": "Bad Request", "message": "Invalid request body."
            });
        const viewerIdSession = yield (0, wdfpData_1.getSession)(viewerId.toString());
        if (!viewerIdSession)
            return reply.status(400).send({
                "error": "Bad Request", "message": "Invalid viewer id."
            });
        const playerId = (0, activeAccount_1.resolvePlayerIdSync)(viewerIdSession.accountId);
        if (playerId === null)
            return reply.status(500).send({
                "error": "Internal Server Error", "message": "No player bound to account."
            });
        // get player's rank
        const myRanking = (0, rush_1.getPlayerRushEventEndlessBattleRankingSync)(playerId, eventId);
        const rankNumber = (_e = myRanking === null || myRanking === void 0 ? void 0 : myRanking.rank_number) !== null && _e !== void 0 ? _e : null;
        // find matching reward tier
        const rewards = (_f = rankingRewards[String(eventId)]) !== null && _f !== void 0 ? _f : {};
        let rewardList = [];
        if (rankNumber !== null && rankNumber > 0) {
            for (const entries of Object.values(rewards)) {
                for (const entry of entries) {
                    if (rankNumber >= entry.fromRank && rankNumber <= entry.toRank) {
                        rewardList.push(entry);
                        break;
                    }
                }
            }
        }
        console.log(`[RUSH] reward: rank=${rankNumber} rewards=${rewardList.length}`);
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
            "data": {
                "rank_number": rankNumber,
                "ranking_reward": {
                    "reward_list": rewardList.map(r => ({
                        "kind": r.kind,
                        "kind_id": r.kindId,
                        "number": r.number
                    })),
                    "status": 0
                }
            }
        });
    }));
    // ---- endless_battle ----
    fastify.post("/endless_battle", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _g, _h, _j;
        const body = request.body;
        const viewerId = body.viewer_id;
        const eventId = body.event_id;
        console.log(`[RUSH] endless_battle: viewer=${viewerId} eventId=${eventId}`);
        if (!viewerId || isNaN(viewerId) || isNaN(eventId))
            return reply.status(400).send({
                "error": "Bad Request", "message": "Invalid request body."
            });
        const viewerIdSession = yield (0, wdfpData_1.getSession)(viewerId.toString());
        if (!viewerIdSession)
            return reply.status(400).send({
                "error": "Bad Request", "message": "Invalid viewer id."
            });
        const playerId = (0, activeAccount_1.resolvePlayerIdSync)(viewerIdSession.accountId);
        if (playerId === null)
            return reply.status(500).send({
                "error": "Internal Server Error", "message": "No player bound to account."
            });
        const rushEventData = (0, wdfpData_1.getPlayerRushEventSync)(playerId, eventId);
        const serializedPlayedParties = rushEventData !== null
            ? (0, rush_1.getSerializedPlayerRushEventPlayedPartiesSync)(playerId, eventId)
            : { endlessParties: null, folderParties: null };
        const maxRound = (_g = rushEventData === null || rushEventData === void 0 ? void 0 : rushEventData.endlessBattleMaxRound) !== null && _g !== void 0 ? _g : null;
        const nextRound = (_h = rushEventData === null || rushEventData === void 0 ? void 0 : rushEventData.endlessBattleNextRound) !== null && _h !== void 0 ? _h : 1;
        console.log(`[RUSH] endless_battle: maxRound=${maxRound} nextRound=${nextRound}`);
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
            "data": {
                "endless_battle_max_round": maxRound,
                "endless_battle_next_round": nextRound,
                "endless_battle_played_party_list": (_j = serializedPlayedParties.endlessParties) !== null && _j !== void 0 ? _j : null
            }
        });
    }));
});
exports.default = routes;
