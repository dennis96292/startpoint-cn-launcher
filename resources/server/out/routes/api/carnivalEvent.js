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
const player_1 = require("../../data/domains/player");
const utils_1 = require("../../data/utils");
const utils_2 = require("../../utils");
const types_1 = require("../../data/types");
function buildCarnivalPartyGroupList(playerId) {
    // 1. Try to get saved EVENT party groups
    let groups = (0, wdfpData_1.getPlayerPartyGroupListSync)(playerId, types_1.PartyCategory.EVENT);
    // 2. First time - create empty EVENT defaults (independent from NORMAL pool)
    if (Object.keys(groups).length === 0) {
        groups = (0, player_1.getDefaultPlayerPartyGroupsSync)(types_1.PartyCategory.EVENT);
        (0, wdfpData_1.insertPlayerPartyGroupListSync)(playerId, groups);
    }
    const serialized = (0, utils_1.serializePartyGroupList)(groups);
    // Convert to array format the client expects
    const result = [];
    for (const [groupId, group] of Object.entries(serialized)) {
        const partyList = [];
        const list = group.list || {};
        for (const [partyId, party] of Object.entries(list)) {
            const p = party;
            partyList.push({
                "party_id": parseInt(partyId),
                "party_name": p.name || "Party",
                "party_edited": p.edited || false,
                "character_ids": p.character_ids || [null, null, null],
                "unison_character_ids": p.unison_character_ids || [null, null, null],
                "equipment_ids": p.equipment_ids || [null, null, null],
                "ability_soul_ids": p.ability_soul_ids || [null, null, null],
                "options": p.options || { "allow_other_players_to_heal_me": true }
            });
        }
        result.push({
            "party_group_id": parseInt(groupId),
            "party_group_color_id": group.color_id || 0,
            "party_list": partyList
        });
    }
    return result;
}
const routes = (fastify) => __awaiter(void 0, void 0, void 0, function* () {
    fastify.post("/index", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
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
        const partyGroups = buildCarnivalPartyGroupList(playerId);
        // Build records from DB
        const eventId = body.event_id;
        const dbRecords = (0, wdfpData_1.getPlayerCarnivalEventRecordsSync)(playerId, eventId);
        const records = dbRecords.map(r => {
            var _a, _b;
            return ({
                folder_id: r.folderId,
                best_score: r.bestScore,
                previous_score: r.previousScore,
                previous_character_ids: (_a = r.previousCharacterIds) !== null && _a !== void 0 ? _a : [null, null, null],
                previous_unison_character_ids: (_b = r.previousUnisonCharacterIds) !== null && _b !== void 0 ? _b : [null, null, null],
            });
        });
        console.log(`[CARNIVAL] response records: ${JSON.stringify(records)}`);
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_2.generateDataHeaders)({ viewer_id: viewerId }),
            "data": {
                "records": records,
                "user_party_group_list": partyGroups
            }
        });
    }));
    fastify.post("/get_party", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
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
        const partyGroups = buildCarnivalPartyGroupList(playerId);
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_2.generateDataHeaders)({ viewer_id: viewerId }),
            "data": {
                "user_party_group_list": partyGroups
            }
        });
    }));
});
exports.default = routes;
