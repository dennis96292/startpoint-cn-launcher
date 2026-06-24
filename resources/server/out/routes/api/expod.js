"use strict";
// Handles the insertion of mana into characters.
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
const character_1 = require("./character");
const character_2 = require("../../lib/character");
const utils_1 = require("../../utils");
const assets_1 = require("../../lib/assets");
const utils_2 = require("../../data/utils");
const activeAccount_1 = require("../../data/activeAccount");
const rarityStackConvertItemCount = {
    [1]: 2,
    [2]: 2,
    [3]: 2,
    [4]: 10,
    [5]: 30
};
const rewardItemId = 990008;
const rarityStackConvertExp = {
    [1]: 500,
    [2]: 500,
    [3]: 500,
    [4]: 2000,
    [5]: 10000
};
const routes = (fastify) => __awaiter(void 0, void 0, void 0, function* () {
    fastify.post("/stack_to_exp", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        const characterId = body.character_id;
        const convertCount = body.number;
        if (isNaN(viewerId) || isNaN(characterId) || isNaN(convertCount))
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
        // get character asset data
        const characterAssetData = (0, assets_1.getCharacterDataSync)(characterId);
        if (characterAssetData === null)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Character does not exist."
            });
        // get character
        const character = (0, wdfpData_1.getPlayerCharacterSync)(playerId, characterId);
        if (character === null)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Player does not own character."
            });
        const afterStack = character.stack - convertCount;
        if (0 > afterStack)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Not enough stack."
            });
        // get amounts to add
        const rarity = characterAssetData.rarity;
        const increaseExp = rarityStackConvertExp[rarity] * convertCount;
        const increaseItemCount = rarityStackConvertItemCount[rarity] * convertCount;
        const afterExp = player.expPool + increaseExp;
        // update player
        (0, wdfpData_1.updatePlayerSync)({
            id: playerId,
            expPool: afterExp
        });
        // add item
        const afterItemCount = (0, wdfpData_1.givePlayerItemSync)(playerId, rewardItemId, increaseItemCount);
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({
                viewer_id: viewerId
            }),
            "data": {
                "user_info": {
                    "exp_pool": afterExp,
                    "exp_pooled_time": (0, utils_1.getServerTime)(player.expPooledTime)
                },
                "character_list": [
                    {
                        "viewer_id": viewerId,
                        "character_id": characterId,
                        "stack": afterStack,
                        "exp": character.exp,
                        "exp_total": character.exp,
                        "create_time": (0, utils_2.clientSerializeDate)(character.joinTime),
                        "update_time": (0, utils_2.clientSerializeDate)(character.updateTime),
                        "join_time": (0, utils_2.clientSerializeDate)(character.joinTime)
                    }
                ],
                "converted_exp_info": {
                    "add_exp": increaseExp
                },
                "item_list": {
                    [rewardItemId]: afterItemCount
                },
                "mail_arrived": false
            }
        });
    }));
    fastify.post("/bulk_stack_to_exp", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c;
        const body = request.body;
        const viewerId = body.viewer_id;
        if (isNaN(viewerId))
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Invalid request body."
            });
        const session = yield (0, wdfpData_1.getSession)(viewerId.toString());
        if (!session)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Invalid viewer id."
            });
        const playerId = (0, activeAccount_1.resolvePlayerIdSync)(session.accountId);
        const player = playerId !== null ? (0, wdfpData_1.getPlayerSync)(playerId) : null;
        if (player === null)
            return reply.status(500).send({
                "error": "Internal Server Error",
                "message": "No players bound to account."
            });
        const allCharacters = (0, wdfpData_1.getPlayerCharactersSync)(playerId);
        const modifiedCharacters = [];
        let totalExp = 0;
        let totalStarGrains = 0;
        let processedCount = 0;
        for (const [characterIdStr, character] of Object.entries(allCharacters)) {
            const characterId = parseInt(characterIdStr);
            if (character.stack <= 0)
                continue;
            const charAsset = (0, assets_1.getCharacterDataSync)(characterId);
            if (!charAsset)
                continue;
            const rarity = charAsset.rarity;
            const maxOver = (_a = character_1.characterMaxOverLimits[rarity]) !== null && _a !== void 0 ? _a : 0;
            if (character.overLimitStep < maxOver)
                continue;
            const stack = character.stack;
            const addExp = ((_b = rarityStackConvertExp[rarity]) !== null && _b !== void 0 ? _b : 0) * stack;
            const addStarGrain = ((_c = rarityStackConvertItemCount[rarity]) !== null && _c !== void 0 ? _c : 0) * stack;
            totalExp += addExp;
            totalStarGrains += addStarGrain;
            (0, wdfpData_1.updatePlayerCharacterSync)(playerId, characterId, { stack: 0 });
            character.stack = 0;
            modifiedCharacters.push({
                "viewer_id": viewerId,
                "character_id": characterId,
                "stack": 0,
                "over_limit_step": character.overLimitStep,
                "exp": character.exp,
                "exp_total": character.exp,
                "create_time": (0, utils_2.clientSerializeDate)(character.joinTime),
                "update_time": (0, utils_2.clientSerializeDate)(character.updateTime),
                "join_time": (0, utils_2.clientSerializeDate)(character.joinTime)
            });
            processedCount++;
        }
        if (processedCount === 0) {
            reply.header("content-type", "application/x-msgpack");
            return reply.status(200).send({
                "data_headers": (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
                "data": {
                    "character_list": [],
                    "converted_exp_info": { "add_exp": 0 },
                    "item_list": (0, wdfpData_1.getPlayerItemsSync)(playerId),
                    "user_info": {
                        "exp_pool": player.expPool,
                        "exp_pooled_time": (0, utils_1.getServerTime)(player.expPooledTime)
                    },
                    "mail_arrived": false
                }
            });
        }
        const newExpPool = player.expPool + totalExp;
        (0, wdfpData_1.updatePlayerSync)({ id: playerId, expPool: newExpPool });
        let newStarGrainTotal = 0;
        if (totalStarGrains > 0) {
            newStarGrainTotal = (0, wdfpData_1.givePlayerItemSync)(playerId, rewardItemId, totalStarGrains);
        }
        const items = (0, wdfpData_1.getPlayerItemsSync)(playerId);
        if (totalStarGrains > 0) {
            items[String(rewardItemId)] = newStarGrainTotal;
        }
        console.log(`[BULK_STACK_EXP] player ${playerId}: ${processedCount} characters converted, exp +${totalExp}, starGrain +${totalStarGrains}, expPool ${player.expPool}→${newExpPool}`);
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
            "data": {
                "character_list": modifiedCharacters,
                "converted_exp_info": { "add_exp": totalExp },
                "item_list": items,
                "user_info": {
                    "exp_pool": newExpPool,
                    "exp_pooled_time": (0, utils_1.getServerTime)(player.expPooledTime)
                },
                "mail_arrived": false
            }
        });
    }));
    fastify.post("/inject_exp", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
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
        // increase character exp
        const characterId = body.character_id;
        const character = (0, wdfpData_1.getPlayerCharacterSync)(playerId, characterId);
        if (character === null)
            return reply.status(400).send({
                "error": "Internal Server Error",
                "message": "Player does not own character."
            });
        // make sure that the player has enough exp
        const addExp = Math.abs(body.exp);
        const playerExpPool = player.expPool;
        if (addExp > playerExpPool)
            return reply.status(400).send({
                "error": "Internal Server Error",
                "message": "Not enough exp."
            });
        const playerAfterExpPool = player.expPool - addExp;
        // decrease player exp
        (0, wdfpData_1.updatePlayerSync)({
            id: playerId,
            expPool: playerAfterExpPool
        });
        // add exp to the character
        const rewardResult = (0, character_2.givePlayerCharactersExpSync)(playerId, [characterId], addExp, false);
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({
                viewer_id: viewerId
            }),
            "data": {
                "add_exp_list": rewardResult.add_exp_list,
                "character_list": rewardResult.character_list,
                "user_info": {
                    "exp_pool": rewardResult.exp_pool,
                    "exp_pooled_time": (0, utils_1.getServerTime)(player.expPooledTime)
                },
            }
        });
    }));
});
exports.default = routes;
