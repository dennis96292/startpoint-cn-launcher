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
const gacha_1 = require("../../lib/gacha");
const assets_1 = require("../../lib/assets");
const types_1 = require("../../lib/types");
const utils_2 = require("../../data/utils");
const activeAccount_1 = require("../../data/activeAccount");
const character_1 = require("../../lib/character");
const equipment_1 = require("../../lib/equipment");
var GachaPaymentType;
(function (GachaPaymentType) {
    GachaPaymentType[GachaPaymentType["EMPTY"] = 0] = "EMPTY";
    GachaPaymentType[GachaPaymentType["FREE_VMONEY"] = 1] = "FREE_VMONEY";
    GachaPaymentType[GachaPaymentType["VMONEY"] = 2] = "VMONEY";
    GachaPaymentType[GachaPaymentType["TICKET"] = 3] = "TICKET";
    GachaPaymentType[GachaPaymentType["CAMPAIGN"] = 4] = "CAMPAIGN";
})(GachaPaymentType || (GachaPaymentType = {}));
var GachaExecType;
(function (GachaExecType) {
    GachaExecType[GachaExecType["EMPTY"] = 0] = "EMPTY";
    GachaExecType[GachaExecType["VMONEY_SINGLE"] = 1] = "VMONEY_SINGLE";
    GachaExecType[GachaExecType["VMONEY_MULTI"] = 2] = "VMONEY_MULTI";
    GachaExecType[GachaExecType["UNKNOWN_1"] = 3] = "UNKNOWN_1";
    GachaExecType[GachaExecType["UNKNOWN_2"] = 4] = "UNKNOWN_2";
    GachaExecType[GachaExecType["DAILY_SINGLE"] = 5] = "DAILY_SINGLE";
    GachaExecType[GachaExecType["UNKNOWN_3"] = 6] = "UNKNOWN_3";
    GachaExecType[GachaExecType["CAMPAIGN_SINGLE"] = 7] = "CAMPAIGN_SINGLE";
    GachaExecType[GachaExecType["CAMPAIGN_MULTI"] = 8] = "CAMPAIGN_MULTI";
    GachaExecType[GachaExecType["MULTI_TICKET"] = 9] = "MULTI_TICKET";
    GachaExecType[GachaExecType["SINGLE_TICKET"] = 10] = "SINGLE_TICKET";
    GachaExecType[GachaExecType["UNKNOWN_4"] = 11] = "UNKNOWN_4";
    GachaExecType[GachaExecType["UNKNOWN_5"] = 12] = "UNKNOWN_5";
    GachaExecType[GachaExecType["MULTI_WEAPON_TICKET"] = 13] = "MULTI_WEAPON_TICKET";
})(GachaExecType || (GachaExecType = {}));
const exchangeRequiredPoints = 250;
const routes = (fastify) => __awaiter(void 0, void 0, void 0, function* () {
    fastify.post("/exchange_equipment", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const body = request.body;
        const equipmentId = body.equipment_id;
        const gachaId = body.gacha_id;
        const viewerId = body.viewer_id;
        if (isNaN(viewerId) || isNaN(equipmentId) || isNaN(gachaId))
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
        // get gacha info
        const gachaInfo = (0, wdfpData_1.getPlayerGachaInfoSync)(playerId, gachaId);
        if (gachaInfo === null)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "No data for gacha with provided id."
            });
        const newExchangePoints = ((_a = gachaInfo.gachaExchangePoint) !== null && _a !== void 0 ? _a : 0) - exchangeRequiredPoints;
        if (0 > newExchangePoints)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Not enough exchange points."
            });
        // reward equipment
        const giveResult = (0, equipment_1.givePlayerEquipmentSync)(playerId, equipmentId, 1);
        (0, wdfpData_1.insertReceiveHistorySync)(playerId, { type: wdfpData_1.MailType.EQUIPMENT, type_id: equipmentId, number: 1 });
        // update gacha info
        (0, wdfpData_1.updatePlayerGachaInfoSync)(playerId, {
            gachaId: gachaId,
            gachaExchangePoint: newExchangePoints
        });
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({
                viewer_id: viewerId
            }),
            "data": {
                "equipment_list": [
                    giveResult
                ],
                "gacha_info_list": [
                    {
                        "gacha_id": gachaId,
                        "is_account_first": gachaInfo.isAccountFirst,
                        "is_daily_first": gachaInfo.isDailyFirst,
                        "gacha_exchange_point": newExchangePoints
                    }
                ],
                "encyclopedia_info": [],
                "mail_arrived": false
            }
        });
    }));
    fastify.post("/exchange_character", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _b;
        const body = request.body;
        const characterId = body.character_id;
        const gachaId = body.gacha_id;
        const viewerId = body.viewer_id;
        if (isNaN(viewerId) || isNaN(characterId) || isNaN(gachaId))
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
        // get gacha info
        const gachaInfo = (0, wdfpData_1.getPlayerGachaInfoSync)(playerId, gachaId);
        if (gachaInfo === null)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "No data for gacha with provided id."
            });
        const newExchangePoints = ((_b = gachaInfo.gachaExchangePoint) !== null && _b !== void 0 ? _b : 0) - exchangeRequiredPoints;
        if (0 > newExchangePoints)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Not enough exchange points."
            });
        // reward character
        const giveResult = (0, character_1.givePlayerCharacterSync)(playerId, characterId);
        if (giveResult === null)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Could not give player character."
            });
        (0, wdfpData_1.insertReceiveHistorySync)(playerId, { type: wdfpData_1.MailType.CHARACTER, type_id: characterId, number: 1 });
        // update gacha info
        (0, wdfpData_1.updatePlayerGachaInfoSync)(playerId, {
            gachaId: gachaId,
            gachaExchangePoint: newExchangePoints
        });
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({
                viewer_id: viewerId
            }),
            "data": {
                "character_list": [
                    giveResult === null || giveResult === void 0 ? void 0 : giveResult.character
                ],
                "item_list": giveResult.item !== undefined ? {
                    [giveResult.item.id]: giveResult.item.count
                } : [],
                "gacha_info_list": [
                    {
                        "gacha_id": gachaId,
                        "is_account_first": gachaInfo.isAccountFirst,
                        "is_daily_first": gachaInfo.isDailyFirst,
                        "gacha_exchange_point": newExchangePoints
                    }
                ],
                "encyclopedia_info": [],
                "mail_arrived": false
            }
        });
    }));
    fastify.post("/exec", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _c;
        const body = request.body;
        const viewerId = body.viewer_id;
        const gachaId = body.gacha_id;
        const paymentType = body.payment_type;
        const numberOfExec = body.number_of_exec;
        const type = body.type;
        if (isNaN(viewerId) || isNaN(gachaId) || isNaN(paymentType) || isNaN(numberOfExec) || isNaN(type)) {
            console.log(`[GACHA] Invalid body: v=${viewerId} g=${gachaId} pt=${paymentType} n=${numberOfExec} t=${type}`);
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Invalid request body."
            });
        }
        const viewerIdSession = yield (0, wdfpData_1.getSession)(viewerId.toString());
        if (!viewerIdSession)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Invalid viewer id."
            });
        // get player
        const playerId = (0, activeAccount_1.resolvePlayerIdSync)(viewerIdSession.accountId);
        if (playerId === null)
            return reply.status(500).send({ "error": "Internal Server Error", "message": "No players bound to account." });
        const player = (0, wdfpData_1.getPlayerSync)(playerId);
        if (player === null)
            return;
        // get the gacha
        const gachaData = (0, assets_1.getGachaSync)(gachaId);
        if (gachaData === null) {
            console.log(`[GACHA] Gacha not found: gachaId=${gachaId}`);
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Gacha doesn't exist."
            });
        }
        const isCharacterGacha = gachaData.type == types_1.GachaType.CHARACTER;
        // get player gacha data
        let playerGachaData = (0, wdfpData_1.getPlayerGachaInfoSync)(playerId, gachaId);
        const insertPlayerGachaData = playerGachaData === null;
        playerGachaData = playerGachaData !== null && playerGachaData !== void 0 ? playerGachaData : {
            gachaId: gachaId,
            isAccountFirst: true,
            isDailyFirst: true,
            gachaExchangePoint: 0
        };
        // determine & validate cost
        let pullCount = 0;
        let playerPaidVmoney = player.vmoney;
        let playerFreeVmoney = player.freeVmoney;
        let gachaCampaigns = [];
        let items = {};
        switch (paymentType) {
            case GachaPaymentType.FREE_VMONEY: {
                const isMulti = type === GachaExecType.VMONEY_MULTI;
                const cost = (isMulti ? gachaData.multiCost : gachaData.singleCost);
                const overflow = cost > playerFreeVmoney ? cost - playerFreeVmoney : 0;
                playerFreeVmoney = overflow > 0 ? 0 : playerFreeVmoney - cost;
                playerPaidVmoney = overflow > 0 ? playerPaidVmoney - overflow : playerPaidVmoney;
                pullCount = isMulti ? 10 : 1;
                break;
            }
            // paid daily summon
            case GachaPaymentType.VMONEY: {
                if (!playerGachaData.isDailyFirst)
                    return reply.status(400).send({
                        "error": "Bad Request",
                        "message": "Already did daily paid summon."
                    });
                playerPaidVmoney -= isCharacterGacha ? 50 : 25;
                pullCount = 1;
                break;
            }
            // tickets
            case GachaPaymentType.TICKET: {
                const isWeapon = type === GachaExecType.MULTI_WEAPON_TICKET;
                const isMulti = type === GachaExecType.MULTI_TICKET || isWeapon;
                const itemId = isMulti ? (isWeapon ? 999004 : 999001) : (isWeapon ? 999005 : 999003);
                const itemCount = (0, wdfpData_1.getPlayerItemSync)(playerId, itemId);
                const useTicketCount = Math.max(1, numberOfExec);
                const newItemCount = (itemCount !== null && itemCount !== void 0 ? itemCount : -1) - useTicketCount;
                if (0 > newItemCount)
                    return reply.status(400).send({
                        "error": "Bad Request",
                        "message": "Not enough tickets."
                    });
                pullCount = useTicketCount * (isMulti ? 10 : 1);
                items[itemId] = newItemCount;
                (0, wdfpData_1.updatePlayerItemSync)(playerId, itemId, newItemCount);
                break;
            }
            // free pulls
            case GachaPaymentType.CAMPAIGN: {
                const gachaCampaignId = (0, assets_1.getGachaCampaignIdSync)(gachaId);
                if (gachaCampaignId === null)
                    return reply.status(400).send({
                        "error": "Bad Request",
                        "message": "No gacha campaign assigned to gacha."
                    });
                // get player campaign data
                let playerCampaignData = (0, wdfpData_1.getPlayerGachaCampaignSync)(playerId, gachaId, gachaCampaignId);
                const insertCampaignData = playerCampaignData === null;
                playerCampaignData = playerCampaignData !== null && playerCampaignData !== void 0 ? playerCampaignData : {
                    gachaId: gachaId,
                    campaignId: gachaCampaignId,
                    count: 1
                };
                if (0 >= playerCampaignData.count)
                    return reply.status(400).send({
                        "error": "Bad Request",
                        "message": "Already redeemed campaign for this period."
                    });
                // update campaign
                playerCampaignData.count = 0;
                if (insertCampaignData) {
                    (0, wdfpData_1.insertPlayerGachaCampaignSync)(playerId, playerCampaignData);
                }
                else {
                    (0, wdfpData_1.updatePlayerGachaCampaignSync)(playerId, gachaId, gachaCampaignId, 0);
                }
                gachaCampaigns.push((0, utils_2.serializeGachaCampaign)(playerCampaignData));
                const isMulti = type === GachaExecType.CAMPAIGN_MULTI;
                pullCount = isMulti ? 10 : 1;
                break;
            }
        }
        if (pullCount === 0) {
            console.log(`[GACHA] Invalid payment: gachaId=${gachaId} paymentType=${paymentType} type=${type}`);
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Invalid payment type."
            });
        }
        if ((0 > playerFreeVmoney) || (0 > playerPaidVmoney)) {
            console.log(`[GACHA] Not enough beads: gachaId=${gachaId} free=${playerFreeVmoney} paid=${playerPaidVmoney} cost=${gachaData.singleCost}`);
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Not enough beads."
            });
        }
        const drawResult = (0, gacha_1.drawGachaSync)(gachaData, pullCount);
        const rewardResult = (0, gacha_1.rewardPlayerGachaDrawResultSync)(playerId, gachaData, drawResult);
        // Log each drawn item in history
        const historyType = isCharacterGacha ? wdfpData_1.MailType.CHARACTER : wdfpData_1.MailType.EQUIPMENT;
        for (const itemId of drawResult) {
            (0, wdfpData_1.insertReceiveHistorySync)(playerId, { type: historyType, type_id: itemId, number: 1 });
        }
        const newGachaExchangePoint = ((_c = playerGachaData.gachaExchangePoint) !== null && _c !== void 0 ? _c : 0) + pullCount;
        if (insertPlayerGachaData) {
            playerGachaData.isAccountFirst = false;
            playerGachaData.isDailyFirst = false;
            playerGachaData.gachaExchangePoint = newGachaExchangePoint;
            (0, wdfpData_1.insertPlayerGachaInfoSync)(playerId, playerGachaData);
        }
        else {
            (0, wdfpData_1.updatePlayerGachaInfoSync)(playerId, {
                gachaId: gachaId,
                isDailyFirst: false,
                isAccountFirst: false,
                gachaExchangePoint: newGachaExchangePoint
            });
        }
        (0, wdfpData_1.updatePlayerSync)({
            id: playerId,
            vmoney: playerPaidVmoney,
            freeVmoney: playerFreeVmoney
        });
        reply.header("content-type", "application/x-msgpack");
        if (isCharacterGacha) {
            return reply.status(200).send({
                "data_headers": (0, utils_1.generateDataHeaders)({
                    viewer_id: viewerId
                }),
                "data": {
                    "user_info": {
                        "free_vmoney": playerFreeVmoney,
                        "vmoney": playerPaidVmoney
                    },
                    "draw": rewardResult.draw,
                    "character_list": rewardResult.characters,
                    "item_list": Object.assign(Object.assign({}, items), rewardResult.items),
                    "gacha_campaign_list": gachaCampaigns,
                    "gacha_info_list": [
                        {
                            "gacha_id": gachaId,
                            "is_account_first": false,
                            "is_daily_first": false,
                            "gacha_exchange_point": newGachaExchangePoint
                        }
                    ],
                    "encyclopedia_info": [],
                    "mail_arrived": false
                }
            });
        }
        else {
            return reply.status(200).send({
                "data_headers": (0, utils_1.generateDataHeaders)({
                    viewer_id: viewerId
                }),
                "data": {
                    "user_info": {
                        "free_vmoney": playerFreeVmoney,
                        "vmoney": playerPaidVmoney
                    },
                    "is_erupt": false,
                    "draw_equipment": rewardResult.draw,
                    "item_list": Object.assign(Object.assign({}, items), rewardResult.items),
                    "equipment_list": rewardResult.equipment,
                    "gacha_info_list": [
                        {
                            "gacha_id": gachaId,
                            "is_account_first": false,
                            "is_daily_first": false,
                            "gacha_exchange_point": newGachaExchangePoint
                        }
                    ],
                    "encyclopedia_info": [],
                    "mail_arrived": false
                }
            });
        }
    }));
});
exports.default = routes;
