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
const character_json_1 = __importDefault(require("../../../assets/character.json"));
const item_ids_json_1 = __importDefault(require("../../../assets/item_ids.json"));
const equipment_ids_json_1 = __importDefault(require("../../../assets/equipment_ids.json"));
// Pre-built CDN validation sets
const CDN_CHAR_IDS = new Set(Object.keys(character_json_1.default).map(Number));
const CDN_ITEM_IDS = new Set(item_ids_json_1.default);
const CDN_EQUIP_IDS = new Set(equipment_ids_json_1.default);
const VALID_MAIL_TYPES = new Set([1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15]);
const MAX_INT = 2147483647;
const routes = (fastify) => __awaiter(void 0, void 0, void 0, function* () {
    fastify.post("/send", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const mailType = parseInt(body.type || "0");
        if (!VALID_MAIL_TYPES.has(mailType)) {
            return reply.redirect("/mail?error=" + encodeURIComponent(`无效的附件类型：${mailType}`));
        }
        const typeId = body.type_id ? parseInt(body.type_id) : null;
        // Validate type_id fits in 32-bit signed integer (client Int limit)
        if (typeId !== null && (isNaN(typeId) || typeId > 2147483647 || typeId < 1)) {
            return reply.redirect("/mail?error=" + encodeURIComponent("附件 ID 无效（需为 1-2147483647 之间的整数）"));
        }
        // Validate type_id against CDN data
        if (typeId !== null) {
            if (mailType === 5 && !CDN_CHAR_IDS.has(typeId)) {
                return reply.redirect("/mail?error=" + encodeURIComponent(`角色 ID ${typeId} 不存在于 CDN 数据中`));
            }
            if (mailType === 1 && !CDN_ITEM_IDS.has(typeId)) {
                return reply.redirect("/mail?error=" + encodeURIComponent(`道具 ID ${typeId} 不存在于 CDN 数据中`));
            }
            if (mailType === 6 && !CDN_EQUIP_IDS.has(typeId)) {
                return reply.redirect("/mail?error=" + encodeURIComponent(`装备 ID ${typeId} 不存在于 CDN 数据中`));
            }
        }
        const count = parseInt(body.number || "1");
        const subject = body.subject && body.subject.trim() ? body.subject.trim() : null;
        const desc = body.description && body.description.trim() ? body.description.trim() : null;
        // types that require type_id: Item(1), Character(5), Equipment(6)
        if ((mailType === 1 || mailType === 5 || mailType === 6) && (typeId === null || isNaN(typeId))) {
            return reply.redirect("/mail?error=" + encodeURIComponent("此附件类型需要填写附件 ID"));
        }
        if (isNaN(count) || count < 1) {
            return reply.redirect("/mail?error=" + encodeURIComponent("数量必须大于 0"));
        }
        if (count > MAX_INT) {
            return reply.redirect("/mail?error=" + encodeURIComponent(`数量超出范围（需 ≤ ${MAX_INT}）`));
        }
        // 角色 / 装备每封邮件仅可发送 1 个
        if ((mailType === 5 || mailType === 6) && count !== 1) {
            return reply.redirect("/mail?error=" + encodeURIComponent("角色 / 装备每封邮件仅可发送 1 个"));
        }
        if (subject !== null && subject.length > 64) {
            return reply.redirect("/mail?error=" + encodeURIComponent("标题过长（最多 64 字符）"));
        }
        if (desc !== null && desc.length > 512) {
            return reply.redirect("/mail?error=" + encodeURIComponent("正文过长（最多 512 字符）"));
        }
        const accounts = (0, wdfpData_1.getAllAccountsSync)();
        const now = new Date().toISOString().replace("T", " ").substring(0, 19);
        let sentCount = 0;
        for (const account of accounts) {
            const playerIds = (0, wdfpData_1.getAccountPlayersSync)(account.id);
            for (const playerId of playerIds) {
                try {
                    (0, wdfpData_1.insertMailSync)(playerId, {
                        reason_id: 0,
                        subject,
                        description: desc,
                        type: mailType,
                        type_id: typeId,
                        number: count,
                        receive_time: "0000-00-00 00:00:00",
                        create_time: now,
                        reward_period_limited: 0,
                        reward_limit_time: null,
                    });
                    sentCount++;
                }
                catch (_a) {
                    // skip invalid players
                }
            }
        }
        return reply.redirect("/mail?ok=" + encodeURIComponent(`已向 ${sentCount} 个角色发送邮件`));
    }));
});
exports.default = routes;
