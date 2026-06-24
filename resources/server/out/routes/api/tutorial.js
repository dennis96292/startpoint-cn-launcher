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
const utils_1 = require("../../utils");
const assets_1 = require("../../lib/assets");
const gacha_1 = require("../../lib/gacha");
const character_1 = require("../../lib/character");
const crypto_1 = require("crypto");
const freeTutorialCharacterId = 243001;
const tutorialGachaCharacterIds = [251001, 251002, 251003, 251004, 251005, 251006, 251007, 251008];
const routes = (fastify) => __awaiter(void 0, void 0, void 0, function* () {
    fastify.post("/finish_trigger", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        const tutorialIds = body.tutorial_ids;
        if (!viewerId || isNaN(viewerId) || !tutorialIds || !(tutorialIds instanceof Array))
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
        // Mark tutorial as having been completed (skip already triggered)
        const existing = (0, wdfpData_1.getPlayerTriggeredTutorialsSync)(playerId);
        for (const tutorialId of tutorialIds) {
            if (!existing.find((v) => v === tutorialId)) {
                (0, wdfpData_1.insertPlayerTriggeredTutorialSync)(playerId, tutorialId);
            }
        }
        reply.header("content-type", "application/x-msgpack");
        reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({
                viewer_id: viewerId
            }),
            "data": []
        });
    }));
    fastify.post("/update_step", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        const completedStep = body.step;
        const skip = body.skip || false;
        if (!viewerId || isNaN(completedStep) || isNaN(viewerId))
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
                "message": "No player bound to account."
            });
        // check if tutorial is already completed
        const completedTutorial = (0, wdfpData_1.getPlayerTriggeredTutorialsSync)(playerId);
        if (completedTutorial.find((value) => value === 12))
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Tutorial already completed"
            });
        // update player
        const currentStep = player.tutorialStep;
        let nextStep = completedStep + 1;
        if ((currentStep || 0) > nextStep)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Attempt to redo previous tutorial step."
            });
        (0, wdfpData_1.updatePlayerSync)({
            id: playerId,
            tutorialStep: nextStep,
            tutorialSkipFlag: skip,
            name: body.name
        });
        // offset nextStep by 11 if skipped, to keep steps the same.
        nextStep += (body.skip ? 11 : 0);
        reply.header("content-type", "application/x-msgpack");
        const headers = (0, utils_1.generateDataHeaders)({
            viewer_id: viewerId
        });
        if (nextStep === 15 && body.gacha_id !== undefined && !isNaN(body.gacha_id)) {
            const gachaId = body.gacha_id;
            const gachaData = (0, assets_1.getGachaSync)(gachaId);
            if (gachaData === null)
                return reply.status(400).send({
                    "error": "Bad Request",
                    "message": `Gacha with id '${body.gacha_id}' does not exist.`
                });
            // perform pull
            const randomCharacterIndex = (0, crypto_1.randomInt)(0, tutorialGachaCharacterIds.length);
            const randomCharacterId = tutorialGachaCharacterIds[randomCharacterIndex];
            const drawResult = [randomCharacterId];
            // reward pull
            const rewardResult = (0, gacha_1.rewardPlayerGachaDrawResultSync)(playerId, gachaData, drawResult);
            (0, wdfpData_1.insertReceiveHistorySync)(playerId, { type: wdfpData_1.MailType.CHARACTER, type_id: randomCharacterId, number: 1 });
            const newFreeVmoney = player.freeVmoney - gachaData.singleCost;
            (0, wdfpData_1.updatePlayerSync)({
                id: playerId,
                freeVmoney: newFreeVmoney,
                tutorialGachaCharacterId: randomCharacterId
            });
            const draw = rewardResult.draw[0];
            draw.movie_id = "normal_guarantee";
            draw.seed = 10007656;
            return reply.status(200).send({
                "data_headers": headers,
                "data": {
                    "step": nextStep,
                    "user_info": {
                        "free_vmoney": newFreeVmoney,
                    },
                    "gacha": {
                        "draw": rewardResult.draw,
                        "gacha_info_list": [
                            {
                                "gacha_id": gachaId,
                                "is_account_first": false,
                                "is_daily_first": false,
                            }
                        ],
                    },
                    "character_list": rewardResult.characters,
                    "item_list": rewardResult.items,
                    "encyclopedia_info": [],
                    "mail_arrived": false,
                    "start_time": (0, utils_1.getServerTime)()
                }
            });
        }
        else if (nextStep === 16) {
            // give 1500 vmoney
            const newVMoney = player.freeVmoney + 1500;
            (0, wdfpData_1.updatePlayerSync)({
                id: playerId,
                freeVmoney: newVMoney
            });
            (0, wdfpData_1.insertReceiveHistorySync)(playerId, { type: wdfpData_1.MailType.FREE_VMONEY, type_id: null, number: 1500 });
            // give free character directly (required for tutorial popup)
            const giveResult = (0, character_1.givePlayerCharacterSync)(playerId, freeTutorialCharacterId);
            const characterList = giveResult !== null ? [giveResult.character] : [];
            (0, wdfpData_1.insertReceiveHistorySync)(playerId, { type: wdfpData_1.MailType.CHARACTER, type_id: freeTutorialCharacterId, number: 1 });
            // also send a mail with tutorial gift (gacha ticket, etc.)
            (0, wdfpData_1.insertMailSync)(playerId, {
                reason_id: 0,
                subject: null,
                description: null,
                type: wdfpData_1.MailType.FREE_VMONEY,
                type_id: null,
                number: 500,
                receive_time: '0000-00-00 00:00:00',
                create_time: new Date().toISOString().replace('T', ' ').substring(0, 19),
                reward_period_limited: 0,
                reward_limit_time: null,
            });
            reply.status(200).send({
                "data_headers": headers,
                "data": {
                    "step": nextStep,
                    "user_info": {
                        "free_vmoney": newVMoney
                    },
                    "character_list": characterList,
                    "encyclopedia_info": {
                        [`1${freeTutorialCharacterId}01`]: {
                            "read": false
                        }
                    },
                    "mail_arrived": true,
                    "start_time": (0, utils_1.getServerTime)()
                }
            });
        }
        else {
            reply.status(200).send({
                "data_headers": headers,
                "data": {
                    "step": nextStep,
                    "mail_arrived": true,
                    "start_time": (0, utils_1.getServerTime)()
                }
            });
        }
    }));
});
exports.default = routes;
