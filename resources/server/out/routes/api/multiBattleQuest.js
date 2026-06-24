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
const assets_1 = require("../../lib/assets");
const character_1 = require("../../lib/character");
const quest_1 = require("../../lib/quest");
const types_1 = require("../../lib/types");
const utils_1 = require("../../utils");
const multiRoom_1 = require("../../data/multiRoom");
const sessionServer_1 = require("../../data/sessionServer");
const singleBattleQuest_1 = require("./singleBattleQuest");
const types_2 = require("../../data/types");
const activeAccount_1 = require("../../data/activeAccount");
const rush_1 = require("../../lib/rush");
const rushEvent_1 = require("./rushEvent");
const continueVmoneyCost = 50;
function getViewerIdAndPlayer(viewerId) {
    return __awaiter(this, void 0, void 0, function* () {
        const session = yield (0, wdfpData_1.getSession)(viewerId.toString());
        if (!session)
            return null;
        const playerId = (0, activeAccount_1.resolvePlayerIdSync)(session.accountId);
        if (playerId === null)
            return null;
        const player = (0, wdfpData_1.getPlayerSync)(playerId);
        return { session, playerId, player };
    });
}
const routes = (fastify) => __awaiter(void 0, void 0, void 0, function* () {
    // ---- get_rooms ----
    fastify.post("/get_rooms", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        console.log(`[MULTI] get_rooms body:`, JSON.stringify(body));
        if (!viewerId || isNaN(viewerId))
            return reply.status(400).send({
                "error": "Bad Request", "message": "Invalid request body."
            });
        const sid = yield (0, wdfpData_1.getSession)(viewerId.toString());
        if (!sid)
            return reply.status(400).send({
                "error": "Bad Request", "message": "Invalid viewer id."
            });
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
            "data": { "rooms": (0, multiRoom_1.getRooms)(body.category_id, body.event_id)
                    .filter(r => r.host_viewer_id === viewerId)
                    .filter(r => (0, sessionServer_1.hasRoomClients)(r.room_number))
                    .map(multiRoom_1.serializeRoom) }
        });
    }));
    // ---- create_room ----
    fastify.post("/create_room", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const body = request.body;
        const { viewer_id, category, quest_id, party_id } = body;
        console.log(`[MULTI] create_room: viewer=${viewer_id} category=${category} quest=${quest_id} party=${party_id}`);
        const ctx = yield getViewerIdAndPlayer(viewer_id);
        if (!ctx)
            return reply.status(400).send({
                "error": "Bad Request", "message": "Invalid viewer id or no player bound."
            });
        // validate quest exists
        const quest = (0, assets_1.getQuestFromCategorySync)(category, quest_id);
        if (!quest)
            return reply.status(400).send({
                "error": "Bad Request", "message": "Quest doesn't exist."
            });
        const room = (0, multiRoom_1.createRoom)(viewer_id, ctx.playerId, party_id, category, quest_id, 0, ((_a = ctx.player) === null || _a === void 0 ? void 0 : _a.leaderCharacterId) || 1);
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({ viewer_id }),
            "data": {
                "access_token": room.access_token,
                "room_number": room.room_number,
                "room_url": ""
            }
        });
    }));
    // ---- search_room ----
    fastify.post("/search_room", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _b, _c, _d, _e;
        const body = request.body;
        const viewerId = body.viewer_id;
        console.log(`[MULTI] search_room: viewer=${viewerId} room=${body.room_number}`);
        if (!viewerId || isNaN(viewerId))
            return reply.status(400).send({
                "error": "Bad Request", "message": "Invalid request body."
            });
        const sid = yield (0, wdfpData_1.getSession)(viewerId.toString());
        if (!sid)
            return reply.status(400).send({
                "error": "Bad Request", "message": "Invalid viewer id."
            });
        const room = (0, multiRoom_1.getRoom)(body.room_number);
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
            "data": {
                "room_exists": !!room,
                "category_id": (_b = room === null || room === void 0 ? void 0 : room.category) !== null && _b !== void 0 ? _b : 0,
                "quest_id": (_c = room === null || room === void 0 ? void 0 : room.quest_id) !== null && _c !== void 0 ? _c : 0,
                "room_number": (_d = room === null || room === void 0 ? void 0 : room.room_number) !== null && _d !== void 0 ? _d : body.room_number,
                "establisher_viewer_id": (_e = room === null || room === void 0 ? void 0 : room.host_viewer_id) !== null && _e !== void 0 ? _e : 0,
                "establisher_follow": 0
            }
        });
    }));
    // ---- select_room ----
    fastify.post("/select_room", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        console.log(`[MULTI] select_room body:`, JSON.stringify(body));
        if (!viewerId || isNaN(viewerId))
            return reply.status(400).send({
                "error": "Bad Request", "message": "Invalid request body."
            });
        const ctx = yield getViewerIdAndPlayer(viewerId);
        if (!ctx)
            return reply.status(400).send({
                "error": "Bad Request", "message": "Invalid viewer id or no player bound."
            });
        const room = body.room_number ? (0, multiRoom_1.getRoom)(body.room_number) : (0, multiRoom_1.getRoomByToken)(body.access_token || "");
        if (!room) {
            console.log(`[MULTI] select_room: room not found, return raising_state=9`);
            reply.header("content-type", "application/x-msgpack");
            return reply.status(200).send({
                "data_headers": (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
                "data": {
                    application_update_url: "",
                    category_id: 0,
                    host_entry_time: 0,
                    ip_address: (0, multiRoom_1.getDisplayHost)(),
                    port: parseInt(process.env.SESSION_PORT || "8003"),
                    quest_id: 0,
                    raising_state: 9,
                    room_number: body.room_number || "",
                    room_sequence: 0,
                    share_room_options: 0,
                    is_pickup: null
                }
            });
        }
        console.log(`[MULTI] select_room: room found, raising_state=${room.raising_state}`);
        (0, multiRoom_1.updateHostEntryTime)(room.room_number);
        const selectData = (0, multiRoom_1.serializeRoomConnection)(room);
        // Host always sees Ready; guests see true state (2=Waiting, 1=Ready, etc.)
        if (viewerId === room.host_viewer_id) {
            selectData.raising_state = 1;
            console.log(`[MULTI] select_room: host override raising_state → 1`);
        }
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
            "data": selectData
        });
    }));
    // ---- prepare ----
    fastify.post("/prepare", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        console.log(`[MULTI] prepare: viewer=${viewerId} room=${body.room_number}`);
        if (!viewerId || isNaN(viewerId))
            return reply.status(400).send({
                "error": "Bad Request", "message": "Invalid request body."
            });
        const ctx = yield getViewerIdAndPlayer(viewerId);
        if (!ctx)
            return reply.status(400).send({
                "error": "Bad Request", "message": "Invalid viewer id or no player bound."
            });
        const room = body.room_number ? (0, multiRoom_1.getRoom)(body.room_number) : (0, multiRoom_1.getRoomByToken)(body.access_token || "");
        if (!room) {
            console.log(`[MULTI] prepare: room not found, return raising_state=9`);
            reply.header("content-type", "application/x-msgpack");
            return reply.status(200).send({
                "data_headers": (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
                "data": {
                    application_update_url: "",
                    category_id: 0,
                    host_entry_time: 0,
                    ip_address: (0, multiRoom_1.getDisplayHost)(),
                    port: parseInt(process.env.SESSION_PORT || "8003"),
                    quest_id: 0,
                    raising_state: 9,
                    room_number: body.room_number || "",
                    room_sequence: 0,
                    share_room_options: 0,
                    is_pickup: null
                }
            });
        }
        // prepare → select_room (client will call select_room after prepare)
        console.log(`[MULTI] prepare: room found, raising_state=${room.raising_state}`);
        (0, multiRoom_1.updateHostEntryTime)(room.room_number);
        const prepareData = (0, multiRoom_1.serializeRoomConnection)(room);
        if (viewerId === room.host_viewer_id) {
            prepareData.raising_state = 1;
            console.log(`[MULTI] prepare: host override raising_state → 1`);
        }
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
            "data": prepareData
        });
    }));
    // ---- summon (NPC mate data) ----
    fastify.post("/summon", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        console.log(`[MULTI] summon body:`, JSON.stringify(body));
        if (!viewerId || isNaN(viewerId)) {
            console.log(`[MULTI] summon 400: invalid viewer_id=${viewerId}`);
            return reply.status(400).send({
                "error": "Bad Request", "message": "Invalid request body."
            });
        }
        const ctx = yield getViewerIdAndPlayer(viewerId);
        if (!ctx) {
            console.log(`[MULTI] summon 400: no player bound viewer=${viewerId}`);
            return reply.status(400).send({
                "error": "Bad Request", "message": "Invalid viewer id or no player bound."
            });
        }
        const room = (0, multiRoom_1.getRoom)(body.room_number);
        if (!room) {
            console.log(`[MULTI] summon 400: room not found room=${body.room_number}`);
            return reply.status(400).send({
                "error": "Bad Request", "message": "Room doesn't exist."
            });
        }
        console.log(`[MULTI] summon: viewer=${viewerId} room=${body.room_number} quest=${body.quest_id}`);
        // Check if room has real players as mates, else fall back to NPCs
        const realMates = room.mates.filter(m => m.viewer_id !== null);
        let mate1 = null;
        let mate2 = null;
        if (realMates.length >= 1) {
            // TODO phase 2: generate mate from real player data
        }
        // Always provide NPC mates for solo multi play
        const npcMates = (0, multiRoom_1.getNpcMates)(body.quest_id, room.category);
        mate1 = npcMates.mate1;
        mate2 = npcMates.mate2;
        console.log(`[MULTI] summon res: mate1=${mate1 === null || mate1 === void 0 ? void 0 : mate1.com_id} mate2=${mate2 === null || mate2 === void 0 ? void 0 : mate2.com_id}`);
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
            "data": {
                "mate1": mate1,
                "mate2": mate2
            }
        });
    }));
    // ---- restore_room ----
    fastify.post("/restore_room", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        console.log(`[MULTI] restore_room: viewer=${viewerId} room=${body.room_number} seq=${body.room_sequence}`);
        if (!viewerId || isNaN(viewerId))
            return reply.status(400).send({
                "error": "Bad Request", "message": "Invalid request body."
            });
        const sid = yield (0, wdfpData_1.getSession)(viewerId.toString());
        if (!sid)
            return reply.status(400).send({
                "error": "Bad Request", "message": "Invalid viewer id."
            });
        const room = (0, multiRoom_1.getRoom)(body.room_number);
        const displayHost = (0, multiRoom_1.getDisplayHost)();
        const sessionPort = parseInt(process.env.SESSION_PORT || "8003");
        if (room) {
            console.log(`[MULTI] restore_room: room found, raising_state=${room.raising_state} host=${room.host_viewer_id}`);
            const restoreData = (0, multiRoom_1.serializeRoomConnection)(room);
            if (viewerId === room.host_viewer_id) {
                restoreData.raising_state = 1;
                console.log(`[MULTI] restore_room: host override raising_state → 1`);
            }
            reply.header("content-type", "application/x-msgpack");
            return reply.status(200).send({
                "data_headers": (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
                "data": restoreData
            });
        }
        console.log(`[MULTI] restore_room: room not found, return raising_state=9`);
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
            "data": {
                application_update_url: "",
                category_id: 0,
                host_entry_time: 0,
                ip_address: displayHost,
                port: sessionPort,
                quest_id: 0,
                raising_state: 9,
                room_number: body.room_number,
                room_sequence: body.room_sequence || 0,
                share_room_options: 0,
                is_pickup: null
            }
        });
    }));
    // ---- share_room ----
    fastify.post("/share_room", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        console.log(`[MULTI] share_room: viewer=${viewerId} room=${body.room_number} shareTypes=${JSON.stringify(body.share_type_list)}`);
        if (!viewerId || isNaN(viewerId))
            return reply.status(400).send({
                "error": "Bad Request", "message": "Invalid request body."
            });
        const sid = yield (0, wdfpData_1.getSession)(viewerId.toString());
        if (!sid)
            return reply.status(400).send({
                "error": "Bad Request", "message": "Invalid viewer id."
            });
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
            "data": {}
        });
    }));
    // ---- verify_access_token ----
    fastify.post("/verify_access_token", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _f, _g, _h, _j;
        const body = request.body;
        const viewerId = body.viewer_id;
        console.log(`[MULTI] verify_token: viewer=${viewerId}`);
        if (!viewerId || isNaN(viewerId))
            return reply.status(400).send({
                "error": "Bad Request", "message": "Invalid request body."
            });
        const sid = yield (0, wdfpData_1.getSession)(viewerId.toString());
        if (!sid)
            return reply.status(400).send({
                "error": "Bad Request", "message": "Invalid viewer id."
            });
        const room = (0, multiRoom_1.getRoomByToken)(body.access_token);
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
            "data": {
                "room_exists": !!room,
                "category_id": (_f = room === null || room === void 0 ? void 0 : room.category) !== null && _f !== void 0 ? _f : 0,
                "quest_id": (_g = room === null || room === void 0 ? void 0 : room.quest_id) !== null && _g !== void 0 ? _g : 0,
                "room_number": (_h = room === null || room === void 0 ? void 0 : room.room_number) !== null && _h !== void 0 ? _h : "",
                "establisher_viewer_id": (_j = room === null || room === void 0 ? void 0 : room.host_viewer_id) !== null && _j !== void 0 ? _j : 0,
                "establisher_follow": 0
            }
        });
    }));
    // ---- disband_room ----
    fastify.post("/disband_room", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        if (!viewerId || isNaN(viewerId))
            return reply.status(400).send({
                "error": "Bad Request", "message": "Invalid request body."
            });
        if (body.room_number) {
            (0, sessionServer_1.notifyRoomDisbanded)(body.room_number);
            (0, multiRoom_1.disbandRoom)(body.room_number);
            console.log(`[MULTI] room ${body.room_number} disbanded by viewer ${viewerId}`);
        }
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
            "data": []
        });
    }));
    // ---- micro_community (CN-specific) ----
    fastify.post("/micro_community", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        console.log(`[MULTI] micro_community: viewer=${viewerId}`);
        if (!viewerId || isNaN(viewerId))
            return reply.status(400).send({
                "error": "Bad Request", "message": "Invalid request body."
            });
        const sid = yield (0, wdfpData_1.getSession)(viewerId.toString());
        if (!sid)
            return reply.status(400).send({
                "error": "Bad Request", "message": "Invalid viewer id."
            });
        // Micro community is CN-specific; return empty for now
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
            "data": {
                "micro_community_list": [],
                "page_token": ""
            }
        });
    }));
    // ---- publish_room (CN micro community share) ----
    fastify.post("/publish_room", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        console.log(`[MULTI] publish_room: viewer=${viewerId} room=${body.room_number}`);
        if (!viewerId || isNaN(viewerId)) {
            console.log(`[MULTI] publish_room: 400 invalid viewer_id=${viewerId}`);
            return reply.status(400).send({
                "error": "Bad Request", "message": "Invalid request body."
            });
        }
        const sid = yield (0, wdfpData_1.getSession)(viewerId.toString());
        if (!sid)
            return reply.status(400).send({
                "error": "Bad Request", "message": "Invalid viewer id."
            });
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
            "data": {}
        });
    }));
    // ---- start (multi) ----
    fastify.post("/start", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const { viewer_id, quest_id, category, party_id, use_boost_point, use_boss_boost_point, is_auto_start_mode, room_number, mate_player_ids } = body;
        console.log(`[MULTI] start: viewer=${viewer_id} quest=${quest_id} category=${category} party=${party_id} room=${room_number}`);
        console.log(`[MULTI] start mate_player_ids=${JSON.stringify(mate_player_ids)}`);
        console.log(`[MULTI] start mate_party_ids=${JSON.stringify(body.mate_party_ids)}`);
        if (isNaN(viewer_id) || isNaN(party_id) || isNaN(quest_id) || isNaN(category) || use_boost_point === undefined || use_boss_boost_point === undefined || is_auto_start_mode === undefined) {
            return reply.status(400).send({
                "error": "Bad Request", "message": "Invalid request body."
            });
        }
        const ctx = yield getViewerIdAndPlayer(viewer_id);
        if (!ctx)
            return reply.status(400).send({
                "error": "Bad Request", "message": "Invalid viewer id or no player bound."
            });
        const questData = (0, assets_1.getQuestFromCategorySync)(category, quest_id);
        if (questData === null || !('rankPointReward' in questData))
            return reply.status(400).send({
                "error": "Bad Request", "message": "Quest doesn't exist."
            });
        const room = (0, multiRoom_1.getRoom)(room_number);
        if (!room)
            return reply.status(400).send({
                "error": "Bad Request", "message": "Room doesn't exist."
            });
        // Set room to battle state
        (0, multiRoom_1.updateRoomState)(room_number, 4);
        // Insert active quest with multi flag
        const mateComIds = room.mates.map(m => m.com_id);
        (0, singleBattleQuest_1.insertActiveQuest)(ctx.playerId, {
            questId: quest_id,
            category: category,
            useBoostPoint: use_boost_point,
            useBossBoostPoint: use_boss_boost_point,
            isAutoStartMode: is_auto_start_mode,
            isMulti: true,
            roomNumber: room_number,
            matePlayerIds: mate_player_ids,
            mateComIds,
            playId: body.play_id,
            continueCount: 0
        });
        // update player last quest id
        if (questData.fixedParty === undefined) {
            (0, wdfpData_1.updatePlayerSync)({
                id: ctx.playerId,
                partySlot: party_id
            });
        }
        const dataHeaders = (0, utils_1.generateDataHeaders)({ viewer_id });
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": dataHeaders,
            "data": {
                "user_info": { "last_main_quest_id": quest_id },
                "category_id": category,
                "is_multi": "multi",
                "start_time": dataHeaders['servertime'],
                "quest_name": "",
                "follow_bonus_info": null
            }
        });
    }));
    // ---- finish (multi) ----
    fastify.post("/finish", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _k, _l, _m, _o, _p, _q, _r, _s;
        const body = request.body;
        const viewerId = body.viewer_id;
        console.log(`[MULTI] finish: viewer=${viewerId} quest=${body.quest_id} category=${body.category} accomplished=${body.is_accomplished}`);
        if (!viewerId || isNaN(viewerId))
            return reply.status(400).send({
                "error": "Bad Request", "message": "Invalid request body."
            });
        const ctx = yield getViewerIdAndPlayer(viewerId);
        if (!ctx || !ctx.player)
            return reply.status(400).send({
                "error": "Bad Request", "message": "Invalid viewer id."
            });
        const playerData = ctx.player;
        const playerId = ctx.playerId;
        // get active quest
        const activeQuestData = singleBattleQuest_1.activeQuests[playerId];
        if (activeQuestData === undefined)
            return reply.status(400).send({
                "error": "Bad Request", "message": "No active quest to finish."
            });
        // get quest data
        const questCategory = activeQuestData.category;
        const questId = activeQuestData.questId;
        const questData = (0, assets_1.getQuestFromCategorySync)(questCategory, questId);
        if (questData === null || !('rankPointReward' in questData))
            return reply.status(400).send({
                "error": "Bad Request", "message": "Quest doesn't exist."
            });
        // delete active quest
        delete singleBattleQuest_1.activeQuests[playerId];
        (0, wdfpData_1.deletePlayerActiveQuestSync)(playerId);
        // keep room alive for "return to room" after battle
        if (activeQuestData.roomNumber) {
            const room = (0, multiRoom_1.getRoom)(activeQuestData.roomNumber);
            if (room && room.host_player_id === playerId) {
                (0, multiRoom_1.updateRoomState)(room.room_number, 1);
                console.log(`[MULTI] finish: room ${activeQuestData.roomNumber} reset to raising_state=1`);
            }
        }
        // calculate clear rank (only if quest has rank time thresholds)
        const clearTime = body.elapsed_time_ms;
        const hasRankThresholds = questData.bRankTime > 0;
        const clearRank = hasRankThresholds ? (questData.sPlusRankTime >= clearTime ? 5
            : questData.sRankTime >= clearTime ? 4
                : questData.aRankTime >= clearTime ? 3
                    : questData.bRankTime >= clearTime ? 2
                        : 1) : null;
        // calculate player rewards
        const newExpPool = playerData.expPool + questData.poolExpReward;
        const beforeRankPoint = playerData.rankPoint;
        const newRankPoint = beforeRankPoint + questData.rankPointReward;
        let newMana = playerData.freeMana + questData.manaReward + body.add_mana;
        // boost points
        let newBoostPoint = playerData.boostPoint - (activeQuestData.useBoostPoint ? 1 : 0);
        let newBossBoostPoint = playerData.bossBoostPoint - (activeQuestData.useBossBoostPoint ? 1 : 0);
        let useBoostPoint = (activeQuestData.useBoostPoint && (newBoostPoint >= 0)) || (activeQuestData.useBossBoostPoint && (newBossBoostPoint >= 0));
        // quest progress
        const questProgress = (0, wdfpData_1.getPlayerSingleQuestProgressSync)(playerId, questCategory, questId);
        const questPreviouslyCompleted = questProgress !== null;
        const questAccomplished = body.is_accomplished;
        const clearReward = !questPreviouslyCompleted && questData.clearReward !== undefined ? (0, quest_1.givePlayerRewardSync)(playerId, questData.clearReward) : null;
        const sPlusClearReward = (clearRank === 5) && ((questProgress === null || questProgress === void 0 ? void 0 : questProgress.clearRank) !== 5) && (questData.sPlusReward !== undefined) ? (0, quest_1.givePlayerRewardSync)(playerId, questData.sPlusReward) : null;
        if (questAccomplished) {
            if (questPreviouslyCompleted) {
                const updateData = {
                    questId: questId,
                    finished: true,
                    bestElapsedTimeMs: questProgress.bestElapsedTimeMs === undefined || questProgress.bestElapsedTimeMs === null ? clearTime : Math.min(clearTime, questProgress.bestElapsedTimeMs),
                    highScore: questProgress.highScore === undefined ? body.score : Math.max(body.score, questProgress.highScore)
                };
                if (clearRank !== null) {
                    updateData.clearRank = questProgress.clearRank === undefined ? clearRank : Math.max(clearRank, questProgress.clearRank);
                }
                (0, wdfpData_1.updatePlayerQuestProgressSync)(playerId, questCategory, updateData);
            }
            else {
                const insertData = {
                    questId: questId,
                    finished: true,
                    bestElapsedTimeMs: clearTime,
                    highScore: body.score,
                    clearRank: clearRank !== null && clearRank !== void 0 ? clearRank : 5
                };
                (0, wdfpData_1.insertPlayerQuestProgressSync)(playerId, questCategory, insertData);
            }
        }
        // update player
        (0, wdfpData_1.updatePlayerSync)({
            id: playerId,
            freeMana: newMana,
            expPool: newExpPool,
            rankPoint: newRankPoint,
            boostPoint: newBoostPoint,
            bossBoostPoint: newBossBoostPoint
        });
        // reward score rewards
        const scoreRewardsResult = (0, quest_1.givePlayerScoreRewardsSync)(playerId, questData.scoreRewardGroupId, questData.scoreRewardGroup, useBoostPoint, questData.element);
        // reward character exp
        const bodyPartyStatistics = body.statistics.party;
        const partyCharacterIds = [...bodyPartyStatistics.characters, ...bodyPartyStatistics.unison_characters];
        const partyCharacterIdsArray = [];
        for (const value of partyCharacterIds.values()) {
            if (value !== null && value.id !== null)
                partyCharacterIdsArray.push(value.id);
        }
        const addExpAmount = questData.characterExpReward;
        const rewardCharacterExpResult = (0, character_1.givePlayerCharactersExpSync)(playerId, partyCharacterIdsArray, addExpAmount, questData.fixedParty !== undefined);
        const dataHeaders = (0, utils_1.generateDataHeaders)({ viewer_id: viewerId });
        // handle rush event if applicable
        let rushEventData = null;
        let rushEventRewardsResult = null;
        if (questCategory === types_1.QuestCategory.RUSH_EVENT) {
            const rushEventId = questData.rushEventId;
            const rushEventFolderId = questData.rushEventFolderId;
            const rushEventRound = questData.rushEventRound;
            if (rushEventFolderId !== undefined && rushEventRound !== undefined && rushEventId !== undefined) {
                const rushEventBattleType = rushEventRound === 0 ? types_2.RushEventBattleType.ENDLESS : types_2.RushEventBattleType.FOLDER;
                const characterIds = bodyPartyStatistics.characters.map(val => { var _a; return (_a = val === null || val === void 0 ? void 0 : val.id) !== null && _a !== void 0 ? _a : null; });
                const unisonCharacterIds = bodyPartyStatistics.unison_characters.map(val => { var _a; return (_a = val === null || val === void 0 ? void 0 : val.id) !== null && _a !== void 0 ? _a : null; });
                const evolutionImgLevels = (0, character_1.getCharactersEvolutionImgLevels)(playerId, characterIds);
                const unisonEvolutionImgLevels = (0, character_1.getCharactersEvolutionImgLevels)(playerId, unisonCharacterIds);
                let round = questId;
                if (rushEventBattleType === types_2.RushEventBattleType.ENDLESS) {
                    const playerRushEventData = (0, wdfpData_1.getPlayerRushEventSync)(playerId, rushEventId);
                    const playerNextRound = (_k = playerRushEventData === null || playerRushEventData === void 0 ? void 0 : playerRushEventData.endlessBattleNextRound) !== null && _k !== void 0 ? _k : 1;
                    const playerMaxRound = (_l = playerRushEventData === null || playerRushEventData === void 0 ? void 0 : playerRushEventData.endlessBattleMaxRound) !== null && _l !== void 0 ? _l : 1;
                    const playerBestClearTime = (_m = playerRushEventData === null || playerRushEventData === void 0 ? void 0 : playerRushEventData.endlessBattleMaxRoundTime) !== null && _m !== void 0 ? _m : Number.MAX_SAFE_INTEGER;
                    round = playerNextRound;
                    if ((playerNextRound >= playerMaxRound && playerBestClearTime >= clearTime) || (playerNextRound > playerMaxRound)) {
                        (0, wdfpData_1.updatePlayerRushEventSync)(playerId, {
                            eventId: rushEventId,
                            endlessBattleMaxRound: playerNextRound,
                            endlessBattleMaxRoundTime: clearTime,
                            endlessBattleMaxRoundCharacterIds: characterIds,
                            endlessBattleMaxRoundCharacterEvolutionImgLvls: evolutionImgLevels
                        });
                    }
                    (0, wdfpData_1.insertPlayerRushEventPlayedPartySync)(playerId, rushEventId, {
                        characterIds, unisonCharacterIds,
                        equipmentIds: bodyPartyStatistics.equipments.map(val => { var _a; return (_a = val === null || val === void 0 ? void 0 : val.id) !== null && _a !== void 0 ? _a : null; }),
                        abilitySoulIds: bodyPartyStatistics.ability_soul_ids,
                        evolutionImgLevels, unisonEvolutionImgLevels,
                        battleType: rushEventBattleType, round
                    });
                }
                else if (rushEventBattleType === types_2.RushEventBattleType.FOLDER) {
                    const isFolderFinal = rushEventRound >= ((_o = rushEvent_1.rushEventFolderMaxRounds[rushEventFolderId]) !== null && _o !== void 0 ? _o : 0);
                    if (isFolderFinal) {
                        (0, wdfpData_1.insertPlayerRushEventClearedFolderSync)(playerId, rushEventId, rushEventFolderId);
                        (0, wdfpData_1.updatePlayerRushEventSync)(playerId, { eventId: rushEventId, activeRushBattleFolderId: null });
                        (0, wdfpData_1.deletePlayerRushEventPlayedPartyListSync)(playerId, rushEventId, rushEventBattleType);
                    }
                    else {
                        (0, wdfpData_1.insertPlayerRushEventPlayedPartySync)(playerId, rushEventId, {
                            characterIds, unisonCharacterIds,
                            equipmentIds: bodyPartyStatistics.equipments.map(val => { var _a; return (_a = val === null || val === void 0 ? void 0 : val.id) !== null && _a !== void 0 ? _a : null; }),
                            abilitySoulIds: bodyPartyStatistics.ability_soul_ids,
                            evolutionImgLevels, unisonEvolutionImgLevels,
                            battleType: rushEventBattleType, round
                        });
                    }
                }
                const serializedPlayedParties = (0, rush_1.getSerializedPlayerRushEventPlayedPartiesSync)(playerId, rushEventId);
                rushEventData = {
                    "rush_battle_reward_list": [],
                    "rush_battle_played_party_list": serializedPlayedParties.folderParties,
                    "endless_battle_played_party_list": serializedPlayedParties.endlessParties,
                    "is_out_of_period": false
                };
                if (rushEventBattleType === types_2.RushEventBattleType.FOLDER && rushEventRound >= ((_p = rushEvent_1.rushEventFolderMaxRounds[rushEventFolderId]) !== null && _p !== void 0 ? _p : 0)) {
                    const rewards = (_q = (0, assets_1.getRushEventFolderClearRewards)(rushEventId, rushEventFolderId)) !== null && _q !== void 0 ? _q : [];
                    rushEventRewardsResult = (0, quest_1.givePlayerRewardsSync)(playerId, rewards);
                    rushEventData.rush_battle_reward_list = rewards.map(reward => {
                        const itemReward = reward;
                        return { "kind": 1, "kind_id": itemReward.id, "number": itemReward.count };
                    });
                }
            }
        }
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": dataHeaders,
            "data": {
                "user_info": {
                    "free_mana": newMana + ((clearReward === null || clearReward === void 0 ? void 0 : clearReward.user_info.free_mana) || 0) + ((sPlusClearReward === null || sPlusClearReward === void 0 ? void 0 : sPlusClearReward.user_info.free_mana) || 0) + scoreRewardsResult.user_info.free_mana,
                    "exp_pool": rewardCharacterExpResult.exp_pool + ((clearReward === null || clearReward === void 0 ? void 0 : clearReward.user_info.exp_pool) || 0) + scoreRewardsResult.user_info.exp_pool,
                    "exp_pooled_time": (0, utils_1.getServerTime)(playerData.expPooledTime),
                    "free_vmoney": playerData.freeVmoney + ((clearReward === null || clearReward === void 0 ? void 0 : clearReward.user_info.free_vmoney) || 0) + ((sPlusClearReward === null || sPlusClearReward === void 0 ? void 0 : sPlusClearReward.user_info.free_vmoney) || 0) + scoreRewardsResult.user_info.free_vmoney,
                    "rank_point": newRankPoint,
                    "stamina": playerData.stamina,
                    "stamina_heal_time": (0, utils_1.getServerTime)(),
                    "boost_point": newBoostPoint,
                    "boss_boost_point": newBossBoostPoint
                },
                "add_exp_list": rewardCharacterExpResult.add_exp_list,
                "character_list": [
                    ...rewardCharacterExpResult.character_list,
                    ...((clearReward === null || clearReward === void 0 ? void 0 : clearReward.character_list) || []),
                    ...((sPlusClearReward === null || sPlusClearReward === void 0 ? void 0 : sPlusClearReward.character_list) || []),
                    ...scoreRewardsResult.character_list
                ],
                "bond_token_status_list": rewardCharacterExpResult.bond_token_status_list,
                "rewards": {
                    "overflow_pool_exp": 0,
                    "converted_pool_exp": 0,
                    "reward_pool_exp": questData.poolExpReward,
                    "reward_mana": questData.manaReward,
                    "field_mana": body.add_mana
                },
                "old_high_score": questProgress === null ? 0 : questProgress.highScore || 0,
                "joined_character_id_list": [
                    ...((clearReward === null || clearReward === void 0 ? void 0 : clearReward.joined_character_id_list) || []),
                    ...((sPlusClearReward === null || sPlusClearReward === void 0 ? void 0 : sPlusClearReward.joined_character_id_list) || []),
                    ...scoreRewardsResult.joined_character_id_list
                ],
                "before_rank_point": beforeRankPoint,
                "clear_rank": clearRank !== null && clearRank !== void 0 ? clearRank : 5,
                "drop_score_reward_ids": scoreRewardsResult.drop_score_reward_ids,
                "drop_rare_reward_ids": scoreRewardsResult.drop_rare_reward_ids,
                "drop_additional_reward_ids": [],
                "drop_periodic_reward_ids": [],
                "equipment_list": [
                    ...scoreRewardsResult.equipment_list,
                    ...((clearReward === null || clearReward === void 0 ? void 0 : clearReward.equipment_list) || []),
                    ...((sPlusClearReward === null || sPlusClearReward === void 0 ? void 0 : sPlusClearReward.equipment_list) || [])
                ],
                "category_id": questCategory,
                "start_time": dataHeaders['servertime'],
                "is_multi": "multi",
                "quest_name": "",
                "item_list": Object.assign(Object.assign({}, scoreRewardsResult.items), ((_r = rushEventRewardsResult === null || rushEventRewardsResult === void 0 ? void 0 : rushEventRewardsResult.items) !== null && _r !== void 0 ? _r : {})),
                "rush_event": rushEventData,
                "presigned_quest_category": [],
                // multi-specific fields
                "mate_player_result": body.mate_player_result || [],
                "contribution_score": (_s = body.contribution_score) !== null && _s !== void 0 ? _s : 0,
                "host_finished": true,
                "aborted_play_id": null,
                "drawn_quest": null,
                "follow_info": null,
                "party_info": null,
                "unfinished_play_id": null,
                "carnival_event": null,
                "ranking_event": null,
                "score_attack_event": null,
                "solo_time_attack_event": null,
                "user_notice_list": [],
                "user_periodic_reward_point_list": []
            }
        });
    }));
    // ---- abort (multi) ----
    fastify.post("/abort", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        console.log(`[MULTI] abort: viewer=${viewerId} quest=${body.quest_id} category=${body.category}`);
        if (isNaN(viewerId))
            return reply.status(400).send({
                "error": "Bad Request", "message": "Invalid request body."
            });
        const ctx = yield getViewerIdAndPlayer(viewerId);
        if (!ctx)
            return reply.status(400).send({
                "error": "Bad Request", "message": "Invalid viewer id or no player bound."
            });
        const activeQuestData = singleBattleQuest_1.activeQuests[ctx.playerId];
        if (activeQuestData) {
            if (activeQuestData.roomNumber) {
                const room = (0, multiRoom_1.getRoom)(activeQuestData.roomNumber);
                if (room && room.host_player_id === ctx.playerId) {
                    (0, sessionServer_1.notifyRoomDisbanded)(activeQuestData.roomNumber);
                    (0, multiRoom_1.disbandRoom)(activeQuestData.roomNumber);
                    console.log(`[MULTI] abort: room ${activeQuestData.roomNumber} disbanded (host abandoned)`);
                }
            }
            delete singleBattleQuest_1.activeQuests[ctx.playerId];
            (0, wdfpData_1.deletePlayerActiveQuestSync)(ctx.playerId);
        }
        const headers = (0, utils_1.generateDataHeaders)({ viewer_id: body.viewer_id });
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": headers,
            "data": {
                "user_info": {},
                "category_id": body.category,
                "is_multi": "multi",
                "start_time": headers['servertime'],
                "quest_name": "",
                "aborted_play_id": body.play_id,
                "unfinished_play_id": null,
                "drawn_quest": null,
                "party_info": null,
                "presigned_url": null
            }
        });
    }));
    // ---- play_continue (multi) ----
    fastify.post("/play_continue", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        console.log(`[MULTI] play_continue: viewer=${viewerId} quest=${body.quest_id} category=${body.category}`);
        if (isNaN(viewerId))
            return reply.status(400).send({
                "error": "Bad Request", "message": "Invalid request body."
            });
        const ctx = yield getViewerIdAndPlayer(viewerId);
        if (!ctx || !ctx.player)
            return reply.status(400).send({
                "error": "Bad Request", "message": "Invalid viewer id or no player bound."
            });
        const player = ctx.player;
        if (singleBattleQuest_1.activeQuests[ctx.playerId] === undefined)
            return reply.status(400).send({
                "error": "Bad Request", "message": "No active quest to continue."
            });
        const freeVmoney = player.freeVmoney;
        const newFreeVmoney = freeVmoney - continueVmoneyCost;
        const vmoney = player.vmoney;
        const newVmoney = 0 > newFreeVmoney ? vmoney - continueVmoneyCost : vmoney;
        if (0 > newFreeVmoney && 0 > newVmoney)
            return reply.status(400).send({
                "error": "Bad Request", "message": "Not enough vmoney to continue"
            });
        const setNewFreeVmoney = 0 > newFreeVmoney ? freeVmoney : newFreeVmoney;
        (0, wdfpData_1.updatePlayerSync)({
            id: ctx.playerId,
            freeVmoney: setNewFreeVmoney,
            vmoney: newVmoney
        });
        // increment continue count for battle recovery
        const activeData = singleBattleQuest_1.activeQuests[ctx.playerId];
        activeData.continueCount++;
        (0, wdfpData_1.updatePlayerActiveQuestContinueCountSync)(ctx.playerId, activeData.continueCount);
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
            "data": {
                "user_info": { "free_vmoney": setNewFreeVmoney, "vmoney": newVmoney },
                "mail_arrived": false
            }
        });
    }));
});
exports.default = routes;
