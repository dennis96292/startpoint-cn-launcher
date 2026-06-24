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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const wdfpData_1 = require("../../data/wdfpData");
const activeAccount_1 = require("../../data/activeAccount");
const assets_1 = require("../../lib/assets");
const utils_1 = require("../../utils");
const item_data_json_1 = __importDefault(require("../../../assets/item_data.json"));
const ITEM_EFFECTS = item_data_json_1.default;
const routes = (fastify) => __awaiter(void 0, void 0, void 0, function* () {
    fastify.post("/use_item", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const body = request.body;
        const viewerId = body.viewer_id;
        if (!viewerId || isNaN(viewerId) || !Array.isArray(body.items) || body.items.length === 0) {
            console.warn('[ITEM-USE] invalid request body');
            return reply.status(400).send({ "error": "Bad Request", "message": "Invalid request body." });
        }
        const session = yield (0, wdfpData_1.getSession)(viewerId.toString());
        if (!session)
            return reply.status(400).send({ "error": "Bad Request", "message": "Invalid viewer id." });
        const playerId = (0, activeAccount_1.resolvePlayerIdSync)(session.accountId);
        if (!playerId)
            return reply.status(500).send({ "error": "Internal Server Error", "message": "No player bound to account." });
        const player = (0, wdfpData_1.getPlayerSync)(playerId);
        if (!player)
            return reply.status(500).send({ "error": "Internal Server Error", "message": "Player not found." });
        const config = (0, assets_1.getConfigSync)();
        const recoverySeconds = config.stamina_recovery_seconds;
        const maxOverflow = config.max_stamina_overflow;
        let totalStaminaRecovery = 0;
        const itemUpdates = [];
        let hasStaminaItem = false;
        for (const itemReq of body.items) {
            const itemId = itemReq.id;
            const requestCount = itemReq.number;
            if (!Number.isInteger(itemId) || itemId <= 0) {
                console.warn(`[ITEM-USE] invalid item id: ${itemId}`);
                continue;
            }
            if (!Number.isInteger(requestCount) || requestCount <= 0) {
                console.warn(`[ITEM-USE] invalid count: ${requestCount} for item ${itemId}`);
                continue;
            }
            const effectInfo = ITEM_EFFECTS[itemId];
            if (!effectInfo) {
                console.warn(`[ITEM-USE] item ${itemId} not in effect table, skipping`);
                continue;
            }
            const { effectKind, effectValue } = effectInfo;
            // Only handle stamina recovery items
            if (effectKind !== 2 && effectKind !== 3) {
                console.warn(`[ITEM-USE] item ${itemId} effectKind=${effectKind}, not a stamina item, skipping`);
                continue;
            }
            // Verify ownership
            const currentCount = (_a = (0, wdfpData_1.getPlayerItemSync)(playerId, itemId)) !== null && _a !== void 0 ? _a : 0;
            if (currentCount < requestCount) {
                console.warn(`[ITEM-USE] player ${playerId} has ${currentCount} of item ${itemId}, requested ${requestCount}`);
                return reply.status(400).send({ "error": "Bad Request", "message": "Insufficient items." });
            }
            let recoveryAmount;
            if (effectKind === 2) {
                // StaminaFixed: fixed recovery amount
                recoveryAmount = effectValue;
            }
            else {
                // StaminaRate: percentage of max overflow
                const rate = Math.max(0, effectValue) / 100; // e.g. 50 = 50%
                recoveryAmount = Math.floor(Math.max(0, maxOverflow) * rate);
            }
            if (!isFinite(recoveryAmount) || recoveryAmount < 0) {
                console.warn(`[ITEM-USE] invalid recovery amount for item ${itemId}: ${recoveryAmount}`);
                recoveryAmount = 0;
            }
            totalStaminaRecovery += recoveryAmount * requestCount;
            itemUpdates.push({ id: itemId, newCount: currentCount - requestCount });
            hasStaminaItem = true;
        }
        if (!hasStaminaItem) {
            console.warn(`[ITEM-USE] no valid stamina recovery items in request`);
            return reply.status(400).send({ "error": "Bad Request", "message": "No valid stamina items." });
        }
        if (totalStaminaRecovery <= 0) {
            console.warn(`[ITEM-USE] zero total recovery`);
            return reply.status(400).send({ "error": "Bad Request", "message": "Zero recovery." });
        }
        // Compute real-time stamina
        const staminaHealTimeSec = player.staminaHealTime.getTime() / 1000;
        const nowSec = Math.floor(Date.now() / 1000);
        const elapsed = (nowSec - staminaHealTimeSec) / recoverySeconds;
        const currentStamina = Math.min(Math.max(0, player.stamina + Math.floor(elapsed)), maxOverflow);
        if (currentStamina >= maxOverflow) {
            console.log(`[ITEM-USE] player ${playerId} already at max stamina (${currentStamina} >= ${maxOverflow})`);
            return reply.status(400).send({ "error": "Bad Request", "code": 2102, "message": "Already at max stamina." });
        }
        const afterStamina = Math.min(currentStamina + totalStaminaRecovery, maxOverflow);
        // Batch update
        for (const upd of itemUpdates) {
            (0, wdfpData_1.updatePlayerItemSync)(playerId, upd.id, upd.newCount);
        }
        (0, wdfpData_1.updatePlayerSync)({
            id: playerId,
            stamina: afterStamina,
            staminaHealTime: new Date()
        });
        console.log(`[ITEM-USE] player ${playerId}: stamina ${currentStamina}->${afterStamina} (+${totalStaminaRecovery}), items: ${JSON.stringify(itemUpdates)}`);
        // Build item_list as IntMap<int> (client expects { itemId: count })
        const itemListMap = {};
        for (const upd of itemUpdates) {
            itemListMap[upd.id] = upd.newCount;
        }
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
            "data": {
                "user_info": {
                    "stamina": afterStamina,
                    "stamina_heal_time": (0, utils_1.getServerTime)()
                },
                "item_list": itemListMap
            }
        });
    }));
});
exports.default = routes;
