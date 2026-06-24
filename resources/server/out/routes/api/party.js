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
const utils_1 = require("../../utils");
const activeAccount_1 = require("../../data/activeAccount");
const routes = (fastify) => __awaiter(void 0, void 0, void 0, function* () {
    fastify.post("/publish", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
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
        if (playerId === null)
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
                "party_code": "https://www.howLongCanThisBe?=+-.comhttps://www.howLongCanThisBe?=+-.comhttps://www.howLongCanThisBe?=+-.com"
            }
        });
    }));
    fastify.post("/edit", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c;
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
        // parse global PartyId: (groupIndex * 10 + slot), groupIndex 0-based
        const parsePartyId = (partyId) => {
            const gIdx = Math.floor((partyId - 1) / 10);
            const s = ((partyId - 1) % 10) + 1;
            return { groupIndex: gIdx, groupId: gIdx + 1, slot: s };
        };
        // store full global PartyId so /load returns the correct group+slot combo
        if (player.partySlot !== body.main_party_id) {
            (0, wdfpData_1.updatePlayerSync)({
                id: playerId,
                partySlot: body.main_party_id
            });
        }
        // update each slot
        const characterOwnedMap = {};
        const equipmentOwnedMap = {};
        const editCategories = [];
        for (const updateInfo of body.party_info_list) {
            editCategories.push(updateInfo.party_category);
        }
        console.log(`[PARTY] edit: viewer=${viewerId} parties=${body.party_info_list.length} categories=${JSON.stringify(editCategories)} mainPartyId=${body.main_party_id}`);
        const mapOwnedCharacters = (characterId) => {
            let isOwned = characterId === null ? false : characterOwnedMap[characterId];
            if (isOwned === undefined) {
                isOwned = (0, wdfpData_1.playerOwnsCharacterSync)(playerId, characterId);
                characterOwnedMap[characterId] = isOwned;
            }
            return isOwned ? characterId : null;
        };
        const mapOwnedEquipment = (equipmentId) => {
            let isOwned = equipmentId === null ? false : equipmentOwnedMap[equipmentId];
            if (isOwned === undefined) {
                isOwned = (0, wdfpData_1.playerOwnsEquipmentSync)(playerId, equipmentId);
                equipmentOwnedMap[equipmentId] = isOwned;
            }
            return isOwned ? equipmentId : null;
        };
        for (const updateInfo of body.party_info_list) {
            const parsed = parsePartyId(updateInfo.party_id);
            console.log(`[PARTY] edit: player=${playerId} id=${updateInfo.party_id} -> group=${parsed.groupId} slot=${parsed.slot} name="${updateInfo.party_name}" chars=${((_a = updateInfo.character_ids) === null || _a === void 0 ? void 0 : _a.filter(Boolean).length) || 0}`);
            (0, wdfpData_1.updatePlayerPartySync)(playerId, parsed.slot, {
                name: updateInfo.party_name,
                unisonCharacterIds: updateInfo.unison_character_ids.map(mapOwnedCharacters),
                characterIds: updateInfo.character_ids.map(mapOwnedCharacters),
                equipmentIds: updateInfo.equipment_ids.map(mapOwnedEquipment), // TODO: Implement stack checking, to see if more equipment is being equipped than is owned.
                abilitySoulIds: updateInfo.ability_soul_ids,
                options: { allowOtherPlayersToHealMe: updateInfo.options.allow_other_players_to_heal_me },
                edited: updateInfo.party_edited,
                category: updateInfo.party_category === 3 ? 4 : updateInfo.party_category,
                currentBattlePower: (_b = updateInfo.current_battle_power) !== null && _b !== void 0 ? _b : 0,
                beforeBattlePower: (_c = updateInfo.before_battle_power) !== null && _c !== void 0 ? _c : 0
            }, parsed.groupId);
        }
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({
                viewer_id: viewerId
            }),
            "data": {
                "mail_arrived": false
            }
        });
    }));
    fastify.post("/check_word", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        if (!viewerId || isNaN(viewerId))
            return reply.status(400).send({
                "error": "Bad Request", "message": "Invalid request body."
            });
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
            "data": { "check_passed": true }
        });
    }));
});
exports.default = routes;
