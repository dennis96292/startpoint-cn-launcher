"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePlayerOptionsSync = exports.updatePlayerOptionSync = exports.getPlayerOptionsSync = exports.insertPlayerOptionsSync = exports.insertPlayerOptionSync = void 0;
const db_1 = require("../db");
const utils_1 = require("../utils");
/**
 * Inserts a value for a player option.
 *
 * @param playerId The ID of the player.
 * @param key The key of the option.
 * @param value The value of the option
 */
function insertPlayerOptionSync(playerId, key, value) {
    const db = (0, db_1.getDb)();
    db.prepare(`
    INSERT INTO players_options (key, value, player_id)
    VALUES (?, ?, ?)
    `).run(key, (0, utils_1.serializeBoolean)(value), playerId);
}
exports.insertPlayerOptionSync = insertPlayerOptionSync;
/**
 * Batch inserts a record of options into the database.
 *
 * @param playerId The ID of the player that these options belong to.
 * @param options The record of options to insert.
 */
function insertPlayerOptionsSync(playerId, options) {
    const db = (0, db_1.getDb)();
    db.transaction(() => {
        for (const [key, value] of Object.entries(options)) {
            insertPlayerOptionSync(playerId, key, value);
        }
    })();
}
exports.insertPlayerOptionsSync = insertPlayerOptionsSync;
/**
 * Gets all of the options that a player has saved.
 *
 * @param playerId The ID of the player.
 * @returns A record of options.
 */
function getPlayerOptionsSync(playerId) {
    const db = (0, db_1.getDb)();
    const rawOptions = db.prepare(`
    SELECT key, value
    FROM players_options
    WHERE player_id = ?
    `).all(playerId);
    const result = {};
    for (const rawOption of rawOptions) {
        result[rawOption.key] = (0, utils_1.deserializeBoolean)(rawOption.value);
    }
    return result;
}
exports.getPlayerOptionsSync = getPlayerOptionsSync;
/**
 * Updates the value of a player option.
 *
 * @param playerId The ID of the player to update the option of.
 * @param key The key of the option to update.
 * @param value The new value.
 */
function updatePlayerOptionSync(playerId, key, value) {
    const db = (0, db_1.getDb)();
    db.prepare(`
    UPDATE players_options
    SET value = ?
    WHERE key = ? AND player_id = ?    
    `).run((0, utils_1.serializeBoolean)(value), key, playerId);
}
exports.updatePlayerOptionSync = updatePlayerOptionSync;
/**
 * Batch updates a player's options.
 *
 * @param playerId The ID of the player to update the options of.
 * @param options A record of options to update the values of.
 */
function updatePlayerOptionsSync(playerId, options) {
    // get all of a player's options
    const allOptions = getPlayerOptionsSync(playerId);
    const db = (0, db_1.getDb)();
    db.transaction(() => {
        for (const [key, newValue] of Object.entries(options)) {
            const existingValue = allOptions[key];
            if (existingValue === undefined) {
                insertPlayerOptionSync(playerId, key, newValue);
            }
            else if (newValue !== existingValue) {
                updatePlayerOptionSync(playerId, key, newValue);
            }
        }
    })();
}
exports.updatePlayerOptionsSync = updatePlayerOptionsSync;
