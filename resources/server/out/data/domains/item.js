"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.givePlayerItemSync = exports.updatePlayerItemSync = exports.insertPlayerItemsSync = exports.getPlayerItemsSync = exports.getPlayerItemSync = void 0;
const db_1 = require("../db");
/**
 * Gets the amount of a singular item that a player owns.
 *
 * @param playerId The ID of the player.
 * @param itemId The ID of the item.
 * @returns The amount of the item that the player owns, or null, indicating no ownership.
 */
function getPlayerItemSync(playerId, itemId) {
    const db = (0, db_1.getDb)();
    const rawItem = db.prepare(`
    SELECT id, amount
    FROM players_items
    WHERE player_id = ? AND id = ?
    `).get(playerId, Number(itemId));
    return rawItem === undefined ? null : rawItem.amount;
}
exports.getPlayerItemSync = getPlayerItemSync;
/**
 * Gets the items that a player owns.
 *
 * @param playerId The ID of the player.
 * @returns A record where the index is the item's ID and the value is the item's amount.
 */
function getPlayerItemsSync(playerId) {
    const db = (0, db_1.getDb)();
    const rawItems = db.prepare(`
    SELECT id, amount
    FROM players_items
    WHERE player_id = ?
    `).all(playerId);
    const output = {};
    for (const rawItem of rawItems) {
        output[rawItem.id.toString()] = rawItem.amount;
    }
    return output;
}
exports.getPlayerItemsSync = getPlayerItemsSync;
/**
 * Inserts a singular item into the player's inventory.
 *
 * @param playerId The ID of the player.
 * @param itemId The ID of the item to insert.
 * @param amount The amount of the item to insert.
 */
function insertPlayerItemSync(playerId, itemId, amount) {
    const db = (0, db_1.getDb)();
    db.prepare(`
    INSERT INTO players_items (id, amount, player_id)
    VALUES (?, ?, ?)
    `).run(Number(itemId), amount, playerId);
}
/**
 * Batch inserts a record of player items into a player's inventory.
 *
 * @param playerId The ID of the player.
 * @param items The record of items.
 */
function insertPlayerItemsSync(playerId, items) {
    const db = (0, db_1.getDb)();
    db.transaction(() => {
        for (const [itemId, amount] of Object.entries(items)) {
            insertPlayerItemSync(playerId, itemId, amount);
        }
    })();
}
exports.insertPlayerItemsSync = insertPlayerItemsSync;
/**
 * Updates a player's item's amount.
 *
 * @param playerId The ID of the player.
 * @param itemId The item's ID.
 * @param amount The new amount the item should have.
 */
function updatePlayerItemSync(playerId, itemId, amount) {
    const db = (0, db_1.getDb)();
    db.prepare(`
    UPDATE players_items
    SET amount = ?
    WHERE player_id = ? AND id = ?
    `).run(amount, playerId, Number(itemId));
}
exports.updatePlayerItemSync = updatePlayerItemSync;
/**
 * Gives a player giveAmount of an item.
 *
 * @param playerId The ID of the player.
 * @param itemId The ID of the item.
 * @param giveAmount The amount of the item to give.
 * @returns The new total amount of the item that the player owns.
 */
function givePlayerItemSync(playerId, itemId, giveAmount) {
    // check if the player owns the item
    const ownedAmount = getPlayerItemSync(playerId, itemId);
    if (ownedAmount === null) {
        insertPlayerItemSync(playerId, itemId, giveAmount);
        return giveAmount;
    }
    else {
        const newAmount = ownedAmount + giveAmount;
        updatePlayerItemSync(playerId, itemId, newAmount);
        return newAmount;
    }
}
exports.givePlayerItemSync = givePlayerItemSync;
