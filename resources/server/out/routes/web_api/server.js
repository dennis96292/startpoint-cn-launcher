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
const utils_1 = require("../../utils");
const wdfpData_1 = require("../../data/wdfpData");
const utils_2 = require("../../data/utils");
const activeAccount_1 = require("../../data/activeAccount");
const routes = (fastify) => __awaiter(void 0, void 0, void 0, function* () {
    fastify.get("/currentTime", (_request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const date = (0, utils_1.getServerDate)();
        reply.status(200).send({
            servertime: (0, utils_1.getServerTime)(),
            date: date.toISOString(),
            isCustom: date.getTime() !== Date.now()
        });
    }));
    fastify.get("/resetTime", (_request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        (0, utils_1.setServerTime)(null);
        (0, activeAccount_1.saveTimeOffset)(null);
        reply.status(200).send({
            servertime: (0, utils_1.getServerTime)(),
            date: (0, utils_1.getServerDate)().toISOString(),
            isCustom: false
        });
    }));
    fastify.get("/time", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const newTime = request.query.time;
        if (!newTime)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Missing 'time' parameter. Use format: 2025-06-01T12:00:00"
            });
        try {
            let dateStr = newTime;
            if (!dateStr.includes('T')) {
                dateStr = dateStr + 'T00:00:00';
            }
            if (!dateStr.includes('Z') && !dateStr.includes('+') && !dateStr.includes('-', 10)) {
                dateStr = dateStr + 'Z';
            }
            const time = new Date(dateStr);
            if (isNaN(time.getTime())) {
                return reply.status(400).send({
                    "error": "Bad Request",
                    "message": `Invalid time format: "${newTime}". Use ISO format.`
                });
            }
            (0, utils_1.setServerTime)(time);
            (0, activeAccount_1.saveTimeOffset)((0, utils_1.getTimeOffset)());
            reply.status(200).send({
                servertime: (0, utils_1.getServerTime)(),
                date: (0, utils_1.getServerDate)().toISOString(),
                isCustom: true
            });
        }
        catch (error) {
            return reply.status(500).send({
                "error": "Internal Server Error",
                "message": (_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : "Unknown error"
            });
        }
    }));
    // === Account & Save management (device-binding based) ===
    // Select account to view saves
    fastify.post("/selectAccount", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const { accountId } = (request.query || {});
        const aid = parseInt(accountId);
        if (isNaN(aid))
            return reply.redirect('/player');
        (0, activeAccount_1.setSelectedAccountId)(aid);
        return reply.redirect('/player');
    }));
    // Switch active save
    fastify.post("/activateSave", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const { playerId } = (request.query || {});
        const pid = parseInt(playerId);
        if (isNaN(pid))
            return reply.redirect('/player');
        (0, activeAccount_1.setActivePlayerId)(pid);
        // Also persist as this account's default player
        const allAccounts = (0, wdfpData_1.getAllAccountsSync)();
        for (const a of allAccounts) {
            if ((0, wdfpData_1.getAccountPlayersSync)(a.id).includes(pid)) {
                (0, activeAccount_1.saveAccountDefaultPlayer)(a.id, pid);
                break;
            }
        }
        return reply.redirect('/player');
    }));
    // Create new empty save under the given account
    fastify.post("/newSave", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const { accountId: aid } = (request.query || {});
        const accId = parseInt(aid);
        if (isNaN(accId))
            return reply.redirect('/player');
        const player = (0, wdfpData_1.insertDefaultPlayerSync)(accId);
        (0, activeAccount_1.setActivePlayerId)(player.id);
        (0, activeAccount_1.saveAccountDefaultPlayer)(accId, player.id);
        return reply.redirect('/player');
    }));
    // Delete a save
    fastify.post("/deleteSave", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const { playerId } = (request.query || {});
        const pid = parseInt(playerId);
        if (isNaN(pid))
            return reply.redirect('/player');
        const allAccounts = (0, wdfpData_1.getAllAccountsSync)();
        let accountId = 0;
        for (const a of allAccounts) {
            if ((0, wdfpData_1.getAccountPlayersSync)(a.id).includes(pid)) {
                accountId = a.id;
                break;
            }
        }
        if (accountId && (0, wdfpData_1.getAccountPlayersSync)(accountId).length <= 1) {
            // Last save — delete entire account + device binding + default player mapping
            (0, wdfpData_1.deletePlayerSync)(pid);
            (0, wdfpData_1.deleteAccountSync)(accountId);
            // Clean up device bindings to prevent stale mapping on re-login
            try {
                const db = require("../../data/wdfpData").getDb();
                db.prepare(`DELETE FROM device_bindings WHERE account_id = ?`).run(accountId);
            }
            catch (_) { }
            // Remove stale default player mapping
            try {
                const { readState, writeState } = require("../../data/activeAccount");
                const state = readState();
                delete state.defaultPlayers[accountId];
                writeState(state);
            }
            catch (_) { }
        }
        else {
            (0, wdfpData_1.deletePlayerSync)(pid);
        }
        if ((0, activeAccount_1.getActivePlayerId)() === pid)
            (0, activeAccount_1.setActivePlayerId)(null);
        return reply.redirect('/player');
    }));
    // Delete entire account + all saves + device binding
    fastify.post("/deleteAccount", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const { id } = (request.query || {});
        const accountId = parseInt(id);
        if (isNaN(accountId))
            return reply.status(400).send({ error: "Missing or invalid 'id'" });
        const playerIds = (0, wdfpData_1.getAccountPlayersSync)(accountId);
        for (const pid of playerIds) {
            (0, wdfpData_1.deletePlayerSync)(pid);
        }
        // Remove device bindings pointing to this account
        const db = require("../../data/wdfpData").getDb();
        db.prepare(`DELETE FROM device_bindings WHERE account_id = ?`).run(accountId);
        (0, wdfpData_1.deleteAccountSync)(accountId);
        // Remove stale default player mapping
        try {
            const { readState, writeState } = require("../../data/activeAccount");
            const state = readState();
            delete state.defaultPlayers[accountId];
            writeState(state);
        }
        catch (_) { }
        return reply.redirect('/player');
    }));
    // Rename a save
    fastify.post("/renameSave", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body || {};
        const playerId = parseInt(body.playerId);
        const name = body.name;
        if (isNaN(playerId) || !name)
            return reply.status(400).send({ error: "Missing params" });
        (0, wdfpData_1.updatePlayerSync)({ id: playerId, name: String(name) });
        return reply.redirect('/player');
    }));
    // Clone a save to another account
    fastify.post("/cloneSave", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const { playerId: pid, accountId: aid } = (request.query || {});
        const playerId = parseInt(pid);
        const accountId = parseInt(aid);
        if (isNaN(playerId) || isNaN(accountId))
            return reply.redirect('/player');
        // Read source player data
        const serialized = (0, utils_2.getClientSerializedData)(playerId, { viewerId: 0 });
        if (!serialized)
            return reply.redirect('/player');
        // Create new empty save
        const newPlayer = (0, wdfpData_1.insertDefaultPlayerSync)(accountId);
        (0, activeAccount_1.setActivePlayerId)(newPlayer.id);
        // Deserialize source data and merge into new save
        const mergedData = (0, utils_2.deserializePlayerData)(newPlayer.id, serialized);
        (0, wdfpData_1.replacePlayerDataSync)(mergedData);
        (0, activeAccount_1.saveAccountDefaultPlayer)(accountId, newPlayer.id);
        return reply.redirect('/player');
    }));
    // List all accounts with their saves (for the native admin's account/save manager).
    fastify.get("/accounts", (_request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const out = (0, wdfpData_1.getAllAccountsSync)().map((acc) => {
            const defaultPid = (0, activeAccount_1.getAccountDefaultPlayer)(acc.id);
            const saves = (0, wdfpData_1.getAccountPlayersSync)(acc.id).map((pid) => {
                const p = (0, wdfpData_1.getPlayerSync)(pid);
                return p ? {
                    id: pid,
                    name: p.name,
                    level: p.degreeId,
                    charCount: Object.keys((0, wdfpData_1.getPlayerCharactersSync)(pid)).length,
                    active: defaultPid === pid,
                } : null;
            }).filter(Boolean);
            return { id: acc.id, saves };
        });
        return reply.status(200).send(out);
    }));
});
exports.default = routes;
