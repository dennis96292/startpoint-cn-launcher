"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePlayerActiveQuestContinueCountSync = exports.deletePlayerActiveQuestSync = exports.insertPlayerActiveQuestSync = exports.getPlayerActiveQuestSync = void 0;
const db_1 = require("../db");
function buildActiveQuest(raw) {
    return {
        playerId: raw.player_id,
        playId: raw.play_id,
        questId: raw.quest_id,
        category: raw.category,
        useBossBoostPoint: raw.use_boss_boost_point === 1,
        useBoostPoint: raw.use_boost_point === 1,
        isAutoStartMode: raw.is_auto_start_mode === 1,
        isMulti: raw.is_multi === 1,
        roomNumber: raw.room_number,
        entryItemId: raw.entry_item_id,
        eventId: raw.event_id,
        continueCount: raw.continue_count
    };
}
function getPlayerActiveQuestSync(playerId) {
    const raw = (0, db_1.getDb)().prepare(`
        SELECT * FROM players_active_quests WHERE player_id = ?
    `).get(playerId);
    return raw ? buildActiveQuest(raw) : null;
}
exports.getPlayerActiveQuestSync = getPlayerActiveQuestSync;
function insertPlayerActiveQuestSync(playerId, quest) {
    var _a, _b, _c;
    (0, db_1.getDb)().prepare(`
        INSERT OR REPLACE INTO players_active_quests
            (player_id, play_id, quest_id, category, use_boss_boost_point,
             use_boost_point, is_auto_start_mode, is_multi, room_number,
             entry_item_id, event_id, continue_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(playerId, quest.playId, quest.questId, quest.category, quest.useBossBoostPoint ? 1 : 0, quest.useBoostPoint ? 1 : 0, quest.isAutoStartMode ? 1 : 0, quest.isMulti ? 1 : 0, (_a = quest.roomNumber) !== null && _a !== void 0 ? _a : null, (_b = quest.entryItemId) !== null && _b !== void 0 ? _b : null, (_c = quest.eventId) !== null && _c !== void 0 ? _c : null, quest.continueCount);
}
exports.insertPlayerActiveQuestSync = insertPlayerActiveQuestSync;
function deletePlayerActiveQuestSync(playerId) {
    (0, db_1.getDb)().prepare(`DELETE FROM players_active_quests WHERE player_id = ?`).run(playerId);
}
exports.deletePlayerActiveQuestSync = deletePlayerActiveQuestSync;
function updatePlayerActiveQuestContinueCountSync(playerId, continueCount) {
    (0, db_1.getDb)().prepare(`
        UPDATE players_active_quests SET continue_count = ? WHERE player_id = ?
    `).run(continueCount, playerId);
}
exports.updatePlayerActiveQuestContinueCountSync = updatePlayerActiveQuestContinueCountSync;
