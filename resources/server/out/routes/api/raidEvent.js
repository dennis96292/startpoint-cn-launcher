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
const types_1 = require("../../data/types");
const utils_2 = require("../../data/utils");
const rush_1 = require("../../lib/rush");
const singleBattleQuest_1 = require("./singleBattleQuest");
const raidEventIds = {};
var ResetQuestType;
(function (ResetQuestType) {
    ResetQuestType[ResetQuestType["EMPTY"] = 0] = "EMPTY";
    ResetQuestType[ResetQuestType["FOLDER"] = 1] = "FOLDER";
    ResetQuestType[ResetQuestType["ENDLESS"] = 2] = "ENDLESS";
})(ResetQuestType || (ResetQuestType = {}));
const routes = (fastify) => __awaiter(void 0, void 0, void 0, function* () {
    // ---- summary (entry point) ----
    fastify.post("/summary", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        const body = request.body;
        const viewerId = body.viewer_id;
        const eventId = body.event_id;
        if (!viewerId || isNaN(viewerId))
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
        // Rush event data for played party tracking
        let rushEventData = (0, wdfpData_1.getPlayerRushEventSync)(playerId, eventId);
        if (rushEventData === null) {
            rushEventData = (0, wdfpData_1.getDefaultPlayerRushEventSync)(eventId);
            (0, wdfpData_1.insertPlayerRushEventSync)(playerId, rushEventData);
        }
        const clearedFolderIdList = (0, wdfpData_1.getPlayerRushEventClearedFoldersSync)(playerId, eventId);
        const serializedPlayedParties = (0, rush_1.getSerializedPlayerRushEventPlayedPartiesSync)(playerId, eventId);
        console.log(`[RAID] summary: folderParties=${Object.keys((_a = serializedPlayedParties.folderParties) !== null && _a !== void 0 ? _a : {}).length} endlessParties=${Object.keys((_b = serializedPlayedParties.endlessParties) !== null && _b !== void 0 ? _b : {}).length}`);
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
            "data": {
                "aggregated_time": (0, utils_2.clientSerializeDate)((0, utils_1.getServerDate)()),
                "auto_start_point": 0,
                "kill_count_reward_data": { "received_up_to": 0, "reward_list": [] },
                "quest_list": {},
                "raid_boss": { "hp_percentage": 100, "total_kill_count": 0 },
                "endless_battle_next_round": rushEventData.endlessBattleNextRound,
                "active_rush_battle_folder_id": rushEventData.activeRushBattleFolderId,
                "endless_battle_played_max_round": rushEventData.endlessBattleNextRound,
                "cleared_folder_id_list": clearedFolderIdList,
                "endless_battle_played_party_list": serializedPlayedParties.endlessParties,
                "rush_battle_played_party_list": serializedPlayedParties.folderParties,
                "endless_battle_my_ranking": (0, rush_1.getPlayerRushEventEndlessBattleRankingSync)(playerId, eventId, { rushEventData }),
            }
        });
    }));
    // ---- get_boss ----
    fastify.post("/get_boss", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        if (!viewerId || isNaN(viewerId))
            return reply.status(400).send({
                "error": "Bad Request", "message": "Invalid request body."
            });
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
            "data": {
                "raid_boss": {
                    "hp_percentage": 100,
                    "total_kill_count": 0
                }
            }
        });
    }));
    // ---- ranking_reward ----
    fastify.post("/ranking_reward", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        if (!viewerId || isNaN(viewerId))
            return reply.status(400).send({
                "error": "Bad Request", "message": "Invalid request body."
            });
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
            "data": {
                "reward_list": [],
                "status": 0
            }
        });
    }));
    // ---- party (get event party groups) ----
    fastify.post("/party", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _c;
        const body = request.body;
        const viewerId = body.viewer_id;
        if (!viewerId || isNaN(viewerId))
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
        // Read from EVENT (dedicated party set), first time copy from NORMAL
        let playerPartyGroups = (0, wdfpData_1.getPlayerPartyGroupListSync)(playerId, types_1.PartyCategory.EVENT);
        if (Object.keys(playerPartyGroups).length === 0) {
            console.log(`[RAID] party: no EVENT groups, copying from NORMAL`);
            playerPartyGroups = (0, wdfpData_1.getPlayerPartyGroupListSync)(playerId, types_1.PartyCategory.NORMAL);
            for (const group of Object.values(playerPartyGroups)) {
                for (const party of Object.values(group.list)) {
                    party.category = types_1.PartyCategory.EVENT;
                }
                group.category = types_1.PartyCategory.EVENT;
            }
            (0, wdfpData_1.insertPlayerPartyGroupListSync)(playerId, playerPartyGroups);
        }
        const group1 = playerPartyGroups['1'];
        const partyList = [];
        if (group1 && group1.list) {
            let count = 0;
            for (const [pidStr, party] of Object.entries(group1.list)) {
                if (count >= 3)
                    break;
                count++;
                partyList.push({
                    ability_soul_ids: party.abilitySoulIds,
                    character_ids: party.characterIds,
                    equipment_ids: party.equipmentIds,
                    unison_character_ids: party.unisonCharacterIds,
                    options: { allow_other_players_to_heal_me: party.options.allowOtherPlayersToHealMe },
                    party_edited: party.edited,
                    party_id: Number(pidStr),
                    party_name: party.name
                });
            }
        }
        // Fallback: fill empty parties with leader characters if NORMAL is empty
        while (partyList.length < 3) {
            const pid = partyList.length + 1;
            const playerChars = (0, wdfpData_1.getPlayerCharactersSync)(playerId);
            const leaderIds = Object.keys(playerChars).map(Number).filter(id => id > 0).sort((a, b) => a - b);
            const usedIds = new Set(partyList.flatMap(p => p.character_ids.filter(c => c !== null)));
            const leaderId = (_c = leaderIds.find(id => !usedIds.has(id))) !== null && _c !== void 0 ? _c : null;
            partyList.push({
                ability_soul_ids: [null, null, null],
                character_ids: [leaderId, null, null],
                equipment_ids: [null, null, null],
                unison_character_ids: [null, null, null],
                options: { allow_other_players_to_heal_me: true },
                party_edited: false,
                party_id: pid,
                party_name: `Party ${pid}`
            });
        }
        const userPartyGroupList = [{
                "party_group_color_id": 15,
                "party_group_id": 1,
                "party_list": partyList
            }];
        const partyDump = userPartyGroupList.map(g => ({
            gid: g.party_group_id,
            parties: g.party_list.map(p => ({ pid: p.party_id, chars: p.character_ids, unisons: p.unison_character_ids }))
        }));
        console.log(`[RAID] party: response=${JSON.stringify(partyDump)}`);
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
            "data": {
                "user_party_group_list": userPartyGroupList
            }
        });
    }));
    // ---- ranking ----
    fastify.post("/ranking", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        if (!viewerId || isNaN(viewerId))
            return reply.status(400).send({
                "error": "Bad Request", "message": "Invalid request body."
            });
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
            "data": {
                "aggregated_time": "",
                "quest_list": {}
            }
        });
    }));
    // ---- ranking/party (view other player's party) ----
    fastify.post("/ranking/party", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        if (!viewerId || isNaN(viewerId))
            return reply.status(400).send({
                "error": "Bad Request", "message": "Invalid request body."
            });
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
            "data": {
                "raid_ranking_party": []
            }
        });
    }));
    // ---- battle/start ----
    fastify.post("/battle/start", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _d;
        const body = request.body;
        const viewerId = body.viewer_id;
        console.log(`[RAID] battle/start body: questId=${body.quest_id} eventId=${body.event_id} partyGroup=${body.party_group_id}`);
        if (!viewerId || isNaN(viewerId))
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
        // Register active quest for /single_battle_quest/finish
        const raidEventId = (_d = raidEventIds[playerId]) !== null && _d !== void 0 ? _d : Math.floor(body.quest_id / 1000);
        (0, singleBattleQuest_1.insertActiveQuest)(playerId, {
            questId: body.quest_id,
            category: 23, // RAID_EVENT
            useBossBoostPoint: false,
            useBoostPoint: false,
            isAutoStartMode: body.is_auto_start_mode,
            isMulti: false,
            eventId: raidEventId,
            playId: body.play_id,
            continueCount: 0
        });
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
            "data": {}
        });
    }));
    // ---- select_folder ----
    fastify.post("/select_folder", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        if (!viewerId || isNaN(viewerId))
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
        (0, wdfpData_1.updatePlayerRushEventSync)(playerId, { eventId: body.event_id, activeRushBattleFolderId: body.folder_id });
        raidEventIds[playerId] = body.event_id;
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({ "data_headers": (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }), "data": {} });
    }));
    // ---- reset ----
    fastify.post("/reset", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        const eventId = body.event_id;
        const questType = body.quest_type;
        const resetTargetId = body.reset_target_id;
        const isResetAfterTargetRound = body.is_reset_after_target_round;
        console.log(`[RAID] reset: eventId=${eventId} questType=${questType}`);
        if (!viewerId || isNaN(viewerId))
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
        if (questType === ResetQuestType.FOLDER) {
            if (resetTargetId !== undefined) {
                (0, wdfpData_1.deletePlayerRushEventPlayedPartiesUntilSync)(playerId, eventId, types_1.RushEventBattleType.FOLDER, resetTargetId);
            }
            else {
                (0, wdfpData_1.updatePlayerRushEventSync)(playerId, { eventId: eventId, activeRushBattleFolderId: null });
                (0, wdfpData_1.deletePlayerRushEventPlayedPartyListSync)(playerId, eventId, types_1.RushEventBattleType.FOLDER);
            }
        }
        else if (resetTargetId !== undefined) {
            if (isResetAfterTargetRound) {
                (0, wdfpData_1.deletePlayerRushEventPlayedPartiesUntilSync)(playerId, eventId, types_1.RushEventBattleType.ENDLESS, resetTargetId);
            }
            else {
                (0, wdfpData_1.deletePlayerRushEventPlayedPartySync)(playerId, eventId, resetTargetId, types_1.RushEventBattleType.ENDLESS);
            }
        }
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({ "data_headers": (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }), "data": {} });
    }));
});
exports.default = routes;
