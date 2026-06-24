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
const item_1 = require("../../data/domains/item");
const activeAccount_1 = require("../../data/activeAccount");
const utils_1 = require("../../utils");
const character_1 = require("../../lib/character");
const equipment_1 = require("../../lib/equipment");
const star_crumb_exchange_json_1 = __importDefault(require("../../../assets/star_crumb_exchange.json"));
const star_crumb_exchange_cost_json_1 = __importDefault(require("../../../assets/star_crumb_exchange_cost.json"));
const routes = (fastify) => __awaiter(void 0, void 0, void 0, function* () {
    fastify.post("/star_crumb", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        const exchangeId = body.exchange_id;
        if (isNaN(viewerId) || isNaN(exchangeId))
            return reply.status(400).send({
                error: "Bad Request",
                message: "Invalid request body.",
            });
        const viewerIdSession = yield (0, wdfpData_1.getSession)(viewerId.toString());
        if (!viewerIdSession)
            return reply.status(400).send({
                error: "Bad Request",
                message: "Invalid viewer id.",
            });
        const playerId = (0, activeAccount_1.resolvePlayerIdSync)(viewerIdSession.accountId);
        const player = playerId !== null ? (0, wdfpData_1.getPlayerSync)(playerId) : null;
        if (player === null)
            return reply.status(500).send({
                error: "Internal Server Error",
                message: "No players bound to account.",
            });
        // star_crumb_exchange.json: { exchange_id: [["kind","id","desc","start","end","limited","comeback","stars","rarity"]] }
        const exchangeList = star_crumb_exchange_json_1.default[String(exchangeId)];
        if (!exchangeList || !exchangeList[0])
            return reply.status(400).send({
                error: "Bad Request",
                message: `Exchange item with id ${exchangeId} does not exist.`,
            });
        const entry = exchangeList[0];
        const kind = Number(entry[0]); // 0=Character, 1=Item, 2=Equipment
        const targetId = Number(entry[1]);
        const rarity = Number(entry[8]); // 4 or 5
        // cost table: { "0": [["300","600"]], "1": [["300","600"]], "2": [["200","400"]] }
        const costTable = star_crumb_exchange_cost_json_1.default;
        const costEntry = costTable[String(kind)];
        if (!costEntry || !costEntry[0])
            return reply.status(500).send({
                error: "Internal Server Error",
                message: `No cost data for kind ${kind}.`,
            });
        const costIdx = rarity === 5 ? 1 : 0;
        const cost = Number(costEntry[0][costIdx]);
        if (isNaN(cost) || cost <= 0)
            return reply.status(500).send({
                error: "Internal Server Error",
                message: `Invalid cost for kind=${kind} rarity=${rarity}.`,
            });
        console.log(`[exchange:star_crumb] player=${playerId} exch=${exchangeId} kind=${kind} id=${targetId} rarity=${rarity} cost=${cost}`);
        // Validate balance
        if (player.starCrumb < cost)
            return reply.status(400).send({
                error: "Bad Request",
                message: "Not enough star_crumb.",
            });
        // Validate ownership
        if (kind === 0 && (0, wdfpData_1.playerOwnsCharacterSync)(playerId, targetId)) {
            return reply.status(400).send({ error: "Bad Request", message: "Character already owned." });
        }
        if (kind === 2 && (0, wdfpData_1.playerOwnsEquipmentSync)(playerId, targetId)) {
            return reply.status(400).send({ error: "Bad Request", message: "Equipment already owned." });
        }
        // Deduct
        const newStarCrumb = player.starCrumb - cost;
        (0, wdfpData_1.updatePlayerSync)({ id: playerId, starCrumb: newStarCrumb });
        // Give reward
        const characterList = [];
        const itemList = {};
        const equipmentList = [];
        switch (kind) {
            case 0: { // Character
                const result = (0, character_1.givePlayerCharacterSync)(playerId, targetId);
                if (!result) {
                    (0, wdfpData_1.updatePlayerSync)({ id: playerId, starCrumb: player.starCrumb });
                    return reply.status(500).send({ error: "Internal Server Error", message: "Failed to give character." });
                }
                characterList.push(result.character);
                break;
            }
            case 1: { // Item
                const newCount = (0, item_1.givePlayerItemSync)(playerId, targetId, 1);
                itemList[String(targetId)] = newCount;
                break;
            }
            case 2: { // Equipment
                const result = (0, equipment_1.givePlayerEquipmentSync)(playerId, targetId, 1);
                if (!result) {
                    (0, wdfpData_1.updatePlayerSync)({ id: playerId, starCrumb: player.starCrumb });
                    return reply.status(500).send({ error: "Internal Server Error", message: "Failed to give equipment." });
                }
                equipmentList.push(result);
                break;
            }
        }
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            data_headers: (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
            data: {
                user_info: { star_crumb: newStarCrumb },
                character_list: characterList,
                item_list: itemList,
                equipment_list: equipmentList,
                active_mission_list: null,
                mission_info: null,
                over_max: null,
                mail_arrived: false,
                config: null,
                user_daily_challenge_point_list: null,
                encyclopedia_info: null,
                fund_receive_list: null,
                monthly_charge_bonus_info: null,
                crazy_gacha_result_list: null,
            },
        });
    }));
});
exports.default = routes;
