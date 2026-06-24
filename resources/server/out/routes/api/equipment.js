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
const utils_1 = require("../../utils");
const equipment_1 = require("../../lib/equipment");
const activeAccount_1 = require("../../data/activeAccount");
const wrightpieceItemId = 100000;
const starGrainItemId = 990008;
// wrightpiece cost for each rank of weapon (awakening)
const equipmentUpgradeCost = [
    5,
    10,
    15,
    20,
    25
];
// wrightpiece reward for dissolving each rank of weapon
const dissolvingCraftPoints = [
    1,
    2,
    3,
    4,
    5
];
// star grain reward for dissolving each rank of weapon
const dissolvingStarGrains = [
    0,
    0,
    1,
    5,
    15
];
// wrightpiece reward for selling each rank of weapon
const equipmentSellReward = [
    0,
    0,
    1,
    5,
    15
];
const routes = (fastify) => __awaiter(void 0, void 0, void 0, function* () {
    fastify.post("/sell_equipment", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const body = request.body;
        const toSellEquipmentList = body.equipment_list;
        const viewerId = body.viewer_id;
        if (isNaN(viewerId) || toSellEquipmentList === undefined)
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
        // get wrightpieces
        let newWrightPieces = 0;
        const returnItemList = {};
        // sell stacks
        for (const toSell of toSellEquipmentList) {
            const equipmentId = toSell.equipment_id;
            const equipmentRarity = Math.floor(equipmentId / 1000000) - 1;
            // get the data for the equipment
            const playerEquipmentData = (0, wdfpData_1.getPlayerEquipmentSync)(playerId, equipmentId);
            if (playerEquipmentData === null)
                return reply.status(400).send({
                    "error": "Bad Request",
                    "message": "Player does not own equipment."
                });
            // add wright pieces
            const stack = playerEquipmentData.stack;
            newWrightPieces += ((_a = equipmentSellReward[equipmentRarity]) !== null && _a !== void 0 ? _a : 0) * stack;
            // delete equipment
            (0, wdfpData_1.deletePlayerEquipmentSync)(playerId, equipmentId);
            // give ability soul
            returnItemList[equipmentId] = (0, wdfpData_1.givePlayerItemSync)(playerId, equipmentId, stack);
        }
        // give wrightpieces
        returnItemList[wrightpieceItemId] = (0, wdfpData_1.givePlayerItemSync)(playerId, wrightpieceItemId, newWrightPieces);
        // respond to client
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({
                viewer_id: viewerId
            }),
            "data": {
                "item_list": returnItemList,
                "mail_arrived": false
            }
        });
    }));
    fastify.post("/sell_stack", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _b;
        const body = request.body;
        const toSellEquipmentList = body.equipment_list;
        const viewerId = body.viewer_id;
        if (isNaN(viewerId) || toSellEquipmentList === undefined)
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
        // get wrightpieces
        let newWrightPieces = 0;
        const returnItemList = {};
        const returnEquipmentList = [];
        // sell stacks
        for (const toSell of toSellEquipmentList) {
            const equipmentId = toSell.equipment_id;
            const sellCount = Math.max(1, toSell.number);
            const equipmentRarity = Math.floor(equipmentId / 1000000) - 1;
            // get the data for the equipment
            const playerEquipmentData = (0, wdfpData_1.getPlayerEquipmentSync)(playerId, equipmentId);
            if (playerEquipmentData === null)
                return reply.status(400).send({
                    "error": "Bad Request",
                    "message": "Player does not own equipment."
                });
            // make sure that we have enough stacks
            const newStack = playerEquipmentData.stack - sellCount;
            if (0 > newStack)
                return reply.status(400).send({
                    "error": "Bad Request",
                    "message": "Attempt to sell more stacks than owned."
                });
            newWrightPieces += ((_b = equipmentSellReward[equipmentRarity]) !== null && _b !== void 0 ? _b : 0) * sellCount;
            // update eqwuipment
            playerEquipmentData.stack = newStack;
            (0, wdfpData_1.updatePlayerEquipmentSync)(playerId, equipmentId, {
                stack: newStack
            });
            returnEquipmentList.push((0, equipment_1.clientSerializeEquipment)(equipmentId, playerEquipmentData));
            // give ability sould
            returnItemList[equipmentId] = (0, wdfpData_1.givePlayerItemSync)(playerId, equipmentId, sellCount);
        }
        // give wrightpieces
        returnItemList[wrightpieceItemId] = (0, wdfpData_1.givePlayerItemSync)(playerId, wrightpieceItemId, newWrightPieces);
        // respond to client
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({
                viewer_id: viewerId
            }),
            "data": {
                "equipment_list": returnEquipmentList,
                "item_list": returnItemList,
                "mail_arrived": false
            }
        });
    }));
    fastify.post("/upgrade", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _c, _d, _e, _f;
        const body = request.body;
        const viewerId = body.viewer_id;
        const upgradeCount = Math.max(1, (_c = body.upgrade_count) !== null && _c !== void 0 ? _c : 1);
        const useStack = body.use_stack;
        const itemId = body.item_id;
        const equipmentId = body.equipment_id;
        if (isNaN(viewerId) || isNaN(equipmentId) || useStack === undefined)
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
        // get equipment
        const equipment = (0, wdfpData_1.getPlayerEquipmentSync)(playerId, equipmentId);
        if (equipment === null)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Player does not own equipment."
            });
        // validate that we won't overflow the equipment's level.
        const newLevel = equipment.level + upgradeCount;
        if (newLevel > 5)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Cannot upgrade weapon more than 4 times."
            });
        // check if the equipment can be upgraded
        const newStack = useStack ? equipment.stack - upgradeCount : equipment.stack;
        if (0 > newStack)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Not enough stack."
            });
        const equipmentRarity = Math.floor(equipmentId / 1000000) - 1;
        const wrightPieces = (_d = (0, wdfpData_1.getPlayerItemSync)(playerId, wrightpieceItemId)) !== null && _d !== void 0 ? _d : 0;
        const upgradeCost = (_e = equipmentUpgradeCost[equipmentRarity]) !== null && _e !== void 0 ? _e : 0;
        const newWrightPieces = wrightPieces - (upgradeCost * upgradeCount);
        if (0 > newWrightPieces)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Not enough of wrightpieces."
            });
        const itemCount = itemId ? (_f = (0, wdfpData_1.getPlayerItemSync)(playerId, itemId)) !== null && _f !== void 0 ? _f : 0 : 0;
        const newItemCount = !useStack ? itemCount - upgradeCount : itemCount;
        if (0 > newItemCount)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Not enough of item."
            });
        const returnItemList = {};
        // deduct item
        if (!useStack && itemId !== undefined) {
            returnItemList[itemId] = newItemCount;
            (0, wdfpData_1.updatePlayerItemSync)(playerId, itemId, newItemCount);
        }
        // deduct wrightpiece
        returnItemList[wrightpieceItemId] = newWrightPieces;
        (0, wdfpData_1.updatePlayerItemSync)(playerId, wrightpieceItemId, newWrightPieces);
        // upgrade weapon
        equipment.level = newLevel;
        equipment.stack = newStack;
        (0, wdfpData_1.updatePlayerEquipmentSync)(playerId, equipmentId, {
            "stack": newStack,
            "level": newLevel
        });
        // give ability cores
        returnItemList[equipmentId] = (0, wdfpData_1.givePlayerItemSync)(playerId, equipmentId, upgradeCount);
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({
                viewer_id: viewerId
            }),
            "data": {
                "equipment_list": [
                    (0, equipment_1.clientSerializeEquipment)(equipmentId, equipment)
                ],
                "item_list": returnItemList,
                "mail_arrived": false
            }
        });
    }));
    fastify.post("/bulk_upgrade", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _g;
        const body = request.body;
        const viewerId = body.viewer_id;
        const equipmentIds = body.equipment_ids;
        if (isNaN(viewerId) || !equipmentIds || !Array.isArray(equipmentIds) || equipmentIds.length === 0) {
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Invalid request body."
            });
        }
        const session = yield (0, wdfpData_1.getSession)(viewerId.toString());
        if (!session)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Invalid viewer id."
            });
        const playerId = (0, activeAccount_1.resolvePlayerIdSync)(session.accountId);
        if (playerId === null)
            return reply.status(500).send({
                "error": "Internal Server Error",
                "message": "No players bound to account."
            });
        const player = (0, wdfpData_1.getPlayerSync)(playerId);
        if (!player)
            return reply.status(500).send({
                "error": "Internal Server Error",
                "message": "Player not found."
            });
        // Phase 1: calculate upgrade counts and total cost
        const upgrades = [];
        let totalCraftPointCost = 0;
        const seen = new Set();
        for (const equipmentId of equipmentIds) {
            if (seen.has(equipmentId))
                continue;
            seen.add(equipmentId);
            const equipment = (0, wdfpData_1.getPlayerEquipmentSync)(playerId, equipmentId);
            if (!equipment)
                continue;
            const upgradeCount = Math.min(5 - equipment.level, equipment.stack);
            if (upgradeCount <= 0)
                continue;
            const rarity = Math.floor(equipmentId / 1000000) - 1;
            totalCraftPointCost += equipmentUpgradeCost[rarity] * upgradeCount;
            upgrades.push({ equipmentId, upgradeCount });
        }
        if (upgrades.length === 0) {
            reply.header("content-type", "application/x-msgpack");
            return reply.status(200).send({
                "data_headers": (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
                "data": {
                    "equipment_list": [],
                    "item_list": {},
                    "mail_arrived": false
                }
            });
        }
        // Check craft point balance
        const currentCraftPoints = (_g = (0, wdfpData_1.getPlayerItemSync)(playerId, wrightpieceItemId)) !== null && _g !== void 0 ? _g : 0;
        if (totalCraftPointCost > currentCraftPoints) {
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Not enough craft points."
            });
        }
        // Phase 2: apply upgrades
        const returnEquipmentList = [];
        const returnItemList = {};
        for (const { equipmentId, upgradeCount } of upgrades) {
            const equipment = (0, wdfpData_1.getPlayerEquipmentSync)(playerId, equipmentId);
            equipment.level += upgradeCount;
            equipment.stack -= upgradeCount;
            (0, wdfpData_1.updatePlayerEquipmentSync)(playerId, equipmentId, {
                level: equipment.level,
                stack: equipment.stack
            });
            returnEquipmentList.push((0, equipment_1.clientSerializeEquipment)(equipmentId, equipment));
            returnItemList[equipmentId] = (0, wdfpData_1.givePlayerItemSync)(playerId, equipmentId, upgradeCount);
        }
        // Deduct craft points
        const newCraftPoints = currentCraftPoints - totalCraftPointCost;
        (0, wdfpData_1.updatePlayerItemSync)(playerId, wrightpieceItemId, newCraftPoints);
        returnItemList[wrightpieceItemId] = newCraftPoints;
        console.log(`[BULK_UPGRADE] player ${playerId}: ${upgrades.length} equipment upgraded, craft points ${currentCraftPoints} -> ${newCraftPoints}`);
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
            "data": {
                "equipment_list": returnEquipmentList,
                "item_list": returnItemList,
                "mail_arrived": false
            }
        });
    }));
    fastify.post("/bulk_sell_stack", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _h;
        const body = request.body;
        const viewerId = body.viewer_id;
        const equipmentIds = body.equipment_ids;
        if (isNaN(viewerId) || !equipmentIds || !Array.isArray(equipmentIds) || equipmentIds.length === 0) {
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Invalid request body."
            });
        }
        const session = yield (0, wdfpData_1.getSession)(viewerId.toString());
        if (!session)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Invalid viewer id."
            });
        const playerId = (0, activeAccount_1.resolvePlayerIdSync)(session.accountId);
        if (playerId === null)
            return reply.status(500).send({
                "error": "Internal Server Error",
                "message": "No players bound to account."
            });
        const player = (0, wdfpData_1.getPlayerSync)(playerId);
        if (!player)
            return reply.status(500).send({
                "error": "Internal Server Error",
                "message": "Player not found."
            });
        // Phase 1: calculate rewards per equipment
        let totalCraftPoints = 0;
        let totalStarGrains = 0;
        const abilitySoulCounts = {};
        const toSell = [];
        const seen = new Set();
        for (const equipmentId of equipmentIds) {
            if (seen.has(equipmentId))
                continue;
            seen.add(equipmentId);
            const equipment = (0, wdfpData_1.getPlayerEquipmentSync)(playerId, equipmentId);
            if (!equipment)
                continue;
            const stack = equipment.stack;
            if (stack <= 0)
                continue;
            const rarity = Math.floor(equipmentId / 1000000) - 1;
            totalCraftPoints += dissolvingCraftPoints[rarity] * stack;
            totalStarGrains += dissolvingStarGrains[rarity] * stack;
            abilitySoulCounts[equipmentId] = ((_h = abilitySoulCounts[equipmentId]) !== null && _h !== void 0 ? _h : 0) + stack;
            toSell.push({ equipmentId, stack });
        }
        if (toSell.length === 0) {
            reply.header("content-type", "application/x-msgpack");
            return reply.status(200).send({
                "data_headers": (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
                "data": {
                    "equipment_list": [],
                    "item_list": {},
                    "mail_arrived": false
                }
            });
        }
        // Phase 2: delete equipment, give items
        for (const { equipmentId } of toSell) {
            (0, wdfpData_1.deletePlayerEquipmentSync)(playerId, equipmentId);
        }
        const returnItemList = {};
        if (totalCraftPoints > 0) {
            returnItemList[wrightpieceItemId] = (0, wdfpData_1.givePlayerItemSync)(playerId, wrightpieceItemId, totalCraftPoints);
        }
        if (totalStarGrains > 0) {
            returnItemList[starGrainItemId] = (0, wdfpData_1.givePlayerItemSync)(playerId, starGrainItemId, totalStarGrains);
        }
        for (const [equipmentId, count] of Object.entries(abilitySoulCounts)) {
            returnItemList[parseInt(equipmentId)] = (0, wdfpData_1.givePlayerItemSync)(playerId, parseInt(equipmentId), count);
        }
        // Get full remaining equipment list
        const allEquipment = (0, wdfpData_1.getPlayerEquipmentListSync)(playerId);
        const returnEquipmentList = [];
        for (const [equipId, equip] of Object.entries(allEquipment)) {
            returnEquipmentList.push((0, equipment_1.clientSerializeEquipment)(parseInt(equipId), equip));
        }
        const craftPointLog = totalCraftPoints > 0 ? `craft +${totalCraftPoints} ` : "";
        const starGrainLog = totalStarGrains > 0 ? `star +${totalStarGrains} ` : "";
        console.log(`[BULK_SELL] player ${playerId}: ${toSell.length} equipment dissolved, ${craftPointLog}${starGrainLog}ability souls: ${Object.keys(abilitySoulCounts).length} types`);
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
            "data": {
                "equipment_list": returnEquipmentList,
                "item_list": returnItemList,
                "mail_arrived": false
            }
        });
    }));
    fastify.post("/set_protection", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
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
        // update protection
        const newProtection = body.protection;
        for (const equipmentId of body.equipment_ids) {
            if ((0, wdfpData_1.playerOwnsEquipmentSync)(playerId, equipmentId)) {
                (0, wdfpData_1.updatePlayerEquipmentSync)(playerId, equipmentId, {
                    protection: newProtection
                });
            }
        }
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({
                viewer_id: viewerId
            }),
            "data": {}
        });
    }));
});
exports.default = routes;
