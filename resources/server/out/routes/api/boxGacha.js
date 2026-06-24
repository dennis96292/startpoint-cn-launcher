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
const activeAccount_1 = require("../../data/activeAccount");
const utils_1 = require("../../utils");
const assets_1 = require("../../lib/assets");
const gacha_1 = require("../../lib/gacha");
/**
 * Returns all of a box gacha's box statuses serialized for the client.
 *
 * @param playerId The ID of the player.
 * @param boxGachaId The ID of the box gacha.
 * @param boxes A record of boxes to get the data of.
 * @param skipBoxId The ID of the box id to skip.
 */
function getAllBoxList(playerId, boxGachaId, boxes, skipBoxId) {
    var _a, _b;
    const boxInfo = [];
    for (const [boxId, _] of Object.entries(boxes)) {
        // get drawn rewards
        const parsedBoxId = Number(boxId);
        if (parsedBoxId !== skipBoxId) {
            const playerBoxData = (0, wdfpData_1.getPlayerBoxGachaSync)(playerId, boxGachaId, parsedBoxId);
            const playerDrawnRewards = (0, wdfpData_1.getPlayerBoxGachaDrawnRewardsSync)(playerId, boxGachaId, parsedBoxId);
            boxInfo.push({
                "box_id": parsedBoxId,
                "reset_times": (_a = playerBoxData === null || playerBoxData === void 0 ? void 0 : playerBoxData.resetTimes) !== null && _a !== void 0 ? _a : 0,
                "all_drawn_reward_list": playerDrawnRewards.map(reward => {
                    return {
                        "reward_id": reward.id,
                        "number": reward.number
                    };
                }),
                "coming_next_reward_list": [],
                "is_closed": (_b = playerBoxData === null || playerBoxData === void 0 ? void 0 : playerBoxData.isClosed) !== null && _b !== void 0 ? _b : false
            });
        }
    }
    return boxInfo;
}
const routes = (fastify) => __awaiter(void 0, void 0, void 0, function* () {
    fastify.post("/close", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const body = request.body;
        const viewerId = body.viewer_id;
        const boxGachaId = body.box_gacha_id;
        const boxId = body.box_id;
        if (isNaN(viewerId) || isNaN(boxGachaId) || isNaN(boxId))
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
        // get box asset data.
        const boxGachaData = (0, assets_1.getBoxGachaSync)(boxGachaId);
        if (boxGachaData === null)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Invalid box gacha id."
            });
        // get the box's data.
        const playerBoxData = (0, wdfpData_1.getPlayerBoxGachaSync)(playerId, boxGachaId, boxId);
        if (playerBoxData === null)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Box doesn't exist"
            });
        // check if the box is already closed
        if (playerBoxData.isClosed)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Box is already closed."
            });
        // set box to be closed
        (0, wdfpData_1.updatePlayerBoxGachaSync)(playerId, boxGachaId, {
            boxId: boxId,
            isClosed: true
        });
        // get all boxes
        const allBoxDataList = getAllBoxList(playerId, boxGachaId, boxGachaData.boxes, boxId);
        // add box that we just closed to all box data.
        const playerDrawnRewards = (0, wdfpData_1.getPlayerBoxGachaDrawnRewardsSync)(playerId, boxGachaId, boxId);
        allBoxDataList.push({
            "box_id": boxId,
            "reset_times": (_a = playerBoxData === null || playerBoxData === void 0 ? void 0 : playerBoxData.resetTimes) !== null && _a !== void 0 ? _a : 0,
            "all_drawn_reward_list": playerDrawnRewards.map(reward => {
                return {
                    "reward_id": reward.id,
                    "number": reward.number
                };
            }),
            "coming_next_reward_list": [],
            "is_closed": true
        });
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({
                viewer_id: viewerId
            }),
            "data": {
                "all_box_info": getAllBoxList(playerId, boxGachaId, boxGachaData.boxes)
            }
        });
    }));
    fastify.post("/exec", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
        const body = request.body;
        const viewerId = body.viewer_id;
        const boxGachaId = body.box_gacha_id;
        const boxId = body.box_id;
        const pullCount = body.number;
        const stopOnFeaturedRewards = body.stop_on_featured_rewards;
        console.log(`[BOX] exec: boxGachaId=${boxGachaId} boxId=${boxId} pullCount=${pullCount}`);
        if (isNaN(viewerId) || isNaN(boxGachaId) || isNaN(boxId) || isNaN(pullCount) || stopOnFeaturedRewards === undefined)
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
        // get box gacha data
        const boxGachaData = (0, assets_1.getBoxGachaSync)(boxGachaId);
        if (boxGachaData === null)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Invalid box gacha id."
            });
        // make sure the player has enough currency
        const pullCurrencyId = boxGachaData.redeemItemId;
        const playerPullCurrency = (0, wdfpData_1.getPlayerItemSync)(playerId, pullCurrencyId);
        if (playerPullCurrency === null)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "No pull currency."
            });
        const newPullCurrency = playerPullCurrency - (Math.abs(pullCount) * boxGachaData.redeemItemCount);
        if (0 > newPullCurrency)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Not enough pull currency."
            });
        // get the current box
        const boxRewards = boxGachaData.boxes[boxId];
        if (boxRewards === undefined)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Invalid box ID."
            });
        const playerBoxData = (0, wdfpData_1.getPlayerBoxGachaSync)(playerId, boxGachaId, boxId);
        if (playerBoxData !== null && playerBoxData.isClosed)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Box is closed."
            });
        const playerDrawnRewards = (0, wdfpData_1.getPlayerBoxGachaDrawnRewardsSync)(playerId, boxGachaId, boxId);
        // perform the draws
        const drawResult = (0, gacha_1.drawBoxGachaSync)(boxRewards, playerDrawnRewards, pullCount, stopOnFeaturedRewards);
        const drawnRewards = drawResult.rewards;
        // reward the player
        const rewardResult = (0, gacha_1.rewardPlayerBoxGachaResultSync)(playerId, drawResult);
        // calculate all drawn reward list
        const playerDrawnRewardMap = new Map();
        const allDrawResultMap = new Map();
        let totalDrawCount = 0;
        for (const drawnReward of drawnRewards) {
            const number = drawnReward.number;
            totalDrawCount += number;
            allDrawResultMap.set(drawnReward.id, number);
        }
        for (const playerDrawnReward of playerDrawnRewards) {
            const id = playerDrawnReward.id;
            const number = playerDrawnReward.number;
            totalDrawCount += number;
            allDrawResultMap.set(id, ((_b = allDrawResultMap.get(id)) !== null && _b !== void 0 ? _b : 0) + number);
            playerDrawnRewardMap.set(id, number);
        }
        // update box gacha data
        const remainingDrawsNumber = ((_c = boxGachaData.availableCounts[boxId]) !== null && _c !== void 0 ? _c : totalDrawCount) - totalDrawCount;
        const shouldClose = remainingDrawsNumber === 0;
        if (playerBoxData === null) {
            (0, wdfpData_1.insertPlayerBoxGachaSync)(playerId, boxGachaId, {
                boxId: boxId,
                isClosed: shouldClose,
                remainingNumber: remainingDrawsNumber,
                resetTimes: 0
            });
        }
        else {
            // auto close the box if the remaining draws are 0
            (0, wdfpData_1.updatePlayerBoxGachaSync)(playerId, boxGachaId, {
                boxId: boxId,
                isClosed: shouldClose,
                remainingNumber: remainingDrawsNumber
            });
        }
        // upsert drawn rewards
        for (const drawnReward of drawnRewards) {
            const id = drawnReward.id;
            const existing = playerDrawnRewardMap.get(drawnReward.id);
            if (existing === undefined) {
                (0, wdfpData_1.insertPlayerBoxGachaDrawnRewardSync)(playerId, boxGachaId, boxId, {
                    id: id,
                    number: drawnReward.number
                });
            }
            else {
                (0, wdfpData_1.updatePlayerBoxGachaDrawnRewardSync)(playerId, boxGachaId, boxId, id, existing + drawnReward.number);
            }
        }
        // update currency
        (0, wdfpData_1.updatePlayerItemSync)(playerId, pullCurrencyId, newPullCurrency);
        // generate totalDrawnRewards array
        const allBoxInfo = getAllBoxList(playerId, boxGachaId, boxGachaData.boxes, boxId);
        // add current box to allBoxInfo
        {
            // build all drawn reward list
            const allDrawnRewardList = [];
            for (const [rewardId, number] of allDrawResultMap) {
                allDrawnRewardList.push({
                    "reward_id": rewardId,
                    "number": number
                });
            }
            allBoxInfo.push({
                "box_id": boxId,
                "reset_times": (_d = playerBoxData === null || playerBoxData === void 0 ? void 0 : playerBoxData.resetTimes) !== null && _d !== void 0 ? _d : 0,
                "all_drawn_reward_list": allDrawnRewardList,
                "coming_next_reward_list": [],
                "is_closed": shouldClose ? true : (_e = playerBoxData === null || playerBoxData === void 0 ? void 0 : playerBoxData.isClosed) !== null && _e !== void 0 ? _e : false
            });
        }
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({
                viewer_id: viewerId
            }),
            "data": {
                "user_info": {
                    "free_mana": player.freeMana + ((_f = rewardResult === null || rewardResult === void 0 ? void 0 : rewardResult.user_info.free_mana) !== null && _f !== void 0 ? _f : 0),
                    "exp_pool": player.expPool + ((_g = rewardResult === null || rewardResult === void 0 ? void 0 : rewardResult.user_info.exp_pool) !== null && _g !== void 0 ? _g : 0),
                    "exp_pooled_time": (0, utils_1.getServerTime)(player.expPooledTime),
                },
                "drawn_reward_list": drawnRewards.map(reward => {
                    return {
                        "reward_id": reward.id,
                        "number": reward.number
                    };
                }),
                "all_box_info": allBoxInfo,
                "joined_character_id_list": (_h = rewardResult === null || rewardResult === void 0 ? void 0 : rewardResult.joined_character_id_list) !== null && _h !== void 0 ? _h : [],
                "character_list": (_j = rewardResult === null || rewardResult === void 0 ? void 0 : rewardResult.character_list) !== null && _j !== void 0 ? _j : [],
                "equipment_list": (_k = rewardResult === null || rewardResult === void 0 ? void 0 : rewardResult.equipment_list) !== null && _k !== void 0 ? _k : [],
                "item_list": Object.assign({ [pullCurrencyId]: newPullCurrency }, ((_l = rewardResult === null || rewardResult === void 0 ? void 0 : rewardResult.items) !== null && _l !== void 0 ? _l : {})),
                "mail_arrived": false
            }
        });
    }));
    fastify.post("/get_box_list", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        const boxGachaId = body.box_gacha_id;
        console.log(`[BOX] get_box_list: boxGachaId=${boxGachaId}`);
        if (isNaN(viewerId) || isNaN(boxGachaId))
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
        // get box gacha data
        const boxGachaData = (0, assets_1.getBoxGachaSync)(boxGachaId);
        if (boxGachaData === null)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Invalid box gacha id."
            });
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({
                viewer_id: viewerId
            }),
            "data": {
                "all_box_info": getAllBoxList(playerId, boxGachaId, boxGachaData.boxes)
            }
        });
    }));
});
exports.default = routes;
