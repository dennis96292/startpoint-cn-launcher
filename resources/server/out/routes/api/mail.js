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
const wdfpData_2 = require("../../data/wdfpData");
const activeAccount_1 = require("../../data/activeAccount");
const utils_1 = require("../../utils");
const utils_2 = require("../../data/utils");
const equipment_1 = require("../../lib/equipment");
function formatMailResponse(mail) {
    return {
        id: mail.id,
        reason_id: mail.reason_id,
        subject: mail.subject,
        description: mail.description,
        type: mail.type,
        type_id: mail.type_id != null && mail.type_id > 2147483647 ? 0 : mail.type_id,
        number: mail.number,
        receive_time: mail.receive_time,
        create_time: mail.create_time,
        reward_period_limited: mail.reward_period_limited === 1,
        reward_limit_time: mail.reward_limit_time,
    };
}
function applyMailReward(playerId, mail) {
    var _a, _b;
    const player = (0, wdfpData_1.getPlayerSync)(playerId);
    const characterList = [];
    const equipmentList = [];
    const itemList = {};
    const userInfo = {};
    if (!player)
        return { characterList, equipmentList, itemList, userInfo };
    switch (mail.type) {
        case wdfpData_1.MailType.ITEM: {
            if (mail.type_id === null)
                break;
            const newAmount = (0, wdfpData_2.givePlayerItemSync)(playerId, mail.type_id, mail.number);
            itemList[String(mail.type_id)] = newAmount;
            break;
        }
        case wdfpData_1.MailType.PAID_VMONEY: {
            const newVmoney = player.vmoney + mail.number;
            (0, wdfpData_1.updatePlayerSync)({ id: playerId, vmoney: newVmoney });
            userInfo['vmoney'] = newVmoney;
            break;
        }
        case wdfpData_1.MailType.FREE_VMONEY: {
            const newFreeVmoney = player.freeVmoney + mail.number;
            (0, wdfpData_1.updatePlayerSync)({ id: playerId, freeVmoney: newFreeVmoney });
            userInfo['free_vmoney'] = newFreeVmoney;
            break;
        }
        case wdfpData_1.MailType.CHARACTER: {
            if (mail.type_id === null)
                break;
            const existing = (0, wdfpData_2.getPlayerCharacterSync)(playerId, mail.type_id);
            if (existing) {
                (0, wdfpData_2.updatePlayerCharacterSync)(playerId, mail.type_id, {
                    entryCount: existing.entryCount + 1
                });
            }
            else {
                (0, wdfpData_1.insertDefaultPlayerCharacterSync)(playerId, mail.type_id);
            }
            const charData = (0, wdfpData_2.getPlayerCharacterSync)(playerId, mail.type_id);
            characterList.push({
                character_id: mail.type_id,
                entry_count: charData.entryCount,
                evolution_level: charData.evolutionLevel,
                over_limit_step: charData.overLimitStep,
                protection: charData.protection,
                exp: charData.exp,
                stack: charData.stack,
                bond_token_list: (_b = (_a = charData.bondTokenList) === null || _a === void 0 ? void 0 : _a.map(bt => ({
                    mana_board_index: bt.manaBoardIndex,
                    status: bt.status
                }))) !== null && _b !== void 0 ? _b : [],
                join_time: (0, utils_2.clientSerializeDate)(charData.joinTime),
                update_time: (0, utils_2.clientSerializeDate)(charData.updateTime)
            });
            break;
        }
        case wdfpData_1.MailType.EQUIPMENT: {
            if (mail.type_id === null)
                break;
            const result = (0, equipment_1.givePlayerEquipmentSync)(playerId, mail.type_id, mail.number);
            equipmentList.push(result);
            break;
        }
        case wdfpData_1.MailType.STAR_CRUMB: {
            const newCrumb = player.starCrumb + mail.number;
            (0, wdfpData_1.updatePlayerSync)({ id: playerId, starCrumb: newCrumb });
            userInfo['star_crumb'] = newCrumb;
            break;
        }
        case wdfpData_1.MailType.FREE_MANA: {
            const newMana = player.freeMana + mail.number;
            (0, wdfpData_1.updatePlayerSync)({ id: playerId, freeMana: newMana });
            userInfo['free_mana'] = newMana;
            break;
        }
        case wdfpData_1.MailType.EXP_POOL: {
            const newExp = player.expPool + mail.number;
            (0, wdfpData_1.updatePlayerSync)({ id: playerId, expPool: newExp });
            userInfo['exp_pool'] = newExp;
            break;
        }
        case wdfpData_1.MailType.BOND_TOKEN: {
            const newBond = player.bondToken + mail.number;
            (0, wdfpData_1.updatePlayerSync)({ id: playerId, bondToken: newBond });
            userInfo['bond_token'] = newBond;
            break;
        }
        case wdfpData_1.MailType.BOSS_BOOST_POINT: {
            const newBoss = player.bossBoostPoint + mail.number;
            (0, wdfpData_1.updatePlayerSync)({ id: playerId, bossBoostPoint: newBoss });
            userInfo['boss_boost_point'] = newBoss;
            break;
        }
        case wdfpData_1.MailType.BOOST_POINT: {
            const newBoost = player.boostPoint + mail.number;
            (0, wdfpData_1.updatePlayerSync)({ id: playerId, boostPoint: newBoost });
            userInfo['boost_point'] = newBoost;
            break;
        }
        case wdfpData_1.MailType.RANK_POINT: {
            const newRank = player.rankPoint + mail.number;
            (0, wdfpData_1.updatePlayerSync)({ id: playerId, rankPoint: newRank });
            userInfo['rank_point'] = newRank;
            break;
        }
    }
    (0, wdfpData_1.insertReceiveHistorySync)(playerId, { type: mail.type, type_id: mail.type_id, number: mail.number });
    return { characterList, equipmentList, itemList, userInfo };
}
const routes = (fastify) => __awaiter(void 0, void 0, void 0, function* () {
    fastify.post("/index", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        if (!viewerId || isNaN(viewerId))
            return reply.status(400).send({
                error: "Bad Request",
                message: "Invalid viewer_id"
            });
        const session = yield (0, wdfpData_1.getSession)(viewerId.toString());
        if (!session)
            return reply.status(400).send({
                error: "Bad Request",
                message: "Invalid viewer_id"
            });
        const playerId = (0, activeAccount_1.resolvePlayerIdSync)(session.accountId);
        if (playerId === null)
            return reply.status(400).send({
                error: "Bad Request",
                message: "No player bound to account"
            });
        const page = body.current_page || 1;
        const mails = (0, wdfpData_1.getPlayerMailsSync)(playerId, page, 100);
        const totalCount = (0, wdfpData_1.getPlayerMailCountSync)(playerId);
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            data_headers: (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
            data: {
                mail: mails.map(formatMailResponse),
                total_count: totalCount,
            }
        });
    }));
    fastify.post("/receive", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        const mailId = body.mail_id;
        if (!viewerId || isNaN(viewerId) || !mailId || isNaN(mailId))
            return reply.status(400).send({
                error: "Bad Request",
                message: "Invalid request body"
            });
        const session = yield (0, wdfpData_1.getSession)(viewerId.toString());
        if (!session)
            return reply.status(400).send({
                error: "Bad Request",
                message: "Invalid viewer_id"
            });
        const playerId = (0, activeAccount_1.resolvePlayerIdSync)(session.accountId);
        if (playerId === null)
            return reply.status(400).send({
                error: "Bad Request",
                message: "No player bound to account"
            });
        // Read mail before claiming to get attachment info
        const mails = (0, wdfpData_1.getPlayerMailsSync)(playerId, 1, 1000, true);
        const mail = mails.find(m => m.id === mailId);
        if (!mail)
            return reply.status(400).send({
                error: "Bad Request",
                message: "Mail not found or already received"
            });
        // Apply reward first
        const { characterList, equipmentList, itemList, userInfo } = applyMailReward(playerId, mail);
        // Then mark as received
        (0, wdfpData_1.receiveMailSync)(playerId, mailId);
        const totalCount = (0, wdfpData_1.getPlayerMailCountSync)(playerId);
        const responseData = {
            auto_sale_expired_mail: false,
            dispose_expired_mail: false,
            total_count: totalCount,
            mail_arrived: (0, wdfpData_1.getPlayerMailCountSync)(playerId, true) > 0,
        };
        if (characterList.length > 0)
            responseData.character_list = characterList;
        if (equipmentList.length > 0)
            responseData.equipment_list = equipmentList;
        if (Object.keys(itemList).length > 0)
            responseData.item_list = itemList;
        if (Object.keys(userInfo).length > 0)
            responseData.user_info = userInfo;
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            data_headers: (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
            data: responseData
        });
    }));
    fastify.post("/receive_all", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        const mailIds = body.mail_ids;
        if (!viewerId || isNaN(viewerId) || !mailIds || !Array.isArray(mailIds))
            return reply.status(400).send({
                error: "Bad Request",
                message: "Invalid request body"
            });
        const session = yield (0, wdfpData_1.getSession)(viewerId.toString());
        if (!session)
            return reply.status(400).send({
                error: "Bad Request",
                message: "Invalid viewer_id"
            });
        const playerId = (0, activeAccount_1.resolvePlayerIdSync)(session.accountId);
        if (playerId === null)
            return reply.status(400).send({
                error: "Bad Request",
                message: "No player bound to account"
            });
        // Get all unreceived mails
        const unreceivedMails = (0, wdfpData_1.getPlayerMailsSync)(playerId, 1, 1000, true);
        const mailMap = new Map(unreceivedMails.map(m => [m.id, m]));
        const alreadyCount = mailIds.filter(id => !mailMap.has(id)).length;
        const characterList = [];
        const equipmentList = [];
        const itemList = {};
        const userInfo = {};
        for (const mailId of mailIds) {
            const mail = mailMap.get(mailId);
            if (!mail)
                continue;
            const { characterList: cl, equipmentList: el, itemList: il, userInfo: ui } = applyMailReward(playerId, mail);
            characterList.push(...cl);
            equipmentList.push(...el);
            Object.assign(itemList, il);
            Object.assign(userInfo, ui);
        }
        // Mark all as received
        const claimed = (0, wdfpData_1.receiveAllMailsSync)(playerId, mailIds.filter(id => mailMap.has(id)));
        const responseData = {
            already_mail_count: alreadyCount,
            auto_sale_expired_mail_count: 0,
            deleted_mail_count: 0,
            dispose_expired_mail_count: 0,
            ex_boost_item_list: [],
            mail_ids: claimed,
            max_overed_mail_count: 0,
            outdated_mail_count: 0,
            total_count: (0, wdfpData_1.getPlayerMailCountSync)(playerId),
            mail_arrived: (0, wdfpData_1.getPlayerMailCountSync)(playerId, true) > 0,
        };
        if (characterList.length > 0)
            responseData.character_list = characterList;
        if (equipmentList.length > 0)
            responseData.equipment_list = equipmentList;
        if (Object.keys(itemList).length > 0)
            responseData.item_list = itemList;
        if (Object.keys(userInfo).length > 0)
            responseData.user_info = userInfo;
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            data_headers: (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
            data: responseData
        });
    }));
});
exports.default = routes;
