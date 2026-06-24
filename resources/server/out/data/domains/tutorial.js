"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertPlayerTriggeredTutorialsSync = exports.insertPlayerTriggeredTutorialSync = exports.getPlayerTriggeredTutorialsSync = void 0;
const db_1 = require("../db");
/**
 * Gets a player's triggered tutorials.
 *
 * @param playerId The ID of the player to get the triggered tutorials of.
 * @returns A list of the IDs of each triggered tutorial.
 */
function getPlayerTriggeredTutorialsSync(playerId) {
    const db = (0, db_1.getDb)();
    const raw = db.prepare(`
    SELECT id
    FROM players_triggered_tutorials
    WHERE player_id = ?
    `).all(playerId);
    return raw.map(rawTrigger => rawTrigger.id);
}
exports.getPlayerTriggeredTutorialsSync = getPlayerTriggeredTutorialsSync;
/**
 * Marks a tutorial as having been triggered by a player.
 *
 * @param playerId The ID of the player that triggered the tutorial.
 * @param tutorialId The ID of the tutorial that was triggered.
 */
function insertPlayerTriggeredTutorialSync(playerId, tutorialId) {
    const db = (0, db_1.getDb)();
    db.prepare(`
    INSERT INTO players_triggered_tutorials (id, player_id)
    VALUES (?, ?)
    `).run(tutorialId, playerId);
}
exports.insertPlayerTriggeredTutorialSync = insertPlayerTriggeredTutorialSync;
/**
 * Batch marks tutorials as having been triggered by a player.
 *
 * @param playerId The ID of the player that triggered the tutorials.
 * @param tutorialIds An array of tutorial IDs which were triggered.
 */
function insertPlayerTriggeredTutorialsSync(playerId, tutorialIds) {
    const db = (0, db_1.getDb)();
    db.transaction(() => {
        for (const tutorialId of tutorialIds) {
            insertPlayerTriggeredTutorialSync(playerId, tutorialId);
        }
    })();
}
exports.insertPlayerTriggeredTutorialsSync = insertPlayerTriggeredTutorialsSync;
