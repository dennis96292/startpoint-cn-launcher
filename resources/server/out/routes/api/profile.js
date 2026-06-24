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
// removed getAccountPlayers "../../data/wdfpData";
const utils_1 = require("../../utils");
const routes = (fastify) => __awaiter(void 0, void 0, void 0, function* () {
    fastify.post("/get_my_profile", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c;
        const body = request.body;
        const viewerId = body.viewer_id;
        if (!viewerId || isNaN(viewerId))
            return reply.status(400).send({
                error: "Bad Request",
                message: "Invalid request body."
            });
        const session = yield (0, wdfpData_1.getSession)(viewerId.toString());
        if (!session)
            return reply.status(400).send({
                error: "Bad Request",
                message: "Invalid viewer id."
            });
        const playerId = (0, activeAccount_1.resolvePlayerIdSync)(session.accountId);
        if (playerId === null)
            return reply.status(400).send({
                error: "Bad Request",
                message: "No player bound to account."
            });
        const player = (0, wdfpData_1.getPlayerSync)(playerId);
        if (!player)
            return reply.status(400).send({ error: "Bad Request", message: "Player not found." });
        const characters = (0, wdfpData_1.getPlayerCharactersSync)(playerId);
        const charCount = Object.keys(characters).length;
        // Build party group list (map from DB format to client format)
        const partyGroups = (0, wdfpData_1.getPlayerPartyGroupListSync)(playerId);
        const partyGroupList = [];
        for (const [groupId, group] of Object.entries(partyGroups)) {
            const parties = group.list || {};
            const partyList = [];
            for (const [slot, party] of Object.entries(parties)) {
                const p = party;
                partyList.push({
                    ability_soul_ids: (p.abilitySoulIds || []).map((id) => id),
                    character_ids: (p.characterIds || []).map((id) => id),
                    equipment_ids: (p.equipmentIds || []).map((id) => id),
                    options: { allow_other_players_to_heal_me: (_b = (_a = p.options) === null || _a === void 0 ? void 0 : _a.allowOtherPlayersToHealMe) !== null && _b !== void 0 ? _b : true },
                    party_edited: (_c = p.edited) !== null && _c !== void 0 ? _c : false,
                    party_id: parseInt(slot),
                    party_name: p.name || "",
                    unison_character_ids: (p.unisonCharacterIds || []).map((id) => id),
                });
            }
            partyGroupList.push({
                party_group_color_id: group.colorId || 15,
                party_group_id: parseInt(groupId),
                party_list: partyList,
            });
        }
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            data_headers: (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
            data: {
                profile_info: {
                    max_opened_mana_board_second_count: 0,
                    max_owned_character_count: charCount,
                    max_owned_degree_count: 1,
                    opened_mana_board_second_count: 0,
                    owned_character_count: charCount,
                    owned_degree_count: 1,
                },
                profile_settings: {
                    show_opened_mana_board_second_count: false,
                    show_owned_character_count: true,
                    show_owned_degree_count: true,
                },
                user_party_group_list: partyGroupList,
            }
        });
    }));
    // Returns the player's last login region (CN-specific)
    fastify.post("/get_last_login_region", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        if (!viewerId || isNaN(viewerId))
            return reply.status(400).send({
                error: "Bad Request",
                message: "Invalid request body."
            });
        const session = yield (0, wdfpData_1.getSession)(viewerId.toString());
        if (!session)
            return reply.status(400).send({
                error: "Bad Request",
                message: "Invalid viewer id."
            });
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            data_headers: (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
            data: {
                region: "CN",
            }
        });
    }));
    // Returns owned degree IDs for title selection
    fastify.post("/get_degree_list", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        if (!viewerId || isNaN(viewerId))
            return reply.status(400).send({
                error: "Bad Request",
                message: "Invalid request body."
            });
        const session = yield (0, wdfpData_1.getSession)(viewerId.toString());
        if (!session)
            return reply.status(400).send({
                error: "Bad Request",
                message: "Invalid viewer id."
            });
        const playerId = (0, activeAccount_1.resolvePlayerIdSync)(session.accountId);
        const player = playerId !== null ? (0, wdfpData_1.getPlayerSync)(playerId) : null;
        const degreeId = (player === null || player === void 0 ? void 0 : player.degreeId) || 1;
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            data_headers: (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
            data: {
                degree_ids: [degreeId],
            }
        });
    }));
    // Update profile visibility settings (echo back, don't persist)
    fastify.post("/update_profile_settings", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _d, _e, _f;
        const body = request.body;
        const viewerId = body.viewer_id;
        if (!viewerId || isNaN(viewerId))
            return reply.status(400).send({
                error: "Bad Request",
                message: "Invalid request body."
            });
        const session = yield (0, wdfpData_1.getSession)(viewerId.toString());
        if (!session)
            return reply.status(400).send({
                error: "Bad Request",
                message: "Invalid viewer id."
            });
        const settings = body.profile_settings || {};
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            data_headers: (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
            data: {
                profile_settings: {
                    show_opened_mana_board_second_count: (_d = settings.show_opened_mana_board_second_count) !== null && _d !== void 0 ? _d : false,
                    show_owned_character_count: (_e = settings.show_owned_character_count) !== null && _e !== void 0 ? _e : false,
                    show_owned_degree_count: (_f = settings.show_owned_degree_count) !== null && _f !== void 0 ? _f : false,
                }
            }
        });
    }));
    // Update profile comment
    fastify.post("/update_comment", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        if (!viewerId || isNaN(viewerId))
            return reply.status(400).send({
                error: "Bad Request",
                message: "Invalid request body."
            });
        const session = yield (0, wdfpData_1.getSession)(viewerId.toString());
        if (!session)
            return reply.status(400).send({
                error: "Bad Request",
                message: "Invalid viewer id."
            });
        const playerId = (0, activeAccount_1.resolvePlayerIdSync)(session.accountId);
        if (playerId === null)
            return reply.status(400).send({
                error: "Bad Request",
                message: "No player bound to account."
            });
        const comment = (body.comment || "").substring(0, 100);
        (0, wdfpData_1.updatePlayerSync)({ id: playerId, comment });
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            data_headers: (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
            data: { comment },
        });
    }));
    // Rename player
    fastify.post("/rename", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        if (!viewerId || isNaN(viewerId))
            return reply.status(400).send({
                error: "Bad Request",
                message: "Invalid request body."
            });
        const session = yield (0, wdfpData_1.getSession)(viewerId.toString());
        if (!session)
            return reply.status(400).send({
                error: "Bad Request",
                message: "Invalid viewer id."
            });
        const playerId = (0, activeAccount_1.resolvePlayerIdSync)(session.accountId);
        if (playerId === null)
            return reply.status(400).send({
                error: "Bad Request",
                message: "No player bound to account."
            });
        const name = (body.name || "").substring(0, 20);
        (0, wdfpData_1.updatePlayerSync)({ id: playerId, name });
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            data_headers: (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
            data: { name },
        });
    }));
});
exports.default = routes;
