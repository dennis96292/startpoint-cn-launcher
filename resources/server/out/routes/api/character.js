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
exports.characterMaxOverLimits = void 0;
const wdfpData_1 = require("../../data/wdfpData");
const utils_1 = require("../../utils");
const assets_1 = require("../../lib/assets");
const character_1 = require("../../lib/character");
const utils_2 = require("../../data/utils");
const activeAccount_1 = require("../../data/activeAccount");
exports.characterMaxOverLimits = {
    [1]: 12, // 1* max over limit count
    [2]: 10, // 2* max over limit count
    [3]: 8, // 3* max over limit count 
    [4]: 6, // 4* max over limit count
    [5]: 4, // 5* max over limit count 
};
const openManaBoardRequiredUncaps = {
    [1]: 10,
    [2]: 8,
    [3]: 6,
    [4]: 4,
    [5]: 2
};
// Minimum exp to open 2nd mana board: 5★ Lv80, 4★ Lv70, 3★ Lv60
const openManaBoardRequiredExp = {
    [3]: character_1.characterExpCaps[3][0],
    [4]: character_1.characterExpCaps[4][0],
    [5]: character_1.characterExpCaps[5][0]
};
const routes = (fastify) => __awaiter(void 0, void 0, void 0, function* () {
    fastify.post("/set_illustration_settings", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        const characterId = body.character_id;
        const illustration_settings = body.illustration_settings;
        if (isNaN(viewerId) || isNaN(characterId) || !illustration_settings)
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
        if (playerId === undefined)
            return reply.status(500).send({
                "error": "Internal Server Error",
                "message": "No players bound to account."
            });
        // update character
        (0, wdfpData_1.updatePlayerCharacterSync)(playerId, characterId, {
            illustrationSettings: illustration_settings.slice(0, 6)
        });
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({
                viewer_id: viewerId
            }),
            "data": {}
        });
    }));
    fastify.post("/receive_bond_token", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const body = request.body;
        const viewerId = body.viewer_id;
        const characterId = body.character_id;
        const manaBoardIndex = body.mana_board_index;
        console.log(`[MANA] receive_bond_token: viewer=${viewerId} char=${characterId} boardIdx=${manaBoardIndex}`);
        if (isNaN(viewerId) || isNaN(characterId) || isNaN(manaBoardIndex))
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
        // get character data
        const characterData = (0, wdfpData_1.getPlayerCharacterSync)(playerId, characterId);
        if (characterData === null)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Character not owned."
            });
        const bondTokenReceivable = ((_a = characterData.bondTokenList[manaBoardIndex - 1]) === null || _a === void 0 ? void 0 : _a.status) === 1;
        if (!bondTokenReceivable)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Cannot receive bond token."
            });
        // reward the bond token
        const newBondTokens = player.bondToken + 1;
        (0, wdfpData_1.updatePlayerSync)({
            id: playerId,
            bondToken: newBondTokens
        });
        // update bond token status
        (0, wdfpData_1.updatePlayerCharacterBondTokenSync)(playerId, characterId, {
            manaBoardIndex: manaBoardIndex,
            status: 2
        });
        // build bond token list for response
        let bondTokenList = [];
        for (const entry of characterData.bondTokenList) {
            const entryIndex = entry.manaBoardIndex;
            bondTokenList.push({
                "mana_board_index": entryIndex,
                "status": entryIndex === manaBoardIndex ? 2 : entry.status
            });
        }
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({
                viewer_id: viewerId
            }),
            "data": {
                "user_info": {
                    "bond_token": newBondTokens
                },
                "character_list": [
                    {
                        "character_id": characterId,
                        "bond_token_list": bondTokenList,
                        "create_time": (0, utils_2.clientSerializeDate)(characterData.joinTime),
                        "update_time": (0, utils_2.clientSerializeDate)(characterData.updateTime),
                        "join_time": (0, utils_2.clientSerializeDate)(characterData.joinTime)
                    }
                ],
                "mail_arrived": false
            }
        });
    }));
    fastify.post("/open_mana_board", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _b, _c;
        const body = request.body;
        const viewerId = body.viewer_id;
        const characterId = body.character_id;
        const manaBoardIndex = body.mana_board_index;
        console.log(`[MANA] open_mana_board: viewer=${viewerId} char=${characterId} boardIdx=${manaBoardIndex}`);
        if (isNaN(viewerId) || isNaN(characterId) || isNaN(manaBoardIndex))
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
                "message": "No players bound to account."
            });
        // get character data
        const characterData = (0, wdfpData_1.getPlayerCharacterSync)(playerId, characterId);
        if (characterData === null)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Character not owned."
            });
        // get character asset data
        const characterAssetData = (0, assets_1.getCharacterDataSync)(characterId);
        if (characterAssetData === null)
            return reply.status(500).send({
                "error": "Internal Server Error",
                "message": "No character asset data found."
            });
        // make sure that the mana board index is valid, auto-create missing bond tokens
        if (!characterData.bondTokenList[manaBoardIndex - 1]) {
            const boardCount = (0, assets_1.getCharacterManaBoardCountSync)(characterId);
            console.log(`[MANA] open_mana_board: auto-creating bond tokens, bondListLen=${characterData.bondTokenList.length} boardCount=${boardCount}`);
            for (let i = characterData.bondTokenList.length + 1; i <= boardCount; i++) {
                (0, wdfpData_1.insertPlayerCharacterBondTokenSync)(playerId, characterId, {
                    manaBoardIndex: i,
                    status: 0
                });
                characterData.bondTokenList.push({
                    manaBoardIndex: i,
                    status: 0
                });
            }
        }
        // ensure that the mana board can be opened
        const requiredLevelExp = openManaBoardRequiredExp[characterAssetData.rarity];
        if (requiredLevelExp !== undefined && requiredLevelExp > characterData.exp) {
            console.log(`[MANA] open_mana_board FAIL: exp too low, need=${requiredLevelExp} have=${characterData.exp} rarity=${characterAssetData.rarity}`);
            return reply.status(400).send({
                "error": "Bad Request",
                "message": `Character level is too low to unlock mana board.`
            });
        }
        if (openManaBoardRequiredUncaps[characterAssetData.rarity] > characterData.overLimitStep) {
            console.log(`[MANA] open_mana_board FAIL: uncap too low, need=${openManaBoardRequiredUncaps[characterAssetData.rarity]} have=${characterData.overLimitStep} rarity=${characterAssetData.rarity}`);
            return reply.status(400).send({
                "error": "Bad Request",
                "message": `Character is not uncapped enough to unlock mana board.`
            });
        }
        if (1 > ((_b = characterData.bondTokenList[manaBoardIndex - 2]) === null || _b === void 0 ? void 0 : _b.status)) {
            console.log(`[MANA] open_mana_board FAIL: prev node not unlocked, prevIdx=${manaBoardIndex - 2} prevStatus=${(_c = characterData.bondTokenList[manaBoardIndex - 2]) === null || _c === void 0 ? void 0 : _c.status} bondList=${JSON.stringify(characterData.bondTokenList)}`);
            return reply.status(400).send({
                "error": "Bad Request",
                "message": `Must unlock all previous mana board nodes.`
            });
        }
        (0, wdfpData_1.updatePlayerCharacterSync)(playerId, characterId, {
            manaBoardIndex: manaBoardIndex
        });
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({
                viewer_id: viewerId
            }),
            "data": {
                "character_list": [
                    {
                        "viewer_id": viewerId,
                        "character_id": characterId,
                        "mana_board_index": manaBoardIndex,
                        "create_time": (0, utils_2.clientSerializeDate)(characterData.joinTime),
                        "update_time": (0, utils_2.clientSerializeDate)(characterData.updateTime),
                        "join_time": (0, utils_2.clientSerializeDate)(characterData.joinTime)
                    }
                ],
                "mail_arrived": false
            }
        });
    }));
    fastify.post("/learn_mana_node", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _d;
        const body = request.body;
        const viewerId = body.viewer_id;
        const characterId = body.character_id;
        const toUnlockNodeIds = body.mana_node_multiplied_id_list;
        console.log(`[MANA] learn_mana_node: viewer=${viewerId} char=${characterId} nodes=${JSON.stringify(toUnlockNodeIds)}`);
        if (!viewerId || isNaN(viewerId) || !characterId || isNaN(characterId) || !toUnlockNodeIds)
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
        // get character data
        const characterData = (0, wdfpData_1.getPlayerCharacterSync)(playerId, characterId);
        if (characterData === null)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Character not owned."
            });
        // compute the combined cost of each node
        let manaCost = 0;
        const itemsCosts = {};
        const userCharacterManaNodeListItem = [];
        // get mana node data from assets
        const currentManaNodeIndex = characterData.manaBoardIndex;
        const characterManaNodes = (0, assets_1.getCharacterManaNodesSync)(characterId, currentManaNodeIndex);
        if (characterManaNodes === null)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": `Character does not have mana nodes of index '${currentManaNodeIndex}'.`
            });
        // get currently unlocked nodes
        const unlockedManaNodes = (0, wdfpData_1.getPlayerCharacterManaNodesSync)(playerId, characterId);
        const unlockedManaNodesRecord = {};
        let indexUnlockedNodesCount = 0; // the number of nodes that have been unlocked for the selected index
        for (const manaNodeId of unlockedManaNodes) {
            unlockedManaNodesRecord[manaNodeId] = true;
            indexUnlockedNodesCount += characterManaNodes[manaNodeId] === undefined ? 0 : 1;
        }
        for (const manaNodeId of toUnlockNodeIds) {
            if (unlockedManaNodesRecord[manaNodeId])
                return reply.status(400).send({
                    "error": "Bad Request",
                    "message": `Mana node '${manaNodeId}' already unlocked.`
                });
            const nodeData = characterManaNodes[manaNodeId];
            if (nodeData === undefined)
                return reply.status(400).send({
                    "error": "Bad Request",
                    "message": `Mana node '${manaNodeId}' does not exist.`
                });
            if (nodeData !== null) {
                manaCost += nodeData.manaCost;
                for (const [itemId, itemCost] of Object.entries(nodeData.items)) {
                    const existing = itemsCosts[itemId];
                    itemsCosts[itemId] = existing ? existing + itemCost : itemCost;
                }
                userCharacterManaNodeListItem.push({
                    "multiplied_id": manaNodeId,
                    "awake_level": 0
                });
            }
        }
        // validate that the player has enough materials to unlock these nodes
        // Deduct free_mana first, then paid_mana
        let remaining = manaCost;
        let newFreeMana = player.freeMana;
        let newPaidMana = player.paidMana;
        if (remaining <= newFreeMana) {
            newFreeMana -= remaining;
            remaining = 0;
        }
        else {
            remaining -= newFreeMana;
            newFreeMana = 0;
            newPaidMana -= remaining;
            remaining = 0;
        }
        if (newFreeMana < 0 || newPaidMana < 0)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Not enough mana."
            });
        for (const [itemId, itemCost] of Object.entries(itemsCosts)) {
            const item = (0, wdfpData_1.getPlayerItemSync)(playerId, itemId);
            const newAmount = item === null ? -1 : item - itemCost;
            if (0 > newAmount)
                return reply.status(400).send({
                    "error": "Bad Request",
                    "message": `Not enough of item with id ${itemId}`
                });
            // replace the object value with the newAmount for deduction later
            itemsCosts[itemId] = newAmount;
        }
        // deduct mana (free first, then paid)
        (0, wdfpData_1.updatePlayerSync)({
            id: playerId,
            freeMana: newFreeMana,
            paidMana: newPaidMana
        });
        // deduct item amounts
        for (const [itemId, newAmount] of Object.entries(itemsCosts)) {
            (0, wdfpData_1.updatePlayerItemSync)(playerId, itemId, newAmount);
        }
        let characterEvolutionLevel = characterData.evolutionLevel;
        let evolutionData = [];
        // give bond reward, if available
        const amityScrollReceivable = ((_d = characterData.bondTokenList[currentManaNodeIndex - 1]) === null || _d === void 0 ? void 0 : _d.status) === 0;
        const bondTokenList = [];
        const isBoardComplete = (indexUnlockedNodesCount + toUnlockNodeIds.length) === Object.keys(characterManaNodes).length;
        if (amityScrollReceivable && isBoardComplete) {
            (0, wdfpData_1.updatePlayerCharacterBondTokenSync)(playerId, characterId, {
                manaBoardIndex: currentManaNodeIndex,
                status: 1
            });
            for (const entry of characterData.bondTokenList) {
                const entryIndex = entry.manaBoardIndex;
                bondTokenList.push({
                    "mana_board_index": entryIndex,
                    "status": entryIndex === currentManaNodeIndex ? 1 : entry.status
                });
            }
            // Evolution level: only bump when ALL ability-slot nodes (hash=1) are learned per isAbilitiesEvolution()
            if (characterEvolutionLevel === 0) {
                characterEvolutionLevel = 1;
                (0, wdfpData_1.updatePlayerCharacterSync)(playerId, characterId, {
                    evolutionLevel: characterEvolutionLevel
                });
                evolutionData = {
                    "character_id": characterId,
                    "level": 1,
                    "img_level": 1
                };
            }
        }
        console.log(`[MANA] learn_mana_node done: boardComplete=${isBoardComplete} bondGiven=${amityScrollReceivable && isBoardComplete} evoLevel=${characterEvolutionLevel} bondList=${JSON.stringify(bondTokenList)}`);
        // insert new mana nodes
        (0, wdfpData_1.insertPlayerCharacterManaNodesSync)(playerId, characterId, toUnlockNodeIds);
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({
                viewer_id: viewerId
            }),
            "data": {
                "user_info": {
                    "free_mana": newFreeMana,
                    "paid_mana": newPaidMana
                },
                "character_list": [
                    {
                        "evolution_level": characterEvolutionLevel,
                        "evolution_img_level": characterEvolutionLevel,
                        "character_id": characterId,
                        "create_time": (0, utils_2.clientSerializeDate)(characterData.joinTime),
                        "update_time": (0, utils_2.clientSerializeDate)(characterData.updateTime),
                        "join_time": (0, utils_2.clientSerializeDate)(characterData.joinTime),
                        "bond_token_list": bondTokenList
                    }
                ],
                "evolution": evolutionData,
                "item_list": itemsCosts,
                "user_character_mana_node_list": {
                    [String(characterId)]: userCharacterManaNodeListItem
                },
                "mail_arrived": false
            }
        });
    }));
    fastify.post("/over_limit", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
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
        // get character data
        const characterId = body.character_id;
        const playerCharacterData = (0, wdfpData_1.getPlayerCharacterSync)(playerId, characterId);
        if (playerCharacterData === null)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Character not owned."
            });
        // get character asset data
        const characterAssetData = (0, assets_1.getCharacterDataSync)(characterId);
        if (characterAssetData === null)
            return reply.status(500).send({
                "error": "Internal Server Error",
                "message": "No character asset data found."
            });
        // calculate new over limit
        const overLimitCount = body.over_limit_count;
        const newOverLimit = playerCharacterData.overLimitStep + overLimitCount;
        const characterRarity = characterAssetData.rarity;
        if (newOverLimit > exports.characterMaxOverLimits[characterRarity])
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Character cannot be uncapped further."
            });
        let stack = playerCharacterData.stack;
        const item_list = {};
        if (body.use_stack) {
            // stack uncapping
            // ensure that the character has enough stack
            stack = stack - overLimitCount;
            if (0 > stack)
                return reply.status(400).send({
                    "error": "Bad Request",
                    "message": "Character does not have enough duplicates to uncap."
                });
            // update the character
            (0, wdfpData_1.updatePlayerCharacterSync)(playerId, characterId, {
                overLimitStep: newOverLimit,
                stack: stack
            });
        }
        else {
            // item uncapping
            const itemId = body.item_id;
            // ensure that the item trying to be used is valid
            // 5* characters can only be uncapped by item 10003 (awaking_crystal_5)
            // 4* characters and below can only be uncapped by items 10002 (awaking_crystal_4) and 10001 (awaking_crystal_3)
            if ((characterRarity === 5 && itemId !== 10003)
                || (4 >= characterRarity && (itemId !== 10002 && itemId !== 10001)))
                return reply.status(400).send({
                    "error": "Bad Request",
                    "message": "Attempted to use invalid item."
                });
            const itemData = (0, wdfpData_1.getPlayerItemSync)(playerId, itemId);
            if (itemData === null)
                return reply.status(400).send({
                    "error": "Bad Request",
                    "message": "Attempted to use unowned item."
                });
            // make sure that the player has enough of the item
            const newAmount = itemData - overLimitCount;
            if (0 > newAmount)
                return reply.status(400).send({
                    "error": "Bad Request",
                    "message": "Not enough of item to uncap."
                });
            // update the item count
            (0, wdfpData_1.updatePlayerItemSync)(playerId, itemId, newAmount);
            item_list[itemId] = newAmount; // add to items table
            // update the character
            (0, wdfpData_1.updatePlayerCharacterSync)(playerId, characterId, {
                overLimitStep: newOverLimit
            });
        }
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({
                viewer_id: viewerId
            }),
            "data": {
                "character_list": [
                    {
                        "over_limit_step": newOverLimit,
                        "character_id": characterId,
                        "stack": stack,
                        "create_time": (0, utils_2.clientSerializeDate)(playerCharacterData.joinTime),
                        "update_time": (0, utils_2.clientSerializeDate)(new Date()),
                        "join_time": (0, utils_2.clientSerializeDate)(playerCharacterData.joinTime)
                    }
                ],
                "item_list": item_list,
                "mail_arrived": false
            }
        });
    }));
    fastify.post("/bulk_over_limit", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        if (!viewerId || isNaN(viewerId))
            return reply.status(400).send({
                error: "Bad Request", message: "Invalid request body.",
            });
        const viewerIdSession = yield (0, wdfpData_1.getSession)(viewerId.toString());
        if (!viewerIdSession)
            return reply.status(400).send({
                error: "Bad Request", message: "Invalid viewer id.",
            });
        const playerId = (0, activeAccount_1.resolvePlayerIdSync)(viewerIdSession.accountId);
        const player = playerId !== null ? (0, wdfpData_1.getPlayerSync)(playerId) : null;
        if (player === null)
            return reply.status(500).send({
                error: "Internal Server Error", message: "No players bound to account.",
            });
        const characters = (0, wdfpData_1.getPlayerCharactersSync)(playerId);
        console.log(`[bulk_over_limit] player=${playerId} totalChars=${Object.keys(characters).length}`);
        const characterList = [];
        for (const [charId, charData] of Object.entries(characters)) {
            if (charData.stack <= 0)
                continue;
            const assetData = (0, assets_1.getCharacterDataSync)(Number(charId));
            if (!assetData)
                continue;
            const maxOver = exports.characterMaxOverLimits[assetData.rarity];
            if (maxOver === undefined)
                continue;
            const rest = maxOver - charData.overLimitStep;
            if (rest <= 0)
                continue;
            const count = Math.min(charData.stack, rest);
            const newOverLimit = charData.overLimitStep + count;
            const newStack = charData.stack - count;
            (0, wdfpData_1.updatePlayerCharacterSync)(playerId, Number(charId), {
                overLimitStep: newOverLimit,
                stack: newStack,
            });
            characterList.push({
                character_id: Number(charId),
                over_limit_step: newOverLimit,
                stack: newStack,
                create_time: (0, utils_2.clientSerializeDate)(charData.joinTime),
                update_time: (0, utils_2.clientSerializeDate)(new Date()),
                join_time: (0, utils_2.clientSerializeDate)(charData.joinTime),
            });
        }
        console.log(`[bulk_over_limit] done: ${characterList.length} characters modified`);
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            data_headers: (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
            data: {
                character_list: characterList,
                mail_arrived: false,
            },
        });
    }));
    fastify.post("/add_character_from_town", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _e, _f;
        const body = request.body;
        const viewerId = body.viewer_id;
        const characterId = body.character_id;
        if (!viewerId || isNaN(viewerId) || !characterId || isNaN(characterId))
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
        (0, character_1.givePlayerCharacterSync)(playerId, characterId);
        // Return character_list so the framework updates local player data
        const charData = (0, wdfpData_1.getPlayerCharacterSync)(playerId, characterId);
        const characterList = charData ? [{
                "character_id": characterId,
                "entry_count": charData.entryCount,
                "evolution_level": charData.evolutionLevel,
                "bond_token_list": (_f = (_e = charData.bondTokenList) === null || _e === void 0 ? void 0 : _e.map(bt => ({
                    "mana_board_index": bt.manaBoardIndex,
                    "status": bt.status
                }))) !== null && _f !== void 0 ? _f : [],
                "create_time": (0, utils_2.clientSerializeDate)(charData.joinTime),
                "update_time": (0, utils_2.clientSerializeDate)(charData.updateTime),
                "join_time": (0, utils_2.clientSerializeDate)(charData.joinTime)
            }] : [];
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
            "data": {
                "character_list": characterList,
                "mail_arrived": false
            }
        });
    }));
});
exports.default = routes;
