"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertPlayerActiveMissionsSync = exports.getPlayerActiveMissionsSync = exports.insertPlayerClearedRegularMissionListSync = exports.getPlayerClearedRegularMissionListSync = void 0;
const db_1 = require("../db");
const utils_1 = require("../utils");
/**
 * Retrieve a list of a player's cleared regular missions.
 *
 * @param playerId The ID of the player.
 * @returns A record, where the index is the id of the mission and the value is ???.
 */
function getPlayerClearedRegularMissionListSync(playerId) {
    const raw = (0, db_1.getDb)().prepare(`
    SELECT id, value
    FROM players_cleared_regular_missions
    WHERE player_id = ?
    `).all(playerId);
    const record = {};
    for (const rawClear of raw) {
        record[rawClear.id.toString()] = rawClear.value;
    }
    return record;
}
exports.getPlayerClearedRegularMissionListSync = getPlayerClearedRegularMissionListSync;
/**
 * Sets a regular mission as having been cleared by a player.
 *
 * @param playerId The ID of the player.
 * @param missionId The ID of the mission that was cleared.
 * @param value
 */
function insertPlayerClearedRegularMissionSync(playerId, missionId, value) {
    (0, db_1.getDb)().prepare(`
    INSERT INTO players_cleared_regular_missions (id, value, player_id)
    VALUES (?, ?, ?)
    `).run(Number(missionId), value, playerId);
}
/**
 * Sets a list of regular missions as having been cleared by a player.
 *
 * @param playerId The ID of the player.
 * @param missionList The list of missions that were cleared.
 */
function insertPlayerClearedRegularMissionListSync(playerId, missionList) {
    (0, db_1.getDb)().transaction(() => {
        for (const [missionId, value] of Object.entries(missionList)) {
            insertPlayerClearedRegularMissionSync(playerId, missionId, value);
        }
    })();
}
exports.insertPlayerClearedRegularMissionListSync = insertPlayerClearedRegularMissionListSync;
/**
/**
/**
 * Inserts a singular item into the player's inventory.
 *
 * @param playerId The ID of the player.
 * @param itemId The ID of the item to insert.
 * @param amount The amount of the item to insert.
 */
function insertPlayerItemSync(playerId, itemId, amount) {
    (0, db_1.getDb)().prepare(`
    INSERT INTO players_items (id, amount, player_id)
    VALUES (?, ?, ?)
    `).run(Number(itemId), amount, playerId);
}
/**
/**
/**
/**
 * Retrieves the missions that a player is currently completing.
 *
 * @param playerId The ID of the player.
 * @returns A record of each mission and its current progress.
 */
/**
 * Retrieves the missions that a player is currently completing.
 *
 * @param playerId The ID of the player.
 * @returns A record of each mission and its current progress.
 */
function getPlayerActiveMissionsSync(playerId) {
    const rawMissions = (0, db_1.getDb)().prepare(`
    SELECT id, progress
    FROM players_active_missions
    WHERE player_id = ?
    `).all(playerId);
    const rawStages = (0, db_1.getDb)().prepare(`
    SELECT id, status, mission_id
    FROM players_active_missions_stages
    WHERE player_id = ?
    `).all(playerId);
    const stageBuckets = {};
    for (const rawStage of rawStages) {
        const missionId = rawStage.mission_id.toString();
        let bucket = stageBuckets[missionId];
        if (!bucket) {
            bucket = {};
            stageBuckets[missionId] = bucket;
        }
        bucket[rawStage.id] = (0, utils_1.deserializeBoolean)(rawStage.status);
    }
    const final = {};
    for (const rawMission of rawMissions) {
        const id = rawMission.id.toString();
        final[id] = {
            progress: rawMission.progress,
            stages: stageBuckets[id] || []
        };
    }
    return final;
}
exports.getPlayerActiveMissionsSync = getPlayerActiveMissionsSync;
/**
 * Inserts the data for a singular active mission stage into the database.
 *
 * @param playerId The player's ID.
 * @param stageId The ID of the stage.
 * @param missionId The ID of the mission that this stage belongs to.
 * @param status The status of the stage.
 */
function insertPlayerActiveMissionStageSync(playerId, stageId, missionId, status) {
    (0, db_1.getDb)().prepare(`
    INSERT INTO players_active_missions_stages (id, status, player_id, mission_id)
    VALUES (?, ?, ?, ?)   
    `).run(Number(stageId), (0, utils_1.serializeBoolean)(status), playerId, Number(missionId));
}
/**
 * Inserts a singular active mission into the database.
 *
 * @param playerId The player's iD>
 * @param missionId The ID of the mission to insert.
 * @param mission The mission's data.
 */
function insertPlayerActiveMissionSync(playerId, missionId, mission) {
    (0, db_1.getDb)().prepare(`
    INSERT INTO players_active_missions (id, progress, player_id)
    VALUES (?, ?, ?)
    `).run(Number(missionId), mission.progress, playerId);
    const stages = mission.stages;
    if (stages) {
        for (const [stageId, stage] of Object.entries(stages)) {
            insertPlayerActiveMissionStageSync(playerId, stageId, missionId, stage);
        }
    }
}
/**
 * Batch inserts a record of active missions into the database.
 *
 * @param playerId The player's ID.
 * @param missions The record of active missions to insert.
 */
function insertPlayerActiveMissionsSync(playerId, missions) {
    (0, db_1.getDb)().transaction(() => {
        for (const [missionId, mission] of Object.entries(missions)) {
            insertPlayerActiveMissionSync(playerId, missionId, mission);
        }
    })();
}
exports.insertPlayerActiveMissionsSync = insertPlayerActiveMissionsSync;
