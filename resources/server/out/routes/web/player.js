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
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const _1 = require(".");
const wdfpData_1 = require("../../data/wdfpData");
const activeAccount_1 = require("../../data/activeAccount");
const character_table_json_1 = __importDefault(require("../../../docs/generated/character_table.json"));
const item_lookup_json_1 = __importDefault(require("../../../assets/item_lookup.json"));
const equipment_lookup_json_1 = __importDefault(require("../../../assets/equipment_lookup.json"));
const quest_lookup_json_1 = __importDefault(require("../../../assets/quest_lookup.json"));
const charLookup = {};
for (const c of character_table_json_1.default) {
    charLookup[c.id] = { name: c.name, title: c.title, rarity: c.rarity, element: c.element };
}
function formatTime(offset) {
    if (offset === null || offset === undefined)
        return "系统时间";
    const d = new Date(Date.now() + offset);
    return d.toISOString().replace("T", " ").substring(0, 19);
}
function htmlEscape(s) {
    return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
        .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
const routes = (fastify) => __awaiter(void 0, void 0, void 0, function* () {
    fastify.get("/", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        let html = (0, fs_1.readFileSync)(path_1.default.join(__dirname, _1.staticPagesDir, "players.html")).toString("utf-8");
        const activePid = (0, activeAccount_1.getActivePlayerId)();
        const selectedAccountId = (0, activeAccount_1.getSelectedAccountId)();
        let listContent = '';
        // Account management table
        const accounts = (0, wdfpData_1.getAllAccountsSync)();
        let accountRows = '';
        for (const acc of accounts) {
            const pids = (0, wdfpData_1.getAccountPlayersSync)(acc.id);
            const saveCount = pids.length;
            // Use per-account default player instead of global activePlayerId
            const defaultPid = (0, activeAccount_1.getAccountDefaultPlayer)(acc.id);
            const activeName = defaultPid ? (htmlEscape(((_a = (0, wdfpData_1.getPlayerSync)(defaultPid)) === null || _a === void 0 ? void 0 : _a.name) || '-')) : '-';
            accountRows += `<tr>
                <td>${acc.id}</td>
                <td>${saveCount}</td>
                <td>${activeName}</td>
                <td>
                    <form method="post" action="/api/server/selectAccount?accountId=${acc.id}" style="display:inline">
                        <button type="submit" class="text-xs bg-primary text-on-primary px-2 py-1 rounded-full">查看存档</button>
                    </form>
                    <form method="post" action="/api/server/newSave?accountId=${acc.id}" style="display:inline">
                        <button type="submit" class="text-xs bg-primary text-on-primary px-2 py-1 rounded-full">新建存档</button>
                    </form>
                    <form method="post" action="/api/server/deleteAccount?id=${acc.id}" style="display:inline" onsubmit="return confirm('删除账号 ${acc.id} 及所有存档？')">
                        <button type="submit" class="text-xs text-error px-2 py-1 rounded-full border border-error">删除</button>
                    </form>
                </td>
            </tr>`;
        }
        listContent += `<section class="flex flex-col p-5 border border-outline-variant rounded-3xl w-full gap-3">
            <h3 class="text-xl text-on-background font-semibold">账号管理</h3>
            <table class="w-full text-sm"><thead><tr class="text-left border-b border-outline-variant">
                <th class="p-1">ID</th><th class="p-1">存档数</th><th class="p-1">生效存档</th><th class="p-1">操作</th>
            </tr></thead><tbody>${accountRows || '<tr><td colspan="4" class="text-on-surface-variant p-2">暂无账号</td></tr>'}</tbody></table>
        </section>`;
        // Save management table (for selected account)
        if (selectedAccountId !== null) {
            const pids = (0, wdfpData_1.getAccountPlayersSync)(selectedAccountId);
            let saveRows = '';
            for (const pid of pids) {
                const player = (0, wdfpData_1.getPlayerSync)(pid);
                if (!player)
                    continue;
                const name = htmlEscape(player.name || `Player${pid}`);
                const level = player.degreeId || 1;
                const charCount = Object.keys((0, wdfpData_1.getPlayerCharactersSync)(pid)).length;
                const isActive = activePid === pid;
                saveRows += `<tr class="${isActive ? 'bg-primary/10' : ''}">
                    <td>${pid}</td>
                    <td><a href="/player/${pid}" class="text-primary underline">${name}</a></td>
                    <td>Lv.${level}</td>
                    <td>${charCount}</td>
                    <td>${formatTime((_b = player.timeOffset) !== null && _b !== void 0 ? _b : null)}</td>
                    <td>
                        <form method="post" action="/api/server/activateSave?playerId=${pid}" style="display:inline">
                            <button type="submit" class="text-xs bg-primary text-on-primary px-2 py-1 rounded-full">${isActive ? '当前' : '切换'}</button>
                        </form>
                        <form method="post" action="/api/server/renameSave" style="display:inline">
                            <input type="hidden" name="playerId" value="${pid}">
                            <input type="text" name="name" placeholder="${htmlEscape(player.name || '')}" class="text-xs w-20 px-1 py-0.5 rounded border border-outline-variant">
                            <button type="submit" class="text-xs border border-outline-variant px-2 py-1 rounded-full">改名</button>
                        </form>
                        <form method="post" action="/api/server/cloneSave?playerId=${pid}&accountId=${selectedAccountId}" style="display:inline">
                            <button type="submit" class="text-xs border border-outline-variant px-2 py-1 rounded-full">复制</button>
                        </form>
                        <form method="post" action="/api/server/deleteSave?playerId=${pid}" style="display:inline" onsubmit="return confirm('删除存档 ${pid}？')">
                            <button type="submit" class="text-xs text-error px-2 py-1 rounded-full border border-error">删除</button>
                        </form>
                    </td>
                </tr>`;
            }
            listContent += `<section class="flex flex-col p-5 border border-outline-variant rounded-3xl w-full gap-3">
                <h3 class="text-xl text-on-background font-semibold">account ${selectedAccountId} 的存档</h3>
                <table class="w-full text-sm"><thead><tr class="text-left border-b border-outline-variant">
                    <th class="p-1">ID</th><th class="p-1">名字</th><th class="p-1">等级</th><th class="p-1">角色数</th><th class="p-1">存档时间</th><th class="p-1">操作</th>
                </tr></thead><tbody>${saveRows || '<tr><td colspan="6" class="text-on-surface-variant p-2">暂无存档</td></tr>'}</tbody></table>
            </section>`;
        }
        // Player list
        const players = (0, wdfpData_1.getAllPlayersSync)();
        if (players.length === 0) {
            listContent += `<h4 class="text-xl w-full text-center font-bold">暂无玩家</h4>`;
        }
        else {
            let playerList = '';
            for (const player of players) {
                playerList += `<li class="w-full">
                    <a href="/player/${player.id}" class="p-5 h-full text-on-surface hover:text-primary items-center flex gap-3 border-outline-variant transition-colors border rounded-3xl hover:bg-surface-container-low">
                        <section class="flex flex-col gap-2 flex-1">
                            <h4 class="text-xl font-bold">${htmlEscape(player.name)}</h4>
                            <h4 class="text-base font-bold text-on-surface-variant">Last Login: ${player.lastLoginTime.toDateString()}</h4>
                        </section>
                        <section class="flex gap-3 items-center">
                            <p class="text-xl text-on-surface-variant">Player Id</p>
                            <h4 class="text-xl font-bold">${player.id}</h4>
                        </section>
                    </a>
                </li>`;
            }
            listContent += `<section class="flex flex-col p-5 border border-outline-variant rounded-3xl w-full gap-3">
                <h3 class="text-xl text-on-background font-semibold">玩家列表</h3>
                <ul class="flex flex-col gap-3">${playerList}</ul>
            </section>`;
        }
        html = html.replace("{{listContent}}", listContent);
        reply.header("content-type", "text/html; charset=utf-8");
        reply.send(html);
    }));
    fastify.get("/:playerId", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _c, _d, _e, _f;
        const { playerId } = request.params;
        const { error } = request.query;
        const parsedPlayerId = Number(playerId);
        if (isNaN(parsedPlayerId))
            return reply.redirect("/player");
        const player = (0, wdfpData_1.getPlayerSync)(parsedPlayerId);
        if (player === null)
            return reply.redirect("/player");
        let html = (0, fs_1.readFileSync)(path_1.default.join(__dirname, _1.staticPagesDir, "player.html")).toString("utf-8");
        // Basic info
        html = html.replace(/{{playerName}}/g, htmlEscape(player.name))
            .replace(/{{playerComment}}/g, htmlEscape(player.comment))
            .replace(/{{playerId}}/g, String(parsedPlayerId))
            .replace("{{uploadError}}", error === undefined ? '' : `<h3 class="text-xl text-error font-semibold mt-2">${htmlEscape(error)}</h3>`);
        // Resource fields
        const resourceFields = [
            { key: 'expPool', label: '经验池', value: player.expPool },
            { key: 'freeVmoney', label: '星导石(免费)', value: player.freeVmoney },
            { key: 'vmoney', label: '星导石(付费)', value: player.vmoney },
            { key: 'freeMana', label: 'Mana(免费)', value: player.freeMana },
            { key: 'paidMana', label: 'Mana(付费)', value: player.paidMana },
            { key: 'stamina', label: '体力', value: player.stamina },
            { key: 'rankPoint', label: 'Rank', value: player.rankPoint },
            { key: 'starCrumb', label: '星屑', value: player.starCrumb },
            { key: 'bondToken', label: '羁绊证', value: player.bondToken },
            { key: 'bossBoostPoint', label: 'Boss Boost', value: player.bossBoostPoint },
            { key: 'boostPoint', label: 'Boost', value: player.boostPoint },
        ];
        let resourcesHtml = '';
        for (const f of resourceFields) {
            resourcesHtml += `<div><label class="text-xs text-on-surface-variant">${f.label}</label>
                <input class="edit-field bg-surface-container rounded border border-outline-variant p-1 w-full text-sm" value="${f.value}" data-field="${f.key}"></div>`;
        }
        html = html.replace("{{resources}}", resourcesHtml);
        html = html.replace("{{resourceCols}}", "grid-cols-4");
        // Character list — sorted by joinTime DESC
        const characters = (0, wdfpData_1.getPlayerCharactersSync)(parsedPlayerId);
        const charList = Object.entries(characters).sort((a, b) => b[1].joinTime.getTime() - a[1].joinTime.getTime());
        let charsHtml = '';
        for (const [code, char] of charList) {
            const info = charLookup[Number(code)];
            const name = info ? htmlEscape(info.name) : '?';
            const title = info ? htmlEscape(info.title) : '-';
            const rarity = info ? info.rarity : '-';
            const element = info ? info.element : '-';
            const joinStr = char.joinTime.toISOString().replace('T', ' ').substring(0, 19);
            const delBtn = Number(code) === 1
                ? '<span class="text-xs text-on-surface-variant">Alk</span>'
                : `<button class="js-action text-xs text-error border border-error rounded-full px-2" data-action="delChar" data-code="${code}">✕</button>`;
            charsHtml += `<tr>
                <td class="p-1">${name}</td>
                <td class="p-1 text-xs text-on-surface-variant">${title}</td>
                <td class="p-1 text-xs text-on-surface-variant">${code}</td>
                <td class="p-1 text-xs">${rarity} ${element}</td>
                <td class="p-1 text-xs text-on-surface-variant">${joinStr}</td>
                <td class="p-1">${delBtn}</td>
            </tr>`;
        }
        html = html.replace("{{characterRows}}", charsHtml || '<tr><td colspan="6" class="text-on-surface-variant p-2">暂无角色</td></tr>');
        html = html.replace("{{characterCount}}", String(charList.length));
        // Items
        const items = (0, wdfpData_1.getPlayerItemsSync)(parsedPlayerId);
        let itemsHtml = '';
        for (const [itemId, count] of Object.entries(items)) {
            const itemName = item_lookup_json_1.default[itemId] || '-';
            itemsHtml += `<tr>
                <td class="p-1">${htmlEscape(itemName)}</td>
                <td class="p-1 text-xs text-on-surface-variant">${itemId}</td>
                <td class="p-1">${count}</td>
                <td class="p-1"><button class="js-action text-xs text-error border border-error rounded-full px-2" data-action="delItem" data-item-id="${itemId}">✕</button></td>
            </tr>`;
        }
        html = html.replace("{{itemRows}}", itemsHtml || '<tr><td colspan="4" class="text-on-surface-variant p-2">暂无道具</td></tr>');
        // Equipment
        const equipment = (0, wdfpData_1.getPlayerEquipmentListSync)(parsedPlayerId);
        let equipHtml = '';
        for (const [eqId, eq] of Object.entries(equipment)) {
            const info = equipment_lookup_json_1.default[eqId];
            const name = info ? htmlEscape(info.name) : '-';
            const rarity = info ? info.rarity : '-';
            const cat = info ? info.category : '-';
            equipHtml += `<tr>
                <td class="p-1">${name}</td>
                <td class="p-1 text-xs text-on-surface-variant">${eqId}</td>
                <td class="p-1 text-xs text-on-surface-variant">${rarity}★</td>
                <td class="p-1 text-xs text-on-surface-variant">${cat}</td>
                <td class="p-1">${eq.level}</td>
                <td class="p-1">${eq.enhancementLevel}</td>
            </tr>`;
        }
        html = html.replace("{{equipRows}}", equipHtml || '<tr><td colspan="6" class="text-on-surface-variant p-2">暂无装备</td></tr>');
        // Quest Progress
        const questProgress = (0, wdfpData_1.getPlayerQuestProgressSync)(parsedPlayerId);
        let qpHtml = '';
        let qpCount = 0;
        for (const [section, quests] of Object.entries(questProgress)) {
            for (const qp of quests) {
                qpCount++;
                const qkey = `${section}_${qp.questId}`;
                const qname = quest_lookup_json_1.default[qkey] || '-';
                qpHtml += `<tr>
                    <td class="p-1">${htmlEscape(qname)}</td>
                    <td class="p-1 text-xs text-on-surface-variant">${section}</td>
                    <td class="p-1 text-xs text-on-surface-variant">${qp.questId}</td>
                    <td class="p-1">${qp.finished ? '✅' : '—'}</td>
                    <td class="p-1">${(_c = qp.highScore) !== null && _c !== void 0 ? _c : '—'}</td>
                    <td class="p-1">${(_d = qp.clearRank) !== null && _d !== void 0 ? _d : '—'}</td>
                    <td class="p-1">${(_e = qp.bestElapsedTimeMs) !== null && _e !== void 0 ? _e : '—'}</td>
                    <td class="p-1"><button class="js-action text-xs text-error border border-error rounded-full px-2" data-action="delQuestProgress" data-section="${section}" data-quest-id="${qp.questId}">✕</button></td>
                </tr>`;
            }
        }
        html = html.replace("{{questProgressRows}}", qpHtml || '<tr><td colspan="8" class="text-on-surface-variant p-2">暂无关卡记录</td></tr>');
        html = html.replace("{{questProgressCount}}", String(qpCount));
        // Drawn Quests
        const drawnQuests = (0, wdfpData_1.getPlayerDrawnQuestsSync)(parsedPlayerId);
        let dqHtml = '';
        for (const dq of drawnQuests) {
            const qkey = `${dq.categoryId}_${dq.questId}`;
            const qname = quest_lookup_json_1.default[qkey] || '-';
            dqHtml += `<tr>
                <td class="p-1">${htmlEscape(qname)}</td>
                <td class="p-1 text-xs text-on-surface-variant">${dq.categoryId}</td>
                <td class="p-1 text-xs text-on-surface-variant">${dq.questId}</td>
                <td class="p-1 text-xs text-on-surface-variant">${dq.oddsId}</td>
                <td class="p-1"><button class="js-action text-xs text-error border border-error rounded-full px-2" data-action="delDrawnQuest" data-category="${dq.categoryId}" data-quest-id="${dq.questId}">✕</button></td>
            </tr>`;
        }
        html = html.replace("{{drawnQuestRows}}", dqHtml || '<tr><td colspan="5" class="text-on-surface-variant p-2">暂无抽选记录</td></tr>');
        html = html.replace("{{drawnQuestCount}}", String(drawnQuests.length));
        // Account settings
        html = html.replace("{{tutorialStep}}", String((_f = player.tutorialStep) !== null && _f !== void 0 ? _f : ''));
        html = html.replace("{{auto3x}}", player.enableAuto3x ? 'checked' : '');
        html = html.replace("{{birth}}", String(player.birth));
        html = html.replace("{{degreeId}}", String(player.degreeId));
        html = html.replace("{{leaderCharacterId}}", String(player.leaderCharacterId));
        reply.header("content-type", "text/html; charset=utf-8");
        reply.send(html);
    }));
});
exports.default = routes;
