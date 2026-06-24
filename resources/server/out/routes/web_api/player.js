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
const utils_1 = require("../../data/utils");
const validation_1 = require("./validation");
const wdfpData_1 = require("../../data/wdfpData");
const types_1 = require("../../data/types");
const daily_challenge_point_lookup_json_1 = __importDefault(require("../../../assets/daily_challenge_point_lookup.json"));
const defaultPerPage = 25;
const routes = (fastify) => __awaiter(void 0, void 0, void 0, function* () {
    fastify.get("/", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const { page, perPage } = request.query;
        const parsedPage = page === undefined ? 0 : Number.parseInt(page);
        const parsedPerPage = perPage === undefined ? defaultPerPage : Number.parseInt(perPage);
        if (isNaN(parsedPage) || isNaN(parsedPerPage))
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Invalid query parameters."
            });
        const players = (0, wdfpData_1.getAllPlayersSync)(parsedPage * parsedPerPage, Math.min(defaultPerPage, parsedPerPage));
        return reply.status(200).send(players);
    }));
    fastify.get("/save", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const { id } = request.query;
        const playerId = Number(id);
        if (isNaN(playerId))
            return reply.redirect("/player");
        const data = (0, utils_1.getMergedPlayerDataSync)(playerId);
        if (data === null)
            return reply.redirect("/player");
        const snapshot = {
            schema: "starpoint-cn-save",
            version: 1,
            exportedAt: new Date().toISOString(),
            playerId,
            data
        };
        reply.header("content-disposition", `attachment; filename="save_${playerId}.json"`);
        reply.type('application/json').send(JSON.stringify(snapshot));
    }));
    fastify.post("/save", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const { id } = request.query;
        const playerId = Number(id);
        const fail = (msg) => reply.redirect(`/player/${id}?error=${encodeURIComponent(msg)}`);
        if (isNaN(playerId))
            return reply.redirect("/player");
        try {
            const file = yield request.file();
            if (file === undefined)
                return fail("未选择文件");
            const text = (yield file.toBuffer()).toString('utf-8');
            let parsed;
            try {
                parsed = JSON.parse(text);
            }
            catch (_b) {
                return fail("文件不是有效的 JSON");
            }
            if (parsed === null || typeof parsed !== 'object' || parsed.schema !== 'starpoint-cn-save') {
                return fail("不是有效的存档快照（schema 不符，请使用本面板导出的存档）");
            }
            if (parsed.version !== 1) {
                return fail(`不支持的存档版本：${parsed.version}`);
            }
            const data = parsed.data;
            if (!data || typeof data !== 'object' || !data.player) {
                return fail("存档数据缺失 player 字段");
            }
            (0, utils_1.reviveMergedPlayerDates)(data);
            data.player.id = playerId;
            (0, wdfpData_1.replacePlayerDataSync)(data);
        }
        catch (error) {
            return fail(`恢复失败：${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error}`);
        }
        return reply.redirect(`/player/${id}`);
    }));
    // ====== New: Inline edit endpoints ======
    // Edit single field
    fastify.patch("/:id/field", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const { id } = request.params;
        const playerId = Number(id);
        if (isNaN(playerId))
            return reply.status(400).send({ error: "Invalid player ID" });
        const player = (0, wdfpData_1.getPlayerSync)(playerId);
        if (!player)
            return reply.status(404).send({ error: "Player not found" });
        const body = request.body || {};
        const field = body.field;
        const rawValue = body.value;
        if (!field || rawValue === undefined)
            return reply.status(400).send({ error: "Missing field or value" });
        const result = (0, validation_1.validatePlayerField)(field, rawValue);
        if (!result.ok)
            return reply.status(400).send({ error: result.error });
        const value = result.value;
        // Auto-sync related time fields
        const extra = {};
        if (field === 'stamina') {
            extra.staminaHealTime = new Date();
        }
        if (field === 'expPool') {
            extra.expPooledTime = new Date();
        }
        try {
            const updateData = Object.assign({ id: playerId, [field]: value }, extra);
            (0, wdfpData_1.updatePlayerSync)(updateData);
            return reply.status(200).send({ ok: true, field, value });
        }
        catch (e) {
            return reply.status(500).send({ error: e.message });
        }
    }));
    // Clear all EX boost data for all characters
    fastify.post("/:id/clear_ex_boost", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const playerId = Number(request.params.id);
        if (isNaN(playerId))
            return reply.status(400).send({ error: "Invalid player ID" });
        const result = (0, wdfpData_1.getDb)().prepare(`UPDATE players_characters SET ex_boost_status_id = NULL, ex_boost_ability_id_list = NULL WHERE player_id = ?`).run(playerId);
        return reply.redirect(`/player/${playerId}#actions`);
    }));
    // Reset parties to defaults
    fastify.post("/:id/reset_parties", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const playerId = Number(request.params.id);
        if (isNaN(playerId))
            return reply.status(400).send({ error: "Invalid player ID" });
        (0, wdfpData_1.getDb)().prepare(`DELETE FROM players_parties WHERE player_id = ?`).run(playerId);
        (0, wdfpData_1.getDb)().prepare(`DELETE FROM players_party_groups WHERE player_id = ?`).run(playerId);
        (0, wdfpData_1.insertPlayerPartyGroupListSync)(playerId, (0, wdfpData_1.getDefaultPlayerPartyGroupsSync)(types_1.PartyCategory.NORMAL));
        return reply.redirect(`/player/${playerId}#actions`);
    }));
    // Clear all mails
    fastify.post("/:id/clear_mail", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const playerId = Number(request.params.id);
        if (isNaN(playerId))
            return reply.status(400).send({ error: "Invalid player ID" });
        (0, wdfpData_1.deleteAllPlayerMailSync)(playerId);
        return reply.redirect(`/player/${playerId}#actions`);
    }));
    // Clear receive history
    fastify.post("/:id/clear_receive_history", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const playerId = Number(request.params.id);
        if (isNaN(playerId))
            return reply.status(400).send({ error: "Invalid player ID" });
        (0, wdfpData_1.getDb)().prepare(`DELETE FROM players_receive_history WHERE player_id = ?`).run(playerId);
        return reply.redirect(`/player/${playerId}#actions`);
    }));
    // Add character
    fastify.post("/:id/character", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const { id } = request.params;
        const playerId = Number(id);
        if (isNaN(playerId))
            return reply.status(400).send({ error: "Invalid player ID" });
        const body = request.body || {};
        const code = Number(body.code || body.character_id);
        if (isNaN(code))
            return reply.status(400).send({ error: "Missing code (business code)" });
        if (!validation_1.VALID_CHARACTER_IDS.has(code))
            return reply.status(400).send({ error: `角色 ID ${code} 不存在于资源表中` });
        try {
            (0, wdfpData_1.insertDefaultPlayerCharacterSync)(playerId, code);
            return reply.status(200).send({ ok: true, code });
        }
        catch (e) {
            return reply.status(500).send({ error: e.message });
        }
    }));
    // Delete character
    fastify.delete("/:id/character/:code", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const { id, code } = request.params;
        const playerId = Number(id);
        const charCode = Number(code);
        if (isNaN(playerId) || isNaN(charCode))
            return reply.status(400).send({ error: "Invalid params" });
        try {
            const db = (0, wdfpData_1.getDb)();
            // 1. Delete character data
            db.prepare(`DELETE FROM players_characters WHERE player_id = ? AND id = ?`).run(playerId, charCode);
            db.prepare(`DELETE FROM players_characters_bond_tokens WHERE player_id = ? AND character_id = ?`).run(playerId, charCode);
            db.prepare(`DELETE FROM players_characters_mana_nodes WHERE player_id = ? AND character_id = ?`).run(playerId, charCode);
            // 2. Clear all party references to this character
            for (const col of ['character_id_1', 'character_id_2', 'character_id_3',
                'unison_character_1', 'unison_character_2', 'unison_character_3']) {
                db.prepare(`UPDATE players_parties SET ${col} = NULL WHERE player_id = ? AND ${col} = ?`).run(playerId, charCode);
            }
            return reply.status(200).send({ ok: true });
        }
        catch (e) {
            return reply.status(500).send({ error: e.message });
        }
    }));
    // Add/set item
    fastify.post("/:id/item", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const { id } = request.params;
        const playerId = Number(id);
        if (isNaN(playerId))
            return reply.status(400).send({ error: "Invalid player ID" });
        const body = request.body || {};
        const itemId = Number(body.id || body.itemId);
        const count = Number(body.count || 1);
        if (isNaN(itemId) || isNaN(count))
            return reply.status(400).send({ error: "Missing id or count" });
        if (!validation_1.VALID_ITEM_IDS.has(itemId))
            return reply.status(400).send({ error: `道具 ID ${itemId} 不存在于资源表中` });
        if (count < 0 || count > validation_1.MAX_INT)
            return reply.status(400).send({ error: `count 超出范围（需 0 ~ ${validation_1.MAX_INT}）` });
        try {
            (0, wdfpData_1.updatePlayerItemSync)(playerId, itemId, count);
            return reply.status(200).send({ ok: true, itemId, count });
        }
        catch (e) {
            return reply.status(500).send({ error: e.message });
        }
    }));
    // Delete item
    fastify.delete("/:id/item/:itemId", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const { id, itemId } = request.params;
        const playerId = Number(id);
        const iid = Number(itemId);
        if (isNaN(playerId) || isNaN(iid))
            return reply.status(400).send({ error: "Invalid params" });
        try {
            const db = (0, wdfpData_1.getDb)();
            db.prepare(`DELETE FROM players_items WHERE player_id = ? AND id = ?`).run(playerId, iid);
            return reply.status(200).send({ ok: true });
        }
        catch (e) {
            return reply.status(500).send({ error: e.message });
        }
    }));
    // Delete single quest progress record
    fastify.delete("/:id/quest_progress/:section/:quest_id", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const { id, section, quest_id } = request.params;
        const playerId = Number(id);
        const sec = Number(section);
        const qid = Number(quest_id);
        if (isNaN(playerId) || isNaN(sec) || isNaN(qid))
            return reply.status(400).send({ error: "Invalid params" });
        try {
            const db = (0, wdfpData_1.getDb)();
            db.prepare(`DELETE FROM players_quest_progress WHERE player_id = ? AND section = ? AND quest_id = ?`).run(playerId, sec, qid);
            return reply.status(200).send({ ok: true });
        }
        catch (e) {
            return reply.status(500).send({ error: e.message });
        }
    }));
    // Delete all quest progress for a player
    fastify.delete("/:id/quest_progress", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const playerId = Number(request.params.id);
        if (isNaN(playerId))
            return reply.status(400).send({ error: "Invalid params" });
        try {
            const db = (0, wdfpData_1.getDb)();
            db.prepare(`DELETE FROM players_quest_progress WHERE player_id = ?`).run(playerId);
            return reply.status(200).send({ ok: true });
        }
        catch (e) {
            return reply.status(500).send({ error: e.message });
        }
    }));
    // Delete single drawn quest record
    fastify.delete("/:id/drawn_quest/:category/:quest_id", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const { id, category, quest_id } = request.params;
        const playerId = Number(id);
        const cat = Number(category);
        const qid = Number(quest_id);
        if (isNaN(playerId) || isNaN(cat) || isNaN(qid))
            return reply.status(400).send({ error: "Invalid params" });
        try {
            const db = (0, wdfpData_1.getDb)();
            db.prepare(`DELETE FROM players_drawn_quests WHERE player_id = ? AND category_id = ? AND quest_id = ?`).run(playerId, cat, qid);
            return reply.status(200).send({ ok: true });
        }
        catch (e) {
            return reply.status(500).send({ error: e.message });
        }
    }));
    // Delete all drawn quests for a player
    fastify.delete("/:id/drawn_quest", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const playerId = Number(request.params.id);
        if (isNaN(playerId))
            return reply.status(400).send({ error: "Invalid params" });
        try {
            const db = (0, wdfpData_1.getDb)();
            db.prepare(`DELETE FROM players_drawn_quests WHERE player_id = ?`).run(playerId);
            return reply.status(200).send({ ok: true });
        }
        catch (e) {
            return reply.status(500).send({ error: e.message });
        }
    }));
    fastify.post("/:id/reset_challenge", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _c, _d;
        const playerId = Number(request.params.id);
        if (isNaN(playerId))
            return reply.status(400).send({ error: "Invalid params" });
        try {
            const entries = (0, wdfpData_1.getPlayerDailyChallengePointListSync)(playerId);
            const lookup = daily_challenge_point_lookup_json_1.default;
            if (entries.length === 0) {
                // No entries yet — create all 282 from CDN
                const defaults = Object.entries(lookup).map(([idStr, data]) => ({
                    id: Number(idStr),
                    point: data.maxPoint,
                    campaignList: []
                }));
                (0, wdfpData_1.insertPlayerDailyChallengePointListSync)(playerId, defaults);
                return reply.status(200).send({ ok: true, count: defaults.length, created: true });
            }
            for (const entry of entries) {
                const maxPoint = (_d = (_c = lookup[String(entry.id)]) === null || _c === void 0 ? void 0 : _c.maxPoint) !== null && _d !== void 0 ? _d : entry.point;
                (0, wdfpData_1.updatePlayerDailyChallengePointSync)(playerId, entry.id, maxPoint);
            }
            return reply.status(200).send({ ok: true, count: entries.length });
        }
        catch (e) {
            return reply.status(500).send({ error: e.message });
        }
    }));
    // Clear mailbox (admin recovery for crash-causing illegal mail)
    fastify.delete("/:id/mail", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const playerId = Number(request.params.id);
        if (isNaN(playerId))
            return reply.status(400).send({ error: "Invalid player ID" });
        if (!(0, wdfpData_1.getPlayerSync)(playerId))
            return reply.status(404).send({ error: "Player not found" });
        try {
            const deleted = (0, wdfpData_1.deleteAllPlayerMailSync)(playerId);
            return reply.status(200).send({ ok: true, deleted });
        }
        catch (e) {
            return reply.status(500).send({ error: e.message });
        }
    }));
});
exports.default = routes;
