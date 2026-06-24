"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePlayerBoxGachaDrawnRewardSync = exports.insertPlayerBoxGachaDrawnRewardSync = exports.getPlayerBoxGachaDrawnRewardsSync = exports.updatePlayerBoxGachaSync = exports.insertPlayerBoxGachasSync = exports.insertPlayerBoxGachaSync = exports.getPlayerBoxGachasSync = exports.getPlayerBoxGachaSync = void 0;
const db_1 = require("../db");
const utils_1 = require("../utils");
/**
 * Converts a RawPlayerBoxGacha object into a PlayerBoxGacha object.
 *
 * @param raw The raw object to convert.
 * @returns The converted object.
 */
function buildPlayerBoxGacha(raw) {
    return {
        boxId: raw.box_id,
        resetTimes: raw.reset_times,
        remainingNumber: raw.remaining_number,
        isClosed: (0, utils_1.deserializeBoolean)(raw.is_closed)
    };
}
/**
 * Gets the data for an individual player box gacha.
 *
 * @param playerId The ID of the player.
 * @param gachaId The ID of the box gacha.
 * @param boxId The ID of the box.
 * @returns A PlayerBoxGacha object or null.
 */
function getPlayerBoxGachaSync(playerId, gachaId, boxId) {
    const rawBox = (0, db_1.getDb)().prepare(`
    SELECT id, box_id, reset_times, remaining_number, is_closed
    FROM players_box_gacha
    WHERE player_id = ? AND id = ? AND box_id = ?
    `).get(playerId, gachaId, boxId);
    if (rawBox === undefined)
        return null;
    return buildPlayerBoxGacha(rawBox);
}
exports.getPlayerBoxGachaSync = getPlayerBoxGachaSync;
/**
 * Gets a player's box gachas.
 *
 * @param playerId The ID of the player
 * @returns A record containing the status of the player's box gachas.
 */
function getPlayerBoxGachasSync(playerId) {
    const rawBoxes = (0, db_1.getDb)().prepare(`
    SELECT id, box_id, reset_times, remaining_number, is_closed
    FROM players_box_gacha
    WHERE player_id = ?
    `).all(playerId);
    const buckets = {};
    for (const rawBox of rawBoxes) {
        const id = rawBox.id.toString();
        let bucket = buckets[id];
        if (!bucket) {
            bucket = [];
            buckets[id] = bucket;
        }
        bucket.push(buildPlayerBoxGacha(rawBox));
    }
    return buckets;
}
exports.getPlayerBoxGachasSync = getPlayerBoxGachasSync;
/**
 * Inserts a singular box gacha into a player's data.
 *
 * @param playerId The ID of the player.
 * @param gachaId
 * @param boxGacha The box gacha's data.
 */
function insertPlayerBoxGachaSync(playerId, gachaId, boxGacha) {
    (0, db_1.getDb)().prepare(`
    INSERT INTO players_box_gacha (id, box_id, reset_times, remaining_number, is_closed, player_id)
    VALUES (?, ?, ?, ?, ?, ?)
    `).run(Number(gachaId), boxGacha.boxId, boxGacha.resetTimes, boxGacha.remainingNumber, (0, utils_1.serializeBoolean)(boxGacha.isClosed), playerId);
}
exports.insertPlayerBoxGachaSync = insertPlayerBoxGachaSync;
/**
 * Batch inserts a record of box gachas into a player's data.
 *
 * @param playerId The ID of the player.
 * @param boxGachas The record of box gachas.
 */
function insertPlayerBoxGachasSync(playerId, boxGachas) {
    (0, db_1.getDb)().transaction(() => {
        for (const [section, list] of Object.entries(boxGachas)) {
            for (const boxGacha of list) {
                insertPlayerBoxGachaSync(playerId, section, boxGacha);
            }
        }
    })();
}
exports.insertPlayerBoxGachasSync = insertPlayerBoxGachasSync;
/**
 * Updates a player's box gacha box.
 *
 * @param playerId The ID of the player.
 * @param gachaId The ID of the box gacha that this box belongs to.
 * @param boxGacha
 *
 */
function updatePlayerBoxGachaSync(playerId, gachaId, boxGacha) {
    const fieldMap = {
        'resetTimes': 'reset_times',
        'remainingNumber': 'remaining_number',
        'isClosed': 'is_closed'
    };
    const sets = [];
    const values = [];
    for (const key in boxGacha) {
        const value = boxGacha[key];
        const mapped = fieldMap[key];
        if (mapped && value !== undefined) {
            sets.push(`${mapped} = ?`);
            if (typeof (value) === "boolean") {
                values.push((0, utils_1.serializeBoolean)(value));
            }
            else {
                values.push(value);
            }
        }
    }
    if (sets.length > 0)
        (0, db_1.getDb)().prepare(`
        UPDATE players_box_gacha
        SET ${sets.join(', ')}
        WHERE player_id = ? AND id = ? AND box_id = ?
        `).run([
            ...values,
            playerId,
            Number(gachaId),
            boxGacha.boxId
        ]);
}
exports.updatePlayerBoxGachaSync = updatePlayerBoxGachaSync;
/**
 * Gets all of the drawn rewards for a specific box gacha & box for a player.
 *
 * @param playerId The ID of the player.
 * @param gachaId The id of the box gacha.
 * @param boxId The box's ID.
 * @returns A list of drawn rewards.
 */
function getPlayerBoxGachaDrawnRewardsSync(playerId, gachaId, boxId) {
    return (0, db_1.getDb)().prepare(`
    SELECT id, number
    FROM players_box_gacha_drawn_rewards
    WHERE box_id = ? AND gacha_id = ? AND player_id = ?
    `).all(Number(boxId), gachaId, playerId);
}
exports.getPlayerBoxGachaDrawnRewardsSync = getPlayerBoxGachaDrawnRewardsSync;
/**
 * Inserts a drawn reward for a box gacha.
 *
 * @param playerId The ID of the player.
 * @param gachaId The id of the box gacha.
 * @param boxId The box's ID.
 * @param reward The reward to insert.
 */
function insertPlayerBoxGachaDrawnRewardSync(playerId, gachaId, boxId, reward) {
    (0, db_1.getDb)().prepare(`
    INSERT INTO players_box_gacha_drawn_rewards (id, box_id, gacha_id, number, player_id)
    VALUES (?, ?, ?, ?, ?)
    `).run(reward.id, Number(boxId), gachaId, reward.number, playerId);
}
exports.insertPlayerBoxGachaDrawnRewardSync = insertPlayerBoxGachaDrawnRewardSync;
/**
 * Updates a drawn reward for a box gacha.
 *
 * @param playerId The ID of the player.
 * @param gachaId The id of the box gacha.
 * @param boxId The box's ID.
 * @param rewardId A list of drawn rewards.
 * @param newNumber The new number value the drawn reward should have.
 */
function updatePlayerBoxGachaDrawnRewardSync(playerId, gachaId, boxId, rewardId, newNumber) {
    (0, db_1.getDb)().prepare(`
    UPDATE players_box_gacha_drawn_rewards
    SET number = ?
    WHERE player_id = ? AND gacha_id = ? AND box_id = ? AND id = ?
    `).run(newNumber, playerId, gachaId, Number(boxId), Number(rewardId));
}
exports.updatePlayerBoxGachaDrawnRewardSync = updatePlayerBoxGachaDrawnRewardSync;
/**
/**
/**
/**
/**
/**
/**
 * Deserializes a RawPlayerRushEvent into a PlayerRushEvent
 *
 * @param raw
 * @param endlessBattleNextRound The next endless battle round for this event.
 */
