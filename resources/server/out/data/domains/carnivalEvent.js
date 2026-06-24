"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertPlayerCarnivalEventRecordSync = exports.getPlayerCarnivalEventRecordSync = exports.getPlayerCarnivalEventRecordsSync = void 0;
const db_1 = require("../db");
const utils_1 = require("../utils");
function buildRecord(raw) {
    return {
        eventId: raw.event_id,
        folderId: raw.folder_id,
        bestScore: raw.best_score,
        previousScore: raw.previous_score,
        previousCharacterIds: raw.previous_character_ids !== null ? (0, utils_1.deserializeNumberList)(raw.previous_character_ids) : null,
        previousUnisonCharacterIds: raw.previous_unison_character_ids !== null ? (0, utils_1.deserializeNumberList)(raw.previous_unison_character_ids) : null,
    };
}
function getPlayerCarnivalEventRecordsSync(playerId, eventId) {
    const rows = (0, db_1.getDb)().prepare(`
    SELECT player_id, event_id, folder_id, best_score, previous_score, previous_character_ids, previous_unison_character_ids
    FROM players_carnival_event_records
    WHERE player_id = ? AND event_id = ?
    `).all(playerId, eventId);
    return rows.map(buildRecord);
}
exports.getPlayerCarnivalEventRecordsSync = getPlayerCarnivalEventRecordsSync;
function getPlayerCarnivalEventRecordSync(playerId, eventId, folderId) {
    const raw = (0, db_1.getDb)().prepare(`
    SELECT player_id, event_id, folder_id, best_score, previous_score, previous_character_ids, previous_unison_character_ids
    FROM players_carnival_event_records
    WHERE player_id = ? AND event_id = ? AND folder_id = ?
    `).get(playerId, eventId, folderId);
    return raw ? buildRecord(raw) : null;
}
exports.getPlayerCarnivalEventRecordSync = getPlayerCarnivalEventRecordSync;
function upsertPlayerCarnivalEventRecordSync(playerId, eventId, folderId, score, characterIds, unisonCharacterIds) {
    var _a;
    const existing = getPlayerCarnivalEventRecordSync(playerId, eventId, folderId);
    const bestScore = existing ? Math.max((_a = existing.bestScore) !== null && _a !== void 0 ? _a : 0, score) : score;
    (0, db_1.getDb)().prepare(`
    INSERT INTO players_carnival_event_records (player_id, event_id, folder_id, best_score, previous_score, previous_character_ids, previous_unison_character_ids)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(player_id, event_id, folder_id) DO UPDATE SET
        best_score = excluded.best_score,
        previous_score = excluded.previous_score,
        previous_character_ids = excluded.previous_character_ids,
        previous_unison_character_ids = excluded.previous_unison_character_ids
    `).run(playerId, eventId, folderId, bestScore, score, (0, utils_1.serializeNumberList)(characterIds), (0, utils_1.serializeNumberList)(unisonCharacterIds));
    return {
        eventId,
        folderId,
        bestScore,
        previousScore: score,
        previousCharacterIds: characterIds,
        previousUnisonCharacterIds: unisonCharacterIds,
    };
}
exports.upsertPlayerCarnivalEventRecordSync = upsertPlayerCarnivalEventRecordSync;
